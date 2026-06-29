import { defineJogakConfig } from '@jogak/core'

// next 16 호환 우회:
// 1. globalCss 옵션 제거 — scaffold가 emit하는 import 경로는 본 sed-PR로 상대화됐지만,
//    test-case는 jogak-preview/layout.tsx에서 globals.css 직접 import한 형태를 유지.
// 2. previewIsolation: 'none' — jogak chrome scope에서 component=null stub 회피.
//    React shop이 Vite 사용자 vite scope를 통해 hydrate하던 경로가 Next 환경엔 없음.
export default defineJogakConfig({
  previewIsolation: 'none',
})
