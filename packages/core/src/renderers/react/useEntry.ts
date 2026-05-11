import { useEffect, useState } from 'react'
import type {
  ComponentRegistry,
  RegistryEntry,
  RegistryEntryMeta,
} from '../../index.js'
import { useRegistry } from './JogakProvider.js'

/**
 * Lazy entry hydration hook 상태값.
 *
 *  - `loading` : 메타는 있으나 entry 모듈은 아직 hydrate 전. `meta`로 헤더/skeleton 표시 가능.
 *  - `ready`   : `requestEntry` 가 resolve 되어 완전한 `RegistryEntry` 가용.
 *  - `error`   : hydration 도중 에러 — `UnknownEntryError` 포함.
 *  - `unknown` : 등록되지 않은 id (`registerMeta` / `register` 둘 다 호출되지 않음).
 *
 * 본 타입은 어댑터 표면에 export 되어 ui 패키지가 `Preview` 분기에 사용한다.
 */
export type UseEntryState =
  | { readonly status: 'loading'; readonly meta: RegistryEntryMeta }
  | { readonly status: 'ready'; readonly entry: RegistryEntry }
  | { readonly status: 'error'; readonly error: Error }
  | { readonly status: 'unknown' }

/**
 * 알파.14.1: useEntry 옵션. iframe isolation 모드에서 chrome 측이 사용자 component
 * 모듈을 chrome vite scope으로 import하지 않도록 hydrate를 건너뛴다.
 *
 * - `skipHydrate: true`: `requestEntry`를 자동 호출하지 않고, 메타가 있으면 synthetic
 *   `RegistryEntry`(component=null)로 `status: 'ready'`를 노출한다. 실제 component
 *   import + 렌더는 iframe scope의 preview-entry가 책임진다.
 *
 *   shadow/none 모드는 chrome 측에서 component 직접 렌더이므로 hydrate 필요 → 기본값
 *   `false` 유지.
 */
export interface UseEntryOptions {
  readonly skipHydrate?: boolean
}

/**
 * 동기적으로 현재 registry 상태에서 초기 state를 산출한다.
 * effect가 첫 commit 이전에도 동일한 결과를 보도록 useState의 lazy initializer로도 사용 가능.
 */
function deriveState(
  registry: ComponentRegistry,
  id: string,
  skipHydrate: boolean,
): UseEntryState {
  const kind = registry.getEntryState(id)
  if (kind === 'unknown') {
    return { status: 'unknown' }
  }
  if (kind === 'hydrated') {
    const entry = registry.get(id)
    // 방어적: getEntryState='hydrated' 인데 get(id)이 undefined면 일관성이 깨진 상황 — error로 표면.
    if (entry === undefined) {
      return {
        status: 'error',
        error: new Error(`[jogak] inconsistent registry state for id "${id}"`),
      }
    }
    return { status: 'ready', entry }
  }
  // 'meta' | 'pending'
  const meta = findMeta(registry, id)
  if (meta === undefined) {
    return {
      status: 'error',
      error: new Error(`[jogak] meta missing for id "${id}"`),
    }
  }
  // 알파.14.1: skipHydrate 모드에서는 component 없이 synthetic entry로 ready 노출.
  // chrome은 메타만 알고 component import + 렌더는 iframe scope에 위임.
  // jogakDefaultArgs는 parser가 정적으로 추출한 jogak variant별 default args —
  // chrome → iframe postMessage에 동봉되어 사용자 컴포넌트에 props로 전달.
  if (skipHydrate) {
    const syntheticEntry: RegistryEntry = {
      id: meta.id,
      title: meta.title,
      jogaks: meta.jogakNames.map((name) => {
        const args = meta.jogakDefaultArgs[name]
        return args !== undefined ? { name, args } : { name }
      }),
      meta: {
        title: meta.title,
        component: null,
        ...(meta.framework !== undefined ? { framework: meta.framework } : {}),
        ...(meta.userArgTypes !== undefined ? { argTypes: meta.userArgTypes } : {}),
        ...(meta.metaExtras ?? {}),
      },
    }
    return { status: 'ready', entry: syntheticEntry }
  }
  return { status: 'loading', meta }
}

function findMeta(
  registry: ComponentRegistry,
  id: string,
): RegistryEntryMeta | undefined {
  // 현재 registry는 id 기반 meta 직접 조회 메서드를 노출하지 않는다.
  // getAllMeta()는 hydrated 항목까지 포함하므로 id 매칭으로 충분.
  for (const m of registry.getAllMeta()) {
    if (m.id === id) return m
  }
  return undefined
}

/**
 * Lazy entry hydration 훅 (Phase 1 — 명시적 status 분기, Suspense 미사용).
 *
 * 동작:
 *  1. 마운트 시점에 `getEntryState(id)`로 초기 상태 결정 (useState lazy init).
 *  2. effect에서 `registry.subscribe`로 mutation을 감시 — registerMeta /
 *     hydrateEntry / invalidateEntry 등 모든 변경에 자동 재산출.
 *  3. recompute 결과가 `loading`이고 직전 상태가 `loading`이 아니었으면
 *     `requestEntry(id)`를 트리거. 결과 entry는 hydrate가 notify를 통해
 *     자동 반영하므로 then 안에서 setState 불필요(에러만 처리).
 *     `skipHydrate: true`면 자동 트리거를 건너뛴다 (chrome scope에서 component 미import).
 *  4. id 변경 시 effect 재실행, cleanup의 `cancelled` 플래그로 stale 차단.
 *
 * F4 통합: HMR 'jogak:meta-update' 이벤트가 invalidateEntry → requestEntry
 * 흐름을 트리거하면 hydrated 상태였던 entry가 새 args/component로 다시
 * hydrate되어 화면에 in-place 반영된다 (full-reload 회피).
 */
export function useEntry(id: string, opts: UseEntryOptions = {}): UseEntryState {
  const registry = useRegistry()
  const skipHydrate = opts.skipHydrate === true
  const [state, setState] = useState<UseEntryState>(() =>
    deriveState(registry, id, skipHydrate),
  )

  useEffect(() => {
    let cancelled = false
    let lastStatus: UseEntryState['status'] | null = null

    const recompute = (): void => {
      if (cancelled) return
      const next = deriveState(registry, id, skipHydrate)
      setState(next)
      if (
        !skipHydrate &&
        next.status === 'loading' &&
        lastStatus !== 'loading'
      ) {
        // requestEntry 호출 전에 lastStatus를 미리 갱신 — requestEntry가 동기적으로
        // pending state로 옮긴 후 notify를 발사할 때 같은 effect의 listener가 다시
        // 호출되어 무한 호출되는 것을 방지(멱등이긴 하지만 명시 가드).
        lastStatus = 'loading'
        registry.requestEntry(id).catch((error: unknown) => {
          if (cancelled) return
          const reason =
            error instanceof Error ? error : new Error(String(error))
          setState({ status: 'error', error: reason })
        })
      } else {
        lastStatus = next.status
      }
    }

    recompute()
    const unsubscribe = registry.subscribe(recompute)

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [registry, id, skipHydrate])

  return state
}
