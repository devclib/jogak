import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'virtual:jogak'
import { _jogakCodeTheme, _jogakPreviewIsolation } from 'virtual:jogak'
import '../styles/jogak.css'
import { JogakApp } from './App.js'

// 알파.7.1: 사용자 globalCss는 isolation === 'none'일 때만 outer document에 inject.
// - 'shadow'/'iframe' 모드에서는 ShadowMount/preview-frame.tsx가 자기 scope에서
//   사용자 css를 자체 import하므로 outer document inject가 불필요하고, 오히려
//   chrome을 침범한다 (알파.7 결함).
// - top-level await로 가드 — Vite는 string literal specifier의 dynamic import를
//   정적 분석하여 별도 chunk + css HMR 표준 경로로 처리한다.
if (_jogakPreviewIsolation === 'none') {
  await import('virtual:jogak/global-css')
}

const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('#root element not found')

createRoot(rootEl).render(
  <StrictMode>
    <JogakApp
      codeTheme={_jogakCodeTheme}
      previewIsolation={_jogakPreviewIsolation}
    />
  </StrictMode>,
)
