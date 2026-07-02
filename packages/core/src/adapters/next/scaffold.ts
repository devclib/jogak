/**
 * 알파.9: next-adapter — `<userRoot>/{app,pages}/jogak-preview` scaffold.
 *
 * Next.js webpack은 vite처럼 가상 모듈을 지원하지 않으므로 사용자 cwd의 router 디렉토리에
 * 직접 파일을 generate한다. `.gitignore`에 자동 추가하고 shutdown 시 cleanup.
 *
 * 라우터 우선순위:
 * 1. `<cwd>/{src/,}app/` — App Router (Next.js 13+)
 * 2. `<cwd>/{src/,}pages/` — Pages Router (Next.js 12 이하/하위호환)
 *
 * 알파.13: App Router에 추가로 Pages Router 지원. App Router 우선 (둘 다 있으면 App).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { resolveGlobalCssPaths } from '../../server.js'
import { A11Y_SNIPPET } from '../../preview-entry/a11y-snippet.js'

export interface ScaffoldOptions {
  readonly cwd: string
  readonly globalCss?: boolean | string | readonly string[]
  /**
   * 알파.13: Server Component 사용자 컴포넌트를 jogak preview에서 SSR로 렌더한다.
   * `true`일 때 App Router scaffold가 server-component page + JogakIframeBridge
   * client wrapper로 생성된다. props 변경 시 router.replace로 URL navigate되어
   * server component가 재실행된다.
   *
   * Pages Router는 RSC 미지원 (Next.js 정책). pages 모드에서는 무시된다.
   */
  readonly rsc?: boolean
}

export interface ScaffoldHandle {
  /** Cleanup — shutdown 시 호출. scaffolded 파일/디렉토리 제거. */
  cleanup(): void
  /** scaffolded preview path (route, e.g. `/jogak-preview`). */
  readonly route: string
  /** 어느 router 모드로 scaffolded됐는지 (`app` | `pages`). */
  readonly router: 'app' | 'pages'
}

const PREVIEW_ROUTE_NAME = 'jogak-preview'
const ROUTE = `/${PREVIEW_ROUTE_NAME}`

export function scaffoldPreviewPage(opts: ScaffoldOptions): ScaffoldHandle {
  const detected = detectRouter(opts.cwd)
  if (detected === undefined) {
    throw new Error(
      `[jogak/next-adapter] App Router 또는 Pages Router 디렉토리를 찾지 못했습니다.\n` +
        `검색 경로: ${opts.cwd}/{src/,}app, ${opts.cwd}/{src/,}pages\n` +
        '둘 중 하나의 디렉토리 생성 후 재시도하세요.',
    )
  }

  const cssAbsPaths = resolveGlobalCssPaths(opts.globalCss, opts.cwd)

  if (detected.router === 'app') {
    return scaffoldAppRouter(opts.cwd, detected.routerDir, cssAbsPaths, opts.rsc === true)
  }
  // Pages Router에서 rsc 옵션을 명시했더라도 RSC는 App Router 전용 — 무시.
  return scaffoldPagesRouter(opts.cwd, detected.routerDir, cssAbsPaths)
}

interface DetectedRouter {
  readonly router: 'app' | 'pages'
  readonly routerDir: string
}

function detectRouter(cwd: string): DetectedRouter | undefined {
  // App Router 우선
  const srcApp = resolve(cwd, 'src/app')
  if (existsSync(srcApp)) return { router: 'app', routerDir: srcApp }
  const app = resolve(cwd, 'app')
  if (existsSync(app)) return { router: 'app', routerDir: app }
  // Pages Router
  const srcPages = resolve(cwd, 'src/pages')
  if (existsSync(srcPages)) return { router: 'pages', routerDir: srcPages }
  const pages = resolve(cwd, 'pages')
  if (existsSync(pages)) return { router: 'pages', routerDir: pages }
  return undefined
}

function scaffoldAppRouter(
  cwd: string,
  appDir: string,
  cssAbsPaths: readonly string[],
  rsc: boolean,
): ScaffoldHandle {
  const targetDir = resolve(appDir, PREVIEW_ROUTE_NAME)
  mkdirSync(targetDir, { recursive: true })

  // 알파.X: Next 16 turbopack은 절대 경로 import (`/abs/path/file.css`)를 module
  // not found로 거부한다. webpack과 호환 위해 targetDir 기준 상대 경로로 emit.
  const cssImports = cssAbsPaths
    .map((abs) => {
      const rel = toPosix(relative(targetDir, abs))
      return `import ${JSON.stringify(rel.startsWith('.') ? rel : `./${rel}`)}`
    })
    .join('\n')

  // CLI가 사전 생성한 .jogak/registry.ts에서 entries import.
  const registryAbsPath = resolve(cwd, '.jogak/registry')
  const registryRel = toPosix(relative(targetDir, registryAbsPath))
  const registryImport = registryRel.startsWith('.') ? registryRel : `./${registryRel}`

  writeFileSync(
    resolve(targetDir, 'page.tsx'),
    rsc
      ? renderAppRouterRscPageSource(cssImports, registryImport)
      : renderAppRouterPageSource(cssImports, registryImport),
    'utf8',
  )
  writeFileSync(resolve(targetDir, 'layout.tsx'), renderAppRouterLayoutSource(), 'utf8')

  // 알파.13: RSC 모드에서는 'use client' 디렉티브가 사용자 cwd 파일 첫 줄에 명시되어야
  // Next.js webpack이 client boundary로 인식한다. core dist 안의 'use client'는 vite lib
  // build가 module top에 보존하지 않으므로, bridge 컴포넌트를 사용자 cwd로 inline emit.
  if (rsc) {
    writeFileSync(resolve(targetDir, '_bridge.tsx'), renderRscBridgeSource(), 'utf8')
  }

  ensureGitignore(cwd, `${PREVIEW_ROUTE_NAME}/`)

  return {
    router: 'app',
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

function scaffoldPagesRouter(cwd: string, pagesDir: string, cssAbsPaths: readonly string[]): ScaffoldHandle {
  // Pages Router는 단일 파일 라우트 — pages/jogak-preview.tsx
  const targetFile = resolve(pagesDir, `${PREVIEW_ROUTE_NAME}.tsx`)

  const registryAbsPath = resolve(cwd, '.jogak/registry')
  const registryRel = toPosix(relative(pagesDir, registryAbsPath))
  const registryImport = registryRel.startsWith('.') ? registryRel : `./${registryRel}`

  // Pages Router는 글로벌 CSS를 `_app.tsx`에서만 import 가능 (Next.js 제약).
  // jogak이 사용자 `_app.tsx`를 침범하지 않으므로 글로벌 CSS는 사용자 _app.tsx 책임.
  // jogak-preview.tsx 자체에는 cssImports를 emit하지 않는다.
  void cssAbsPaths

  writeFileSync(targetFile, renderPagesRouterSource('', registryImport), 'utf8')

  // pages/jogak-preview.tsx 자체를 gitignore에 추가.
  ensureGitignore(cwd, `${PREVIEW_ROUTE_NAME}.tsx`)

  return {
    router: 'pages',
    route: ROUTE,
    cleanup: () => {
      try {
        rmSync(targetFile, { force: true })
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

function renderAppRouterLayoutSource(): string {
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

/**
 * App Router용 page.tsx — Client Component로 동작 (`'use client'`).
 * Pages Router와 동일한 message-protocol mount 로직.
 */
function renderAppRouterPageSource(cssImports: string, registryImport: string): string {
  return `'use client'
${renderClientMountSource(cssImports, registryImport, 'JogakPreviewPage')}`
}

/**
 * 알파.13: App Router RSC 모드 page.tsx — Server Component.
 * URL searchParams로 entryId/args를 받아 user component를 server-side render하고,
 * `JogakIframeBridge` client wrapper가 부모 SPA의 postMessage를 받아 router.replace로
 * URL을 갱신해 server component를 재실행시킨다.
 *
 * 사용자가 'use client' 디렉티브 없이 작성한 Server Component도 jogak preview에서
 * 정상 동작한다.
 */
function renderAppRouterRscPageSource(cssImports: string, registryImport: string): string {
  return `import type { ComponentType } from 'react'
import { JogakIframeBridge } from './_bridge'
import { entries as _jogakEntries } from ${JSON.stringify(registryImport)}
${cssImports}

interface PageProps {
  searchParams?: Promise<{ entryId?: string; args?: string }>
}

function safeParseArgs(raw: string | undefined): Record<string, unknown> {
  if (raw === undefined || raw === '') return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed !== null && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch {
    // ignore — parse 실패 시 빈 args.
  }
  return {}
}

export default async function JogakPreviewPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {}
  const entryId = sp.entryId
  const args = safeParseArgs(sp.args)

  const entry =
    entryId !== undefined
      ? _jogakEntries.find((e) => e.id === entryId)
      : undefined
  const Component = entry?.meta.component as ComponentType<Record<string, unknown>> | undefined

  return (
    <>
      <JogakIframeBridge />
      <div id="jogak-preview-root">
        {Component !== undefined ? <Component {...args} /> : null}
      </div>
    </>
  )
}
`
}

/**
 * Pages Router용 jogak-preview.tsx — Pages Router에서 `'use client'`는 불필요.
 * Pages Router 컴포넌트는 default가 client/SSR 둘 다 동작.
 */
function renderPagesRouterSource(cssImports: string, registryImport: string): string {
  return renderClientMountSource(cssImports, registryImport, 'JogakPreviewPage')
}

/**
 * 알파.13: RSC scaffold용 client bridge 컴포넌트 (사용자 cwd로 emit).
 * 'use client' 디렉티브가 첫 줄에 명시되어 Next webpack이 client boundary로 인식한다.
 */
function renderRscBridgeSource(): string {
  return `'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

${A11Y_SNIPPET}

export function JogakIframeBridge() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data
      if (data == null || typeof data !== 'object') return
      if (data.type === 'jogak:setProps') {
        const entryId = String(data.entryId ?? '')
        if (entryId === '') return
        const args =
          data.args !== undefined && data.args !== null
            ? JSON.stringify(data.args)
            : '{}'
        const params = new URLSearchParams()
        params.set('entryId', entryId)
        params.set('args', args)
        router.replace('?' + params.toString(), { scroll: false })
      } else if (data.type === 'jogak:unmount') {
        router.replace('?', { scroll: false })
      } else if (data.type === 'jogak:runA11y') {
        scheduleA11y()
      } else if (data.type === 'jogak:setTheme' && typeof data.theme === 'string') {
        // 1.2.0 post-1.1: Themes addon.
        document.documentElement.setAttribute('data-theme', data.theme)
      } else if (data.type === 'jogak:renderDocs' && typeof data.docsPath === 'string') {
        // 1.2.0 post-1.1: MDX docs — Next scaffold는 SSR path 기반이므로 chrome scope에서 안내.
        const rootEl = document.getElementById('jogak-preview-root')
        if (rootEl !== null) {
          rootEl.innerHTML =
            '<div style="padding:24px;font:13px system-ui;color:#57534e;">'
            + '<strong>MDX docs mode</strong><br><br>'
            + 'Next adapter routes docs through the app router. To render .mdx in Next, add a docs page under /jogak-docs/[slug] and use @next/mdx.'
            + '</div>'
        }
        window.parent.postMessage({ type: 'jogak:rendered', entryId: '__docs__' }, '*')
      } else if (data.type === 'jogak:runPlay') {
        // 1.2.0 post-1.1: Play 함수 — Next scaffold는 RSC/SSR path 기반이므로 play는 client 컴포넌트만 지원.
        // 실행 컨텍스트가 별도 저장되지 않은 상태에서 no-play 회신 (사용자에게 Next 특유 안내).
        window.parent.postMessage({ type: 'jogak:playResult', status: 'no-play' }, '*')
      }
    }
    window.addEventListener('message', handler)
    window.parent.postMessage({ type: 'jogak:ready' }, '*')
    return () => { window.removeEventListener('message', handler) }
  }, [router])

  useEffect(() => {
    const entryId = searchParams.get('entryId')
    if (entryId !== null && entryId !== '') {
      window.parent.postMessage({ type: 'jogak:rendered', entryId }, '*')
      scheduleA11y()
    }
  }, [searchParams])

  return null
}
`
}

function renderClientMountSource(
  cssImports: string,
  registryImport: string,
  componentName: string,
): string {
  return `import { useEffect, useRef } from 'react'
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

${A11Y_SNIPPET}

export default function ${componentName}() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let currentContainer: HTMLDivElement | null = null
    // 1.2.0 post-1.2: Play 함수 실행 컨텍스트.
    let currentEntryId: string | null = null
    let currentJogakName: string | null = null
    let currentArgs: Record<string, unknown> = {}

    const renderEntry = async (
      entryId: string,
      args: Record<string, unknown>,
      jogakName: string | null,
    ) => {
      const entry = await defaultRegistry.requestEntry(entryId)
      if (currentContainer === null) {
        currentContainer = document.createElement('div')
        ref.current?.replaceChildren(currentContainer)
      }
      reactAdapter.render(entry, args, currentContainer)
      currentEntryId = entryId
      currentJogakName = jogakName
      currentArgs = args
    }

    const unmount = () => {
      if (currentContainer !== null) {
        reactAdapter.unmount(currentContainer)
        currentContainer = null
      }
      currentEntryId = null
      currentJogakName = null
    }

    // 1.2.0 post-1.2: Play 함수 실 실행 (jogakName + args 컨텍스트 활용).
    const runPlay = async () => {
      if (currentEntryId === null || currentContainer === null) {
        window.parent.postMessage({ type: 'jogak:playResult', status: 'no-play' }, '*')
        return
      }
      try {
        const entry = await defaultRegistry.requestEntry(currentEntryId)
        const jogak =
          (entry?.jogaks ?? []).find((j) => j.name === currentJogakName) ??
          entry?.jogaks?.[0]
        if (jogak === undefined || typeof (jogak as { play?: unknown }).play !== 'function') {
          window.parent.postMessage({ type: 'jogak:playResult', status: 'no-play' }, '*')
          return
        }
        await (jogak as { play: (ctx: { canvasElement: HTMLElement; args: Record<string, unknown> }) => Promise<void> | void }).play({
          canvasElement: currentContainer,
          args: currentArgs,
        })
        window.parent.postMessage({ type: 'jogak:playResult', status: 'ok' }, '*')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        window.parent.postMessage({ type: 'jogak:playResult', status: 'error', message }, '*')
      }
    }

    const handler = (event: MessageEvent) => {
      const data = event.data
      if (data == null || typeof data !== 'object') return
      if (data.type === 'jogak:setProps') {
        const jogakName = typeof data.jogakName === 'string' ? data.jogakName : null
        void renderEntry(data.entryId, data.args ?? {}, jogakName).then(() => {
          window.parent.postMessage({ type: 'jogak:rendered', entryId: data.entryId }, '*')
          scheduleA11y()
        }).catch((err) => {
          window.parent.postMessage({ type: 'jogak:error', message: String(err?.message ?? err) }, '*')
        })
      } else if (data.type === 'jogak:unmount') {
        unmount()
      } else if (data.type === 'jogak:runA11y') {
        scheduleA11y()
      } else if (data.type === 'jogak:setTheme' && typeof data.theme === 'string') {
        // 1.2.0 post-1.1: Themes addon.
        document.documentElement.setAttribute('data-theme', data.theme)
      } else if (data.type === 'jogak:runPlay') {
        // 1.2.0 post-1.2: 실 실행 — jogakName + args 컨텍스트 저장 완결.
        void runPlay()
      }
    }

    window.addEventListener('message', handler)
    // 1.0.0-beta.2: body 높이 sync.
    const heightObserver = new ResizeObserver((entries) => {
      for (const e of entries) {
        const height = Math.ceil(e.contentRect.height)
        if (height > 0) window.parent.postMessage({ type: 'jogak:height', height }, '*')
      }
    })
    heightObserver.observe(document.body)
    window.parent.postMessage({ type: 'jogak:ready' }, '*')
    return () => {
      window.removeEventListener('message', handler)
      heightObserver.disconnect()
    }
  }, [])

  return <div id="jogak-preview-root" ref={ref} />
}
`
}
