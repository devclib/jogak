/**
 * 알파.9: webpack-adapter — `<userRoot>/.jogak/webpack-preview/preview-entry.tsx` scaffold.
 *
 * webpack은 vite처럼 가상 모듈을 직접 지원 안 함 (custom resolver/loader 필요). 단순화 위해
 * 사용자 cwd의 `.jogak/webpack-preview/`에 entry 파일을 generate하고 webpack entry로 등록.
 *
 * `.jogak/`는 .gitignore에 자동 추가.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { resolveGlobalCssPaths } from '../../server.js'

export interface ScaffoldOptions {
  readonly cwd: string
  readonly globalCss?: boolean | string | readonly string[]
}

export interface ScaffoldHandle {
  readonly entryAbsPath: string
  readonly htmlTemplateAbsPath: string
  cleanup(): void
}

const SCAFFOLD_DIR = '.jogak/webpack-preview'

export function scaffoldPreviewEntry(opts: ScaffoldOptions): ScaffoldHandle {
  const targetDir = resolve(opts.cwd, SCAFFOLD_DIR)
  mkdirSync(targetDir, { recursive: true })

  const cssImports = resolveGlobalCssPaths(opts.globalCss, opts.cwd)
    .map((p) => `import ${JSON.stringify(p)}`)
    .join('\n')

  const entryPath = resolve(targetDir, 'preview-entry.tsx')
  const htmlPath = resolve(targetDir, 'preview-template.html')

  // CLI가 사전 생성한 .jogak/registry.ts에서 entries import.
  const registryAbsPath = resolve(opts.cwd, '.jogak/registry')
  const registryRel = toPosix(relative(targetDir, registryAbsPath))
  const registryImport = registryRel.startsWith('.') ? registryRel : `./${registryRel}`

  writeFileSync(entryPath, renderEntrySource(cssImports, registryImport), 'utf-8')
  writeFileSync(htmlPath, renderHtmlTemplate(), 'utf-8')

  ensureGitignore(opts.cwd, '.jogak/')

  return {
    entryAbsPath: entryPath,
    htmlTemplateAbsPath: htmlPath,
    cleanup: () => {
      try {
        rmSync(resolve(opts.cwd, '.jogak'), { recursive: true, force: true })
      } catch {
        // best-effort
      }
    },
  }
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

function renderHtmlTemplate(): string {
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
  </body>
</html>
`
}

function toPosix(p: string): string {
  return p.split(/[\\/]/u).join('/')
}

function renderEntrySource(cssImports: string, registryImport: string): string {
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

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data
  if (data == null || typeof data !== 'object') return
  if (data.type === 'jogak:setProps') {
    void renderEntry(data.entryId, data.args ?? {}).then(() => {
      window.parent.postMessage({ type: 'jogak:rendered', entryId: data.entryId }, '*')
    }).catch((err: unknown) => {
      window.parent.postMessage({ type: 'jogak:error', message: String((err as Error)?.message ?? err) }, '*')
    })
  } else if (data.type === 'jogak:unmount') {
    unmount()
  }
})

window.parent.postMessage({ type: 'jogak:ready' }, '*')
`
}
