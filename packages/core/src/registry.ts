import type {
  CategoryTree,
  CategoryMetaTree,
  Jogak,
  JogakMeta,
  RegistryEntry,
  RegistryEntryMeta,
} from './types.js'

/**
 * registry 내부 상태 머신.
 *
 *   unknown ── registerMeta ──► meta ── requestEntry ──► pending ── hydrateEntry ──► hydrated
 *      │                          │                                                       ▲
 *      └─────── register ─────────┴──────────── hydrateEntry (defensive) ─────────────────┘
 *
 * 외부에는 노출하지 않는다 (테스트는 `getEntryState`를 통해 'unknown' | 'meta' | 'pending' | 'hydrated' 만 본다).
 */
type EntryState =
  | { readonly kind: 'meta'; readonly meta: RegistryEntryMeta }
  | {
      readonly kind: 'pending'
      readonly meta: RegistryEntryMeta
      readonly promise: Promise<RegistryEntry>
      readonly resolve: (entry: RegistryEntry) => void
      readonly reject: (error: Error) => void
    }
  | {
      readonly kind: 'hydrated'
      readonly meta: RegistryEntryMeta
      readonly entry: RegistryEntry
    }

/** 미등록 entry 요청 시 throw. */
export class UnknownEntryError extends Error {
  readonly id: string
  constructor(id: string) {
    super(`[jogak] Unknown entry id: ${id}`)
    this.name = 'UnknownEntryError'
    this.id = id
  }
}

type CategoryNode = RegistryEntry | CategoryTree
type CategoryMetaNode = RegistryEntryMeta | CategoryMetaTree

export class ComponentRegistry {
  readonly #states = new Map<string, EntryState>()
  #loader?: (id: string) => Promise<unknown>

  // ── F2: subscribe + 내부 캐시 ────────────────────────────────────────
  readonly #listeners = new Set<() => void>()
  #cachedMetas: readonly RegistryEntryMeta[] | undefined = undefined
  #cachedMetaTree: CategoryMetaTree | undefined = undefined
  /** register()가 registerMeta + hydrateEntry를 합쳐 호출할 때 중간 notify를 억제한다. */
  #batching = false
  /** batch 도중에 mutation이 한 번이라도 일어났는지 — false면 batch 종료 시 notify 안 한다. */
  #batchDirty = false

  // ── 기존 외부 API: 시그니처 변경 없음. 시맨틱은 hydrated만 표면. ───────────

  /**
   * 즉시 hydrated 상태로 entry를 등록한다.
   * 정적 빌드(`generateRegistryFile` 결과) / 테스트 / 기존 호출자 호환 경로.
   *
   * 내부 구현은 `registerMeta` + `hydrateEntry`의 compatibility shim.
   * 두 mutation은 batch로 묶여 단일 notify만 발생한다.
   */
  register(entry: RegistryEntry): void {
    const meta = synthMetaFromEntry(entry)
    this.#withBatch(() => {
      this.registerMeta(meta)
      this.hydrateEntry(entry.id, entry.jogaks, entry.meta.component)
    })
  }

  unregister(id: string): void {
    const state = this.#states.get(id)
    if (state === undefined) return
    if (state.kind === 'pending') {
      // pending Promise를 leak시키지 않기 위해 reject.
      state.reject(new UnknownEntryError(id))
    }
    this.#states.delete(id)
    this.#invalidateAndNotify()
  }

  /** hydrated일 때만 RegistryEntry를 반환한다. meta-only/pending이면 undefined. */
  get(id: string): RegistryEntry | undefined {
    const state = this.#states.get(id)
    return state?.kind === 'hydrated' ? state.entry : undefined
  }

  /** hydrated 항목만 반환. meta-only는 `getAllMeta()` 사용. */
  getAll(): readonly RegistryEntry[] {
    const result: RegistryEntry[] = []
    for (const state of this.#states.values()) {
      if (state.kind === 'hydrated') result.push(state.entry)
    }
    return result
  }

  search(query: string): readonly RegistryEntry[] {
    const q = query.toLowerCase()
    return this.getAll().filter((e) => e.title.toLowerCase().includes(q))
  }

  /**
   * title의 '/' 구분자로 hydrated entry만의 계층 트리를 구성한다.
   */
  getTree(): CategoryTree {
    const tree: CategoryTree = {}
    for (const entry of this.getAll()) {
      const parts = entry.title.split('/')
      let node: CategoryTree = tree
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (part === undefined) continue
        const existing: CategoryNode | undefined = node[part]
        if (existing === undefined || 'id' in existing) {
          node[part] = {}
        }
        node = node[part] as CategoryTree
      }
      const leaf = parts[parts.length - 1]
      if (leaf !== undefined) {
        node[leaf] = entry
      }
    }
    return tree
  }

  clear(): void {
    if (this.#states.size === 0) return
    // pending Promise는 reject 후 정리.
    for (const state of this.#states.values()) {
      if (state.kind === 'pending') {
        state.reject(new Error('[jogak] registry cleared'))
      }
    }
    this.#states.clear()
    this.#invalidateAndNotify()
  }

  /** hydrated 개수. */
  get size(): number {
    let count = 0
    for (const state of this.#states.values()) {
      if (state.kind === 'hydrated') count++
    }
    return count
  }

  // ── NEW: 메타 / lazy API ─────────────────────────────────────────────

  /**
   * 인덱스 가상모듈이 호출. 기존 hydrated 항목이 있으면 meta만 갱신(HMR) — entry는 보존.
   * meta 등록만으로는 `getAll()` 결과에 안 들어간다.
   */
  registerMeta(meta: RegistryEntryMeta): void {
    const existing = this.#states.get(meta.id)
    if (existing === undefined) {
      this.#states.set(meta.id, { kind: 'meta', meta })
      this.#invalidateAndNotify()
      return
    }
    if (existing.kind === 'meta') {
      this.#states.set(meta.id, { kind: 'meta', meta })
      this.#invalidateAndNotify()
      return
    }
    if (existing.kind === 'pending') {
      this.#states.set(meta.id, {
        kind: 'pending',
        meta,
        promise: existing.promise,
        resolve: existing.resolve,
        reject: existing.reject,
      })
      this.#invalidateAndNotify()
      return
    }
    // hydrated → meta만 갱신, entry/jogaks/component는 보존.
    const merged: RegistryEntry = {
      ...existing.entry,
      title: meta.title,
      filePath: meta.filePath,
      source: meta.source,
      meta: synthJogakMeta(meta, existing.entry.meta.component),
    }
    this.#states.set(meta.id, { kind: 'hydrated', meta, entry: merged })
    this.#invalidateAndNotify()
  }

  /**
   * entry 가상모듈이 호출. pending Promise들을 resolve.
   * meta가 없는 상태에서 호출되면(=직접 import) 임시 meta를 합성한다 (defensive).
   */
  hydrateEntry(id: string, jogaks: readonly Jogak[], component: unknown): void {
    const existing = this.#states.get(id)
    let meta: RegistryEntryMeta
    if (existing === undefined) {
      // defensive: 인덱스가 평가 전에 entry 모듈만 import된 케이스.
      // eslint-disable-next-line no-console
      console.warn(
        `[jogak] hydrateEntry called for unknown id "${id}" — synthesizing minimal meta`,
      )
      meta = {
        id,
        title: id,
        jogakNames: jogaks.map((j) => j.name),
        autoArgTypes: {},
        userArgTypes: {},
        source: '',
        filePath: '',
        metaExtras: {},
      }
    } else {
      meta = existing.meta
    }

    const entry: RegistryEntry = {
      id: meta.id,
      title: meta.title,
      jogaks,
      meta: synthJogakMeta(meta, component),
      ...(meta.filePath ? { filePath: meta.filePath } : {}),
      ...(meta.source ? { source: meta.source } : {}),
    }

    if (existing?.kind === 'pending') {
      // 먼저 상태를 hydrated로 옮긴 뒤 resolve — resolve 안에서 다시 requestEntry가 호출돼도 즉시 hydrated를 본다.
      this.#states.set(id, { kind: 'hydrated', meta, entry })
      this.#invalidateAndNotify()
      existing.resolve(entry)
      return
    }
    this.#states.set(id, { kind: 'hydrated', meta, entry })
    this.#invalidateAndNotify()
  }

  /**
   * 어댑터가 호출. hydrated였던 entry를 meta 상태로 되돌린다.
   * HMR meta-update 이벤트에서 args/component 변경을 강제 re-hydrate 시키기 위함.
   * unknown / meta / pending 상태에는 영향 없음.
   */
  invalidateEntry(id: string): void {
    const state = this.#states.get(id)
    if (state === undefined || state.kind !== 'hydrated') return
    this.#states.set(id, { kind: 'meta', meta: state.meta })
    this.#invalidateAndNotify()
  }

  /**
   * UI/어댑터가 호출. entry id로 완전한 RegistryEntry를 비동기 획득.
   *
   *  - hydrated → 즉시 resolve된 Promise
   *  - pending  → 기존 Promise 반환 (멱등)
   *  - meta     → loader 트리거 후 새 Promise 반환, 상태를 pending으로
   *  - unknown  → 즉시 reject (UnknownEntryError)
   */
  requestEntry(id: string): Promise<RegistryEntry> {
    const state = this.#states.get(id)
    if (state === undefined) {
      return Promise.reject(new UnknownEntryError(id))
    }
    if (state.kind === 'hydrated') {
      return Promise.resolve(state.entry)
    }
    if (state.kind === 'pending') {
      return state.promise
    }

    const loader = this.#loader
    if (loader === undefined) {
      return Promise.reject(
        new Error(
          '[jogak] entry loader not set — virtual:jogak index module did not load',
        ),
      )
    }

    let resolveFn!: (entry: RegistryEntry) => void
    let rejectFn!: (error: Error) => void
    const promise = new Promise<RegistryEntry>((resolve, reject) => {
      resolveFn = resolve
      rejectFn = reject
    })

    this.#states.set(id, {
      kind: 'pending',
      meta: state.meta,
      promise,
      resolve: resolveFn,
      reject: rejectFn,
    })

    loader(id).then(
      () => {
        // entry 모듈이 평가됐으면 hydrateEntry가 이미 호출됐어야 한다.
        const after = this.#states.get(id)
        if (after?.kind !== 'hydrated') {
          rejectFn(
            new Error(`[jogak] entry module loaded but did not hydrate: ${id}`),
          )
        }
      },
      (error: unknown) => {
        const reason = error instanceof Error ? error : new Error(String(error))
        // pending이 아닌 상태로 갔다면 이미 처리된 것 — 그래도 안전하게 reject.
        const cur = this.#states.get(id)
        if (cur?.kind === 'pending' && cur.promise === promise) {
          // pending 유지 — 같은 promise를 재사용하지 않도록 meta로 되돌린다.
          this.#states.set(id, { kind: 'meta', meta: state.meta })
        }
        rejectFn(reason)
      },
    )

    return promise
  }

  /**
   * 사이드바 메타 전용 — meta-only / pending / hydrated 모두 포함.
   *
   * F2: 내부 캐시. mutation 시점에 invalidate되며 재계산 전까지 동일 reference를 반환한다.
   * useSyncExternalStore의 referential identity 요구를 만족시키기 위함.
   */
  getAllMeta(): readonly RegistryEntryMeta[] {
    if (this.#cachedMetas !== undefined) return this.#cachedMetas
    const result: RegistryEntryMeta[] = []
    for (const state of this.#states.values()) {
      result.push(state.meta)
    }
    const frozen = result as readonly RegistryEntryMeta[]
    this.#cachedMetas = frozen
    return frozen
  }

  /**
   * 사이드바 트리 전용 — 모든 상태의 meta를 트리화.
   * F2: getAllMeta와 동일한 캐시 정책.
   */
  getMetaTree(): CategoryMetaTree {
    if (this.#cachedMetaTree !== undefined) return this.#cachedMetaTree
    const tree: CategoryMetaTree = {}
    for (const state of this.#states.values()) {
      const meta = state.meta
      const parts = meta.title.split('/')
      let node: CategoryMetaTree = tree
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (part === undefined) continue
        const existing: CategoryMetaNode | undefined = node[part]
        if (existing === undefined || 'id' in existing) {
          node[part] = {}
        }
        node = node[part] as CategoryMetaTree
      }
      const leaf = parts[parts.length - 1]
      if (leaf !== undefined) {
        node[leaf] = meta
      }
    }
    this.#cachedMetaTree = tree
    return tree
  }

  /** 진단 — 상태 머신 노출. */
  getEntryState(id: string): 'unknown' | 'meta' | 'pending' | 'hydrated' {
    const state = this.#states.get(id)
    if (state === undefined) return 'unknown'
    return state.kind
  }

  /**
   * dynamic import 함수를 외부에서 주입. plugin이 인덱스 모듈에서 호출한다.
   * 빌드/SSR에서 정적 import 매핑으로 교체할 때도 사용.
   */
  setEntryLoader(loader: (id: string) => Promise<unknown>): void {
    this.#loader = loader
  }

  // ── F2: subscribe API ────────────────────────────────────────────────

  /**
   * 등록/해제/메타 갱신/hydrate/clear 시 호출되는 listener를 등록한다.
   *
   * - listener는 무인자, 동기 호출. 어떤 변화가 있었는지는 listener가
   *   `getAllMeta()`/`getMetaTree()`로 직접 확인.
   * - mutation 도중 listener에서 `subscribe`/`unsubscribe`를 호출하는 재진입은
   *   안전 (내부적으로 listener Set을 한 번 복사한 뒤 순회).
   * - listener 예외는 catch + console.error 후 계속 (다른 listener 보장).
   * - 반환값은 unsubscribe 함수 (멱등 — 두 번 호출해도 안전).
   */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    let active = true
    return () => {
      if (!active) return
      active = false
      this.#listeners.delete(listener)
    }
  }

  // ── 내부 헬퍼 ─────────────────────────────────────────────────────────

  /**
   * 캐시 invalidate + listener 통지를 단일 헬퍼로.
   * batch 모드에서는 dirty 플래그만 켜고 실제 통지는 batch 종료 시점에 한다.
   */
  #invalidateAndNotify(): void {
    this.#cachedMetas = undefined
    this.#cachedMetaTree = undefined
    if (this.#batching) {
      this.#batchDirty = true
      return
    }
    // 재진입 안전: snapshot 후 호출.
    const snapshot = Array.from(this.#listeners)
    for (const l of snapshot) {
      try {
        l()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[jogak] subscribe listener threw:', e)
      }
    }
  }

  /**
   * register() 처럼 여러 mutation을 묶어 단일 notify로 처리.
   * 내부 전용 — public API 아님.
   */
  #withBatch(fn: () => void): void {
    if (this.#batching) {
      fn()
      return
    }
    this.#batching = true
    this.#batchDirty = false
    try {
      fn()
    } finally {
      this.#batching = false
      if (this.#batchDirty) {
        this.#batchDirty = false
        this.#invalidateAndNotify()
      }
    }
  }
}

function synthMetaFromEntry(entry: RegistryEntry): RegistryEntryMeta {
  const userArgTypes = (entry.meta.argTypes ?? {}) as Readonly<
    Record<string, RegistryEntryMeta['userArgTypes'][string]>
  >
  return {
    id: entry.id,
    title: entry.title,
    jogakNames: entry.jogaks.map((j) => j.name),
    autoArgTypes: {},
    userArgTypes,
    source: entry.source ?? '',
    filePath: entry.filePath ?? '',
    metaExtras: {
      ...(entry.meta.tags !== undefined ? { tags: entry.meta.tags } : {}),
      ...(entry.meta.parameters !== undefined
        ? { parameters: entry.meta.parameters }
        : {}),
    },
  }
}

/**
 * RegistryEntryMeta + component → RegistryEntry.meta(JogakMeta).
 * autoArgTypes ∪ userArgTypes (user 우선) 머지 — plugin emit 코드와 동일한 규칙.
 */
function synthJogakMeta(meta: RegistryEntryMeta, component: unknown): JogakMeta {
  const merged: Record<string, RegistryEntryMeta['autoArgTypes'][string]> = {
    ...meta.autoArgTypes,
  }
  for (const key of Object.keys(meta.userArgTypes)) {
    const userValue = meta.userArgTypes[key]
    if (userValue === undefined) continue
    merged[key] = { ...merged[key], ...userValue }
  }
  return {
    title: meta.title,
    component,
    argTypes: merged,
    ...(meta.metaExtras.tags !== undefined ? { tags: meta.metaExtras.tags } : {}),
    ...(meta.metaExtras.parameters !== undefined
      ? { parameters: meta.metaExtras.parameters }
      : {}),
  }
}

export const defaultRegistry = new ComponentRegistry()
