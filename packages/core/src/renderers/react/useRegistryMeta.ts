import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type {
  CategoryMetaTree,
  ComponentRegistry,
  RegistryEntryMeta,
} from '../../index.js'
import { useRegistry } from './JogakProvider.js'

/**
 * `useRegistryMeta` 반환 타입.
 * `useRegistry`가 hydrated entry만 반영하는 것과 달리, 본 훅은 meta-only / pending 항목까지 포함.
 *
 *  - `metas`     : `registry.getAllMeta()` 결과 — registry 내부 캐시로 referential identity 보장
 *  - `metaTree`  : `registry.getMetaTree()` 결과 — 사이드바 트리 구성용
 *  - `searchMeta`: title 부분 일치(대소문자 무시) — Phase 1은 단순 string 매칭
 */
export interface UseRegistryMetaReturn {
  readonly metas: readonly RegistryEntryMeta[]
  readonly metaTree: CategoryMetaTree
  readonly searchMeta: (query: string) => readonly RegistryEntryMeta[]
}

interface Snapshot {
  readonly metas: readonly RegistryEntryMeta[]
  readonly metaTree: CategoryMetaTree
}

/**
 * registry → subscribe 어댑터.
 * `useSyncExternalStore`의 subscribe 계약: listener를 등록하고 unsubscribe 함수 반환.
 * registry.subscribe는 멱등 unsubscribe를 보장한다.
 */
function makeSubscribe(registry: ComponentRegistry) {
  return (onChange: () => void): (() => void) => registry.subscribe(onChange)
}

/**
 * registry → getSnapshot 어댑터.
 *
 * `useSyncExternalStore`는 `getSnapshot`이 동일 입력에 동일 reference를 반환할 것을 요구한다.
 * registry는 `getAllMeta()`/`getMetaTree()` 결과를 내부 캐시하므로(F2),
 * mutation 사이에는 같은 reference가 돌아온다.
 *
 * 두 결과를 묶은 Snapshot 객체도 같은 reference여야 하므로 마지막 (metas, metaTree) 쌍을
 * closure에 캐시하고, 둘 다 동일 reference면 이전 Snapshot을 그대로 반환한다.
 *
 * 본 클로저는 hook 인스턴스/registry 조합당 1회 생성된다 → useMemo로 안정화.
 */
function makeGetSnapshot(registry: ComponentRegistry): () => Snapshot {
  let lastMetas: readonly RegistryEntryMeta[] | null = null
  let lastTree: CategoryMetaTree | null = null
  let lastSnapshot: Snapshot | null = null
  return () => {
    const metas = registry.getAllMeta()
    const tree = registry.getMetaTree()
    if (lastSnapshot !== null && metas === lastMetas && tree === lastTree) {
      return lastSnapshot
    }
    lastMetas = metas
    lastTree = tree
    lastSnapshot = { metas, metaTree: tree }
    return lastSnapshot
  }
}

/**
 * 사이드바/검색용 메타 훅.
 *
 * `useSyncExternalStore` 기반으로 registry 변경(`register`/`unregister`/`registerMeta`/
 * `hydrateEntry`/`clear`)에 자동 반응한다. registry 내부 snapshot 캐시(F2)와
 * 외부 closure cache(makeGetSnapshot)의 이중 안전망으로 referential identity를 보장하여
 * 무한 re-render를 방지한다.
 *
 * SSR: `getServerSnapshot`은 `getSnapshot`과 동일 함수. `defaultRegistry`는 module singleton이라
 * 서버/클라이언트 동일 객체를 반환하며, registry가 비어있다면 빈 배열을 반환 후 클라이언트에서
 * subscribe 통지로 자연 보정된다(`useSyncExternalStore`가 hydration 직후 client snapshot으로 전환).
 */
export function useRegistryMeta(): UseRegistryMetaReturn {
  const registry = useRegistry()

  // registry 인스턴스가 바뀌면 새 subscribe/getSnapshot 클로저가 필요.
  // useMemo로 안정화 — 동일 registry에서는 같은 함수 reference 유지 → useSyncExternalStore가 재구독하지 않음.
  const subscribe = useMemo(() => makeSubscribe(registry), [registry])
  const getSnapshot = useMemo(() => makeGetSnapshot(registry), [registry])

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const searchMeta = useCallback(
    (query: string): readonly RegistryEntryMeta[] => {
      const q = query.trim().toLowerCase()
      if (q.length === 0) return snapshot.metas
      return snapshot.metas.filter((m) => m.title.toLowerCase().includes(q))
    },
    [snapshot.metas],
  )

  return {
    metas: snapshot.metas,
    metaTree: snapshot.metaTree,
    searchMeta,
  }
}
