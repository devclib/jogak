import { useEffect, useState } from 'react'
import type {
  ComponentRegistry,
  RegistryEntry,
  RegistryEntryMeta,
} from '@jogak/core'
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
 * 동기적으로 현재 registry 상태에서 초기 state를 산출한다.
 * effect가 첫 commit 이전에도 동일한 결과를 보도록 useState의 lazy initializer로도 사용 가능.
 */
function deriveState(
  registry: ComponentRegistry,
  id: string,
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
 *  1. 마운트 시점에 `getEntryState(id)`로 초기 상태 결정.
 *  2. 상태가 `loading`이면 effect에서 `requestEntry(id)` 호출 — 멱등이므로 이미 pending이면 동일 Promise.
 *  3. resolve → `ready` / reject → `error`.
 *  4. id 변경 시 effect 재실행. cleanup의 `cancelled` 플래그로 stale Promise 무시.
 *  5. registry instance 변경에도 재실행 (테스트에서 custom registry 주입 시).
 *
 * @param id `RegistryEntry.id` (사용자 title 그대로)
 * @returns Suspense 없이 분기 가능한 `UseEntryState` discriminated union
 */
export function useEntry(id: string): UseEntryState {
  const registry = useRegistry()
  const [state, setState] = useState<UseEntryState>(() =>
    deriveState(registry, id),
  )

  useEffect(() => {
    let cancelled = false

    // id/registry가 바뀌었을 수 있으므로 항상 현재 값으로 재산출.
    const initial = deriveState(registry, id)
    setState(initial)

    if (initial.status !== 'loading') {
      // unknown / ready / error 는 추가 액션 불필요.
      return () => {
        cancelled = true
      }
    }

    registry.requestEntry(id).then(
      (entry) => {
        if (cancelled) return
        setState({ status: 'ready', entry })
      },
      (error: unknown) => {
        if (cancelled) return
        const reason = error instanceof Error ? error : new Error(String(error))
        setState({ status: 'error', error: reason })
      },
    )

    return () => {
      cancelled = true
    }
  }, [registry, id])

  return state
}
