/**
 * 알파.9: next-adapter — `<userRoot>/app/jogak-preview/page.tsx` scaffold.
 *
 * Next.js webpack은 vite처럼 가상 모듈을 지원하지 않으므로 사용자 cwd의 app 디렉토리에
 * 직접 page.tsx를 generate한다. `.gitignore`에 자동 추가하고 shutdown 시 cleanup.
 *
 * App Router 우선:
 * - `<cwd>/src/app/` 우선 (사용자가 src/ 사용 시)
 * - 없으면 `<cwd>/app/`
 *
 * Pages Router는 알파.10 검토.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { resolveGlobalCssPaths } from '../../server.js'

export interface ScaffoldOptions {
  readonly cwd: string
  readonly globalCss?: boolean | string | readonly string[]
}

export interface ScaffoldHandle {
  /** Cleanup — shutdown 시 호출. scaffolded 디렉토리 제거. */
  cleanup(): void
  /** scaffolded preview path (route, e.g. `/jogak-preview`). */
  readonly route: string
}

const PREVIEW_ROUTE_DIR = 'jogak-preview'
const ROUTE = `/${PREVIEW_ROUTE_DIR}`

export function scaffoldPreviewPage(opts: ScaffoldOptions): ScaffoldHandle {
  const appDir = detectAppDir(opts.cwd)
  if (appDir === undefined) {
    throw new Error(
      `[jogak/next-adapter] App Router 디렉토리를 찾지 못했습니다 (${opts.cwd}/app 또는 ${opts.cwd}/src/app).\n` +
        'Pages Router는 알파.10에서 지원 예정. 임시 우회: `app/` 디렉토리 생성 후 재시도.',
    )
  }

  const targetDir = resolve(appDir, PREVIEW_ROUTE_DIR)
  mkdirSync(targetDir, { recursive: true })

  const cssImports = resolveGlobalCssPaths(opts.globalCss, opts.cwd)
    .map((p) => `import ${JSON.stringify(p)}`)
    .join('\n')

  // CLI가 사전 생성한 .jogak/registry.ts에서 entries import.
  // page.tsx 위치 → registry 파일까지의 상대 경로를 컴파일 타임에 계산.
  const registryAbsPath = resolve(opts.cwd, '.jogak/registry')
  const registryRel = toPosix(relative(targetDir, registryAbsPath))
  const registryImport = registryRel.startsWith('.') ? registryRel : `./${registryRel}`

  writeFileSync(
    resolve(targetDir, 'page.tsx'),
    renderPagePageSource(cssImports, registryImport),
    'utf8',
  )
  writeFileSync(resolve(targetDir, 'layout.tsx'), renderLayoutSource(), 'utf8')

  // .gitignore 자동 추가
  ensureGitignore(opts.cwd, `${PREVIEW_ROUTE_DIR}/`)

  return {
    route: ROUTE,
    cleanup: () => {
      try {
        rmSync(targetDir, { recursive: true, force: true })
      } catch {
        // best-effort
      }
    },
  }
}

function detectAppDir(cwd: string): string | undefined {
  const srcApp = resolve(cwd, 'src/app')
  if (existsSync(srcApp)) return srcApp
  const app = resolve(cwd, 'app')
  if (existsSync(app)) return app
  return undefined
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
  // 사용자 컴포넌트 디렉토리 안의 jogak-preview/ — relative pattern.
  const pattern = `**/${entry}`
  const lines = content.split('\n')
  if (lines.some((line) => line.trim() === pattern)) return

  const banner = '# jogak (auto-generated, do not commit preview scaffolding)'
  const updated =
    content.endsWith('\n') || content === ''
      ? `${content}${banner}\n${pattern}\n`
      : `${content}\n${banner}\n${pattern}\n`
  try {
    writeFileSync(gitignorePath, updated, 'utf-8')
  } catch {
    // best-effort
  }
}

function renderLayoutSource(): string {
  return `import type { ReactNode } from 'react'

// jogak preview layout — RootLayout이 사용자 globalCss를 import하므로 여기서 추가 import 불필요.
export default function JogakPreviewLayout({ children }: { children: ReactNode }) {
  return children
}
`
}

function toPosix(p: string): string {
  return p.split(/[\\/]/u).join('/')
}

function renderPagePageSource(cssImports: string, registryImport: string): string {
  return `'use client'
import { useEffect, useRef } from 'react'
import { reactAdapter } from '@jogak/core/renderers/react'
import { defaultRegistry } from '@jogak/core'
import { entries as _jogakEntries } from ${JSON.stringify(registryImport)}
${cssImports}

// 모듈 평가 시점 1회 등록 — HMR 재평가 대비 멱등 처리.
for (const entry of _jogakEntries) {
  if (defaultRegistry.get(entry.id) === undefined) {
    defaultRegistry.register(entry)
  }
}

export default function JogakPreviewPage() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let currentContainer: HTMLDivElement | null = null

    const renderEntry = async (entryId: string, args: Record<string, unknown>) => {
      const entry = await defaultRegistry.requestEntry(entryId)
      if (currentContainer === null) {
        currentContainer = document.createElement('div')
        ref.current?.replaceChildren(currentContainer)
      }
      reactAdapter.render(entry, args, currentContainer)
    }

    const unmount = () => {
      if (currentContainer !== null) {
        reactAdapter.unmount(currentContainer)
        currentContainer = null
      }
    }

    const handler = (event: MessageEvent) => {
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
    }

    window.addEventListener('message', handler)
    window.parent.postMessage({ type: 'jogak:ready' }, '*')
    return () => { window.removeEventListener('message', handler) }
  }, [])

  return <div id="jogak-preview-root" ref={ref} />
}
`
}
