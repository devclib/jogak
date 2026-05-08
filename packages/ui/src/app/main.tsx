import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'virtual:jogak'
import {
  _jogakCodeTheme,
  _jogakPreviewIsolation,
  _jogakUserViteUrl,
} from 'virtual:jogak'
import '../styles/jogak.css'
import { JogakApp } from './App.js'

// 알파.8: 사용자 globalCss는 사용자 vite scope(iframe entry)에서 처리되므로
// jogak SPA outer document에는 import하지 않는다 — chrome 격리 보존.
//
// 'none' 모드(deprecated): 알파.7.1 동작 유지가 필요한 사용자만 명시 사용.
// 이 경우만 outer document에 사용자 globalCss inject.
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
      userViteUrl={_jogakUserViteUrl}
    />
  </StrictMode>,
)
