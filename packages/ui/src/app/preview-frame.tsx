/**
 * 알파.7: previewIsolation='iframe' 모드 — iframe document entry.
 *
 * - 부모 Preview 컴포넌트의 `<IframeMount>`가 `iframe.contentWindow.__jogak_setProps__`
 *   를 호출해 entry/args를 주입한다.
 * - iframe과 부모는 동일 origin (Vite dev server) → contentWindow 직접 접근 가능.
 *   postMessage는 cross-origin/iframe sandbox 시나리오에서만 필요.
 * - 사용자 globalCss(`virtual:jogak/global-css`)만 import — jogak.css는 chrome 전용
 *   이라 iframe에서는 미필요. 사용자 reset이 iframe document에 free하게 적용됨.
 */
import { reactAdapter } from '@jogak/react'
import type { RegistryEntry } from '@jogak/core'
import 'virtual:jogak'
import 'virtual:jogak/global-css'

interface SetPropsArgs {
  readonly entry: RegistryEntry
  readonly args: Readonly<Record<string, unknown>>
}

declare global {
  interface Window {
    __jogak_setProps__?: (args: SetPropsArgs) => void
    __jogak_unmount__?: () => void
  }
}

const rootEl = document.getElementById('jogak-preview-root')
if (rootEl === null) throw new Error('#jogak-preview-root not found')

let currentEl: HTMLDivElement | null = null

window.__jogak_setProps__ = ({ entry, args }) => {
  if (currentEl === null) {
    currentEl = document.createElement('div')
    rootEl.replaceChildren(currentEl)
  }
  reactAdapter.render(entry, args, currentEl)
}

window.__jogak_unmount__ = () => {
  if (currentEl !== null) {
    reactAdapter.unmount(currentEl)
    currentEl = null
  }
}
