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

  // ── 기존 외부 API: 시그니처 변경 없음. 시맨틱은 hydrated만 표면. ───────────

  /**
   * 즉시 hydrated 상태로 entry를 등록한다.
   * 정적 빌드(`generateRegistryFile` 결과) / 테스트 / 기존 호출자 호환 경로.
   *
   * 내부 구현은 `registerMeta` + `hydrateEntry`의 compatibility shim.
   */
  register(entry: RegistryEntry): void {
    const meta = synthMetaFromEntry(entry)
    this.registerMeta(meta)
    this.hydrateEntry(entry.id, entry.jogaks, entry.meta.component)
  }

  unregister(id: string): void {
    const state = this.#states.get(id)
    if (state?.kind === 'pending') {
      // pending Promise를 leak시키지 않기 위해 reject.
      state.reject(new UnknownEntryError(id))
    }
    this.#states.delete(id)
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
    // pending Promise는 reject 후 정리.
    for (const state of this.#states.values()) {
      if (state.kind === 'pending') {
        state.reject(new Error('[jogak] registry cleared'))
      }
    }
    this.#states.clear()
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
      return
    }
    if (existing.kind === 'meta') {
      this.#states.set(meta.id, { kind: 'meta', meta })
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
      existing.resolve(entry)
      return
    }
    this.#states.set(id, { kind: 'hydrated', meta, entry })
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

  /** 사이드바 메타 전용 — meta-only / pending / hydrated 모두 포함. */
  getAllMeta(): readonly RegistryEntryMeta[] {
    const result: RegistryEntryMeta[] = []
    for (const state of this.#states.values()) {
      result.push(state.meta)
    }
    return result
  }

  /** 사이드바 트리 전용 — 모든 상태의 meta를 트리화. */
  getMetaTree(): CategoryMetaTree {
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
