import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'virtual:jogak'
import { _jogakCodeTheme } from 'virtual:jogak'
import '../styles/jogak.css'
// 알파.6: 사용자 globalCss opt-in.
// JogakPluginOptions.globalCss=false (default) → 빈 모듈 (no-op, SPA 번들 영향 zero).
// true / string / string[] → plugin이 사용자 css를 import한다.
// jogak.css 뒤에 둬서 사용자가 jogak chrome 기본값을 명시적으로 override 가능 —
// 단, jogak utility는 prefix=jogak로 격리되어 사용자 utility와 충돌하지 않는다.
import 'virtual:jogak/global-css'
import { JogakApp } from './App.js'

const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('#root element not found')

createRoot(rootEl).render(
  <StrictMode>
    <JogakApp codeTheme={_jogakCodeTheme} />
  </StrictMode>,
)
