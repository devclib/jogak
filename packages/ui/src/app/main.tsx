import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'virtual:jogak'
import {
  _jogakCodeTheme,
  _jogakPreviewIsolation,
  _jogakUserPreviewUrl,
  _jogakPreviewEntryPath,
  _jogakThemes,
} from 'virtual:jogak'
import '../styles/jogak.css'
import { JogakApp } from './App.js'

// 알파.9: 사용자 globalCss는 어댑터 scope(iframe entry)에서 처리되므로 jogak SPA outer
// document에는 import하지 않는다. 'none' 모드(deprecated)에서만 outer inject.
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
      userPreviewUrl={_jogakUserPreviewUrl}
      previewEntryPath={_jogakPreviewEntryPath}
      themes={_jogakThemes ?? undefined}
    />
  </StrictMode>,
)
