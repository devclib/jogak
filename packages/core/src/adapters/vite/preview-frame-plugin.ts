/**
 * 알파.10: `@jogak/core/adapters/vite`의 preview-frame plugin.
 *
 * 사용자 vite scope에서 작동:
 * 1. `/__jogak_preview__/index.html` middleware — preview entry 로드 HTML
 * 2. `virtual:jogak/preview-entry` 가상 모듈 — postMessage 리스너 + reactAdapter
 * 3. `virtual:jogak/preview-global-css` 가상 모듈 — 사용자 globalCss를 사용자 vite의
 *    @tailwindcss/vite 등 css 파이프라인 통과로 emit
 */

import type { Plugin } from 'vite'
import { renderPreviewEntrySource } from '../../index.js'
import { resolveGlobalCssPaths } from '../../server.js'

export interface JogakPreviewFramePluginOptions {
  readonly userRoot: string
  readonly globalCss?: boolean | string | readonly string[]
}

const VIRTUAL_PREVIEW_ENTRY_ID = 'virtual:jogak/preview-entry'
const RESOLVED_VIRTUAL_PREVIEW_ENTRY_ID = '\0' + VIRTUAL_PREVIEW_ENTRY_ID

const VIRTUAL_PREVIEW_GLOBAL_CSS_ID = 'virtual:jogak/preview-global-css'
const RESOLVED_VIRTUAL_PREVIEW_GLOBAL_CSS_ID = '\0' + VIRTUAL_PREVIEW_GLOBAL_CSS_ID

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
        return renderPreviewEntrySource({
          extraImports: [VIRTUAL_PREVIEW_GLOBAL_CSS_ID, 'virtual:jogak'],
        })
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
