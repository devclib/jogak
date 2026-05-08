import type { Plugin } from 'vite'
import { resolveGlobalCssPaths } from './detect-global-css.js'
import {
  RESOLVED_VIRTUAL_PREVIEW_ENTRY_ID,
  RESOLVED_VIRTUAL_PREVIEW_GLOBAL_CSS_ID,
  VIRTUAL_PREVIEW_ENTRY_ID,
  VIRTUAL_PREVIEW_GLOBAL_CSS_ID,
} from './virtual-ids.js'
import type { JogakPluginOptions } from '../types.js'

/**
 * 알파.8: 사용자 vite scope에서 preview-frame iframe entry를 emit하는 plugin.
 *
 * jogak CLI의 `spawnUserVite`가 사용자 vite.config.ts에 `mergeConfig`로 자동 inject
 * — 사용자가 직접 등록할 필요 없음.
 *
 * 책임:
 * 1. `/__jogak_preview__/index.html` middleware: jogak preview-entry를 로드하는 HTML 응답
 * 2. `virtual:jogak/preview-entry` 가상 모듈: postMessage 리스너 + reactAdapter.render
 * 3. `virtual:jogak/preview-global-css` 가상 모듈: 사용자 globalCss를 사용자 vite의
 *    `@tailwindcss/vite` 등 정상 css 파이프라인을 통해 컴파일
 */
export interface JogakPreviewFramePluginOptions {
  /** 사용자 프로젝트 root (cwd). globalCss 자동 탐지 base. */
  readonly userRoot: string
  /** 사용자 globalCss (jogak.config.ts의 globalCss와 동일 의미). */
  readonly globalCss?: JogakPluginOptions['globalCss']
}

const PREVIEW_HTML_ROUTE = '/__jogak_preview__/index.html'

export function jogakPreviewFramePlugin(
  options: JogakPreviewFramePluginOptions,
): Plugin {
  return {
    name: 'vite-plugin-jogak-preview-frame',
    enforce: 'pre',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === undefined) return next()
        const url = req.url.split('?')[0]
        if (url !== PREVIEW_HTML_ROUTE) return next()
        if (req.method !== 'GET') return next()

        const html = renderPreviewFrameHtml()
        server
          .transformIndexHtml(req.url, html)
          .then((transformed) => {
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(transformed)
          })
          .catch(next)
      })
    },

    resolveId(id) {
      if (id === VIRTUAL_PREVIEW_ENTRY_ID) return RESOLVED_VIRTUAL_PREVIEW_ENTRY_ID
      if (id === VIRTUAL_PREVIEW_GLOBAL_CSS_ID) return RESOLVED_VIRTUAL_PREVIEW_GLOBAL_CSS_ID
      return undefined
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_PREVIEW_GLOBAL_CSS_ID) {
        const paths = resolveGlobalCssPaths(options.globalCss, options.userRoot)
        if (paths.length === 0) {
          return `// [jogak] preview-global-css: no candidates\nexport {}\n`
        }
        return paths.map((p) => `import ${JSON.stringify(p)}`).join('\n') + '\nexport {}\n'
      }
      if (id === RESOLVED_VIRTUAL_PREVIEW_ENTRY_ID) {
        return PREVIEW_ENTRY_SOURCE
      }
      return undefined
    },
  }
}

function renderPreviewFrameHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>jogak preview</title>
    <style>
      html, body { margin: 0; padding: 0; }
      #jogak-preview-root { display: block; }
    </style>
  </head>
  <body>
    <div id="jogak-preview-root"></div>
    <script type="module" src="/@id/${VIRTUAL_PREVIEW_ENTRY_ID}"></script>
  </body>
</html>
`
}

/**
 * preview-entry 가상 모듈 소스. 사용자 vite scope에서 평가되므로:
 * - `import 'virtual:jogak'`이 사용자 vite scope의 jogak() plugin (previewFrame=true)에서
 *   entry 가상 모듈만 emit함 (chrome 모듈 없음)
 * - `import 'virtual:jogak/preview-global-css'`가 사용자 globalCss를 사용자 vite의
 *   @tailwindcss/vite 파이프라인을 통해 컴파일된 css로 inject
 * - `defaultRegistry.requestEntry(id)`로 사용자 컴포넌트를 dynamic import
 */
const PREVIEW_ENTRY_SOURCE = `
import { reactAdapter } from '@jogak/react'
import { defaultRegistry } from '@jogak/core'
import 'virtual:jogak'
import 'virtual:jogak/preview-global-css'

const rootEl = document.getElementById('jogak-preview-root')
if (rootEl === null) throw new Error('[jogak] #jogak-preview-root not found')

let currentContainer = null
let currentArgs = {}
let currentEntryId = null

async function renderEntry(entryId, args) {
  currentEntryId = entryId
  currentArgs = args
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
    currentEntryId = null
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
