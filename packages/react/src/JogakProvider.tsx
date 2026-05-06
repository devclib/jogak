import { createContext, useContext, type ReactNode } from 'react'
import type { ComponentRegistry, RegistryEntryMeta } from '@jogak/core'
import { defaultRegistry } from '@jogak/core'

const RegistryContext = createContext<ComponentRegistry>(defaultRegistry)

export interface JogakProviderProps {
  readonly registry?: ComponentRegistry
  readonly children: ReactNode
}

export function JogakProvider({ registry = defaultRegistry, children }: JogakProviderProps): React.ReactElement {
  return (
    <RegistryContext.Provider value={registry}>
      {children}
    </RegistryContext.Provider>
  )
}

export function useRegistry(): ComponentRegistry {
  return useContext(RegistryContext)
}

// ── F4: HMR meta-only 갱신 채널 ────────────────────────────────────────
//
// vite plugin이 jogak 파일의 meta-only 변경을 감지하면 ws custom event로
// 갱신된 RegistryEntryMeta 단일 entry를 push한다(payload: { id, meta }).
// 본 핸들러는 dev에서만 활성화되며, defaultRegistry.registerMeta로 갱신해
// F2의 subscribe → useRegistryMeta → 사이드바 자동 reflow를 트리거한다.
//
// 주의 — 한계:
//   본 핸들러는 `defaultRegistry`만 갱신한다. 사용자가 custom ComponentRegistry를
//   `<JogakProvider registry={custom}>`로 주입한 경우, plugin은 어떤 registry가
//   사용 중인지 알 수 없으므로 custom registry는 갱신되지 않는다(의도된 한계).
//   custom registry는 full-reload로 갱신된다.
//
// production 빌드: `import.meta.hot`은 dev 서버에서만 정의된다. 본 조건은
// vite의 환경 변수 치환을 통해 production 빌드에서 dead-code로 제거된다.
// (sideEffects: false + tree-shake 친화적 dynamic 가드 형태 유지)
// vite의 ImportMeta.hot 타입을 어댑터에서 직접 정의(외부 dependency 회피).
// 필요한 메서드만 좁게 선언 — 본 모듈 내부 전용이며 export 하지 않는다.
interface ViteHotContext {
  on<T = unknown>(event: string, handler: (data: T) => void): void
}

interface MetaUpdatePayload {
  readonly id: string
  readonly meta: RegistryEntryMeta
}

if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { hot?: ViteHotContext }).hot) {
  const hot = (import.meta as ImportMeta & { hot: ViteHotContext }).hot
  hot.on<MetaUpdatePayload>('jogak:meta-update', (data) => {
    defaultRegistry.registerMeta(data.meta)
  })
}
