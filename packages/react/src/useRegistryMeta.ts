import { useCallback, useEffect, useState } from 'react'
import type {
  CategoryMetaTree,
  ComponentRegistry,
  RegistryEntryMeta,
} from '@jogak/core'
import { useRegistry } from './JogakProvider.js'

/**
 * `useRegistryMeta` 반환 타입.
 * `useRegistry`가 hydrated entry만 반영하는 것과 달리, 본 훅은 meta-only / pending 항목까지 포함.
 *
 *  - `metas`     : `registry.getAllMeta()` 결과를 캐시한 readonly 배열
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

function takeSnapshot(registry: ComponentRegistry): Snapshot {
  return {
    metas: registry.getAllMeta(),
    metaTree: registry.getMetaTree(),
  }
}

/**
 * 사이드바/검색용 메타 훅 (Phase 1).
 *
 * 현재 `ComponentRegistry`는 명시적인 subscribe API를 노출하지 않으므로:
 *  - mount 시점 + registry 인스턴스 변경 시 snapshot 을 한 번 캡처한다.
 *  - lazy hydration 으로 meta 가 추가/갱신되는 경로(`registerMeta`)는 인덱스 가상모듈 평가 시
 *    어댑터 mount 보다 먼저 끝나는 시나리오를 가정한다 — index 모듈을 entry point에서 side-effect로
 *    import 한 뒤 root 가 mount 되는 표준 패턴.
 *  - HMR 등으로 metas 가 사후 변경되는 경우는 ui 측에서 full-reload 정책으로 흡수 (계약 §6).
 *
 * registry 가 향후 `subscribe(listener)` 를 추가하면 본 훅을 `useSyncExternalStore` 로 마이그레이션
 * (외부 시그니처 동일, 내부 갱신 정밀도 향상). 그 때까지 useState + useEffect 로 일관성 유지.
 */
export function useRegistryMeta(): UseRegistryMetaReturn {
  const registry = useRegistry()
  const [snapshot, setSnapshot] = useState<Snapshot>(() => takeSnapshot(registry))

  useEffect(() => {
    setSnapshot(takeSnapshot(registry))
  }, [registry])

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
