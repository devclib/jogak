/**
 * 알파.9: 모든 빌더 어댑터가 공통으로 사용하는 preview entry source.
 *
 * 빌더에 무관하게 다음 책임:
 * 1. `defaultRegistry.requestEntry(entryId)`로 사용자 컴포넌트 dynamic import
 * 2. `reactAdapter.render`로 mount
 * 3. postMessage 프로토콜 (`@jogak/core/preview-entry/protocol`)로 부모와 통신
 *
 * 어댑터별 차이는 `extraImports` 배열뿐:
 * - vite-adapter: `['virtual:jogak/preview-global-css']`
 * - next-adapter: 사용자 globalCss 절대 경로 직접 inject
 * - webpack-adapter: 사용자 globalCss 절대 경로
 * - standalone-adapter: 사용자 사전 빌드 css 절대 경로
 */

const TEMPLATE = `
import { reactAdapter } from '@jogak/core/renderers/react'
import { defaultRegistry } from '@jogak/core'
__EXTRA_IMPORTS__

const rootEl = document.getElementById('jogak-preview-root')
if (rootEl === null) throw new Error('[jogak] #jogak-preview-root not found')

let currentContainer = null

async function renderEntry(entryId, args) {
  const entry = await defaultRegistry.requestEntry(entryId)
  if (currentContainer === null) {
    currentContainer = document.createElement('div')
    rootEl.replaceChildren(currentContainer)
  }
  reactAdapter.render(entry, args, currentContainer)
}

function unmount() {
  if (currentContainer !== null) {
    reactAdapter.unmount(currentContainer)
    currentContainer = null
  }
}

window.addEventListener('message', (event) => {
  const data = event.data
  if (data == null || typeof data !== 'object') return
  if (data.type === 'jogak:setProps') {
    void renderEntry(data.entryId, data.args ?? {}).then(() => {
      window.parent.postMessage({ type: 'jogak:rendered', entryId: data.entryId }, '*')
    }).catch((err) => {
      window.parent.postMessage({ type: 'jogak:error', message: String(err?.message ?? err) }, '*')
    })
  } else if (data.type === 'jogak:unmount') {
    unmount()
  }
})

window.parent.postMessage({ type: 'jogak:ready' }, '*')
`

export interface RenderPreviewEntryOptions {
  /**
   * 어댑터별 추가 import 라인. 라인 순서대로 emit되어 cascade order 결정.
   *
   * @example vite-adapter
   * ['virtual:jogak/preview-global-css']
   *
   * @example next-adapter
   * ['/abs/path/src/index.css']
   */
  readonly extraImports?: readonly string[]
}

/**
 * 어댑터가 호출 — 자기 scope에 맞는 추가 import 라인 주입.
 */
export function renderPreviewEntrySource(
  opts: RenderPreviewEntryOptions = {},
): string {
  const imports = opts.extraImports ?? []
  const importLines = imports
    .map((p) => `import ${JSON.stringify(p)}`)
    .join('\n')
  return TEMPLATE.replace('__EXTRA_IMPORTS__', importLines)
}
