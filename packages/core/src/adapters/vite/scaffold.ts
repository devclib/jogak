/**
 * 알파.11: vite-adapter build를 위한 entry scaffold.
 *
 * dev 모드에서는 preview-frame-plugin이 `/jogak-preview/index.html` middleware로
 * 가상 HTML을 응답하지만, build에서는 vite의 `rollupOptions.input`이 실제 파일을
 * 가리켜야 한다. `<userCwd>/.jogak/vite-preview/{index.html, preview-entry.tsx}`를
 * scaffold하고 build 종료 시 cleanup.
 *
 * scaffold 코드의 import 경로는 dev와 동일 — 사용자 vite scope에서 평가되므로
 * `@jogak/core/renderers/react`, `@jogak/core` 등 사용자 node_modules에 install된
 * 패키지를 그대로 사용.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { resolveGlobalCssPaths } from '../../server.js'
import { A11Y_SNIPPET } from '../../preview-entry/a11y-snippet.js'

export interface ScaffoldOptions {
  readonly cwd: string
  readonly globalCss?: boolean | string | readonly string[]
}

export interface ScaffoldHandle {
  readonly scaffoldDir: string
  readonly entryHtmlAbsPath: string
  readonly entryTsxAbsPath: string
  cleanup(): void
}

const SCAFFOLD_DIR = '.jogak/vite-preview'

export function scaffoldVitePreview(opts: ScaffoldOptions): ScaffoldHandle {
  const targetDir = resolve(opts.cwd, SCAFFOLD_DIR)
  mkdirSync(targetDir, { recursive: true })

  const cssImports = resolveGlobalCssPaths(opts.globalCss, opts.cwd)
    .map((p) => `import ${JSON.stringify(p)}`)
    .join('\n')

  const entryHtmlPath = resolve(targetDir, 'index.html')
  const entryTsxPath = resolve(targetDir, 'preview-entry.tsx')

  const registryAbsPath = resolve(opts.cwd, '.jogak/registry')
  const registryRel = toPosix(relative(targetDir, registryAbsPath))
  const registryImport = registryRel.startsWith('.') ? registryRel : `./${registryRel}`

  writeFileSync(entryHtmlPath, renderHtml(), 'utf-8')
  writeFileSync(entryTsxPath, renderEntryTsx(cssImports, registryImport), 'utf-8')

  ensureGitignore(opts.cwd, '.jogak/')

  return {
    scaffoldDir: targetDir,
    entryHtmlAbsPath: entryHtmlPath,
    entryTsxAbsPath: entryTsxPath,
    cleanup: () => {
      try {
        rmSync(targetDir, { recursive: true, force: true })
      } catch {
        // best-effort
      }
    },
  }
}

function toPosix(p: string): string {
  return p.split(/[\\/]/u).join('/')
}

function ensureGitignore(cwd: string, entry: string): void {
  const gitignorePath = resolve(cwd, '.gitignore')
  let content = ''
  if (existsSync(gitignorePath)) {
    try {
      content = readFileSync(gitignorePath, 'utf-8')
    } catch {
      return
    }
  }
  const lines = content.split('\n')
  if (lines.some((line) => line.trim() === entry)) return

  const banner = '# jogak (auto-generated, do not commit preview scaffolding)'
  const updated =
    content.endsWith('\n') || content === ''
      ? `${content}${banner}\n${entry}\n`
      : `${content}\n${banner}\n${entry}\n`
  try {
    writeFileSync(gitignorePath, updated, 'utf-8')
  } catch {
    // best-effort
  }
}

function renderHtml(): string {
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
    <script type="module" src="./preview-entry.tsx"></script>
  </body>
</html>
`
}

function renderEntryTsx(cssImports: string, registryImport: string): string {
  return `import { reactAdapter } from '@jogak/core/renderers/react'
import { defaultRegistry } from '@jogak/core'
import { entries as _jogakEntries } from ${JSON.stringify(registryImport)}
${cssImports}

for (const entry of _jogakEntries) {
  if (defaultRegistry.get(entry.id) === undefined) {
    defaultRegistry.register(entry)
  }
}

const rootEl = document.getElementById('jogak-preview-root')
if (rootEl === null) throw new Error('[jogak] #jogak-preview-root not found')

let currentContainer: HTMLDivElement | null = null

async function renderEntry(entryId: string, args: Record<string, unknown>): Promise<void> {
  const entry = await defaultRegistry.requestEntry(entryId)
  if (currentContainer === null) {
    currentContainer = document.createElement('div')
    rootEl.replaceChildren(currentContainer)
  }
  reactAdapter.render(entry, args, currentContainer)
}

function unmount(): void {
  if (currentContainer !== null) {
    reactAdapter.unmount(currentContainer)
    currentContainer = null
  }
}

${A11Y_SNIPPET}
window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data
  if (data == null || typeof data !== 'object') return
  if (data.type === 'jogak:setProps') {
    void renderEntry(data.entryId, data.args ?? {}).then(() => {
      window.parent.postMessage({ type: 'jogak:rendered', entryId: data.entryId }, '*')
      scheduleA11y()
    }).catch((err: unknown) => {
      window.parent.postMessage({ type: 'jogak:error', message: String((err as Error)?.message ?? err) }, '*')
    })
  } else if (data.type === 'jogak:unmount') {
    unmount()
  } else if (data.type === 'jogak:runA11y') {
    scheduleA11y()
  } else if (data.type === 'jogak:setTheme' && typeof data.theme === 'string') {
    document.documentElement.setAttribute('data-theme', data.theme)
  }
})

// 1.0.0-beta.2: body 높이를 부모(chrome SPA IframeMount)에 동기화 — iframe 내부 scroll 회피.
const heightObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const height = Math.ceil(entry.contentRect.height)
    if (height > 0) window.parent.postMessage({ type: 'jogak:height', height }, '*')
  }
})
heightObserver.observe(document.body)

window.parent.postMessage({ type: 'jogak:ready' }, '*')
`
}
