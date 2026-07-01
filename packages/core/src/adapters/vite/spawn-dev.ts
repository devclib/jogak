/**
 * 알파.9: vite-adapter의 spawnDev 구현.
 *
 * 사용자 vite.config.{ts,mts,js,mjs,cjs}를 자동 탐지 → loadConfigFromFile + mergeConfig로
 * jogakPreviewFramePlugin + jogak() (previewFrame=true) 자동 inject → createServer.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ViteDevServer } from 'vite'
import type { DevHandle, SpawnDevOptions } from '../../index.js'
import { jogak } from '../../vite-plugin/index.js'
import { jogakPreviewFramePlugin } from './preview-frame-plugin.js'

const VITE_CONFIG_EXTS = ['ts', 'mts', 'js', 'mjs', 'cjs'] as const

interface ViteAdapterExtra {
  readonly configFile?: string
  readonly disabled?: boolean
}

export async function spawnViteDev(opts: SpawnDevOptions): Promise<DevHandle> {
  const extra = (opts.extra ?? {}) as ViteAdapterExtra

  if (extra.disabled === true) {
    throw new Error(
      '[jogak/vite-adapter] disabled=true. dispatch should fall back to standalone or skip spawn.',
    )
  }

  const configFile = extra.configFile ?? detectViteConfig(opts.cwd)
  if (configFile === undefined) {
    throw new Error(
      `[jogak/vite-adapter] vite.config not found in ${opts.cwd}. ` +
        `명시 경로: jogak.config.ts의 builderOptions: { configFile: '...' }`,
    )
  }

  const vite = await import('vite')

  const loaded = await vite.loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    configFile,
    opts.cwd,
  )
  const userConfig = loaded?.config ?? {}

  // 알파.9: 사용자 vite default port 5174 — jogak SPA가 default 5173 차지.
  const port = opts.port ?? 5174
  const host = opts.host ?? 'localhost'

  const merged = vite.mergeConfig(userConfig, {
    plugins: [
      jogak({
        cwd: opts.cwd,
        previewFrame: true,
        ...(opts.globalCss !== undefined ? { globalCss: opts.globalCss } : {}),
      }),
      jogakPreviewFramePlugin({
        userRoot: opts.cwd,
        ...(opts.globalCss !== undefined ? { globalCss: opts.globalCss } : {}),
      }),
    ],
    server: {
      port,
      host,
      strictPort: false,
      cors: true,
    },
    // 1.0.0-beta.5: dependencies를 미리 optimizeDeps에 포함 — 첫 iframe mount에서
    // vite가 dynamically discover → "optimized dependencies changed. reloading" 반복
    // 회귀 방지. jogak-vite-test smoke가 이 이슈로 CI 60s+ timeout (fix 전).
    //
    // include는 사용자 fixture의 실제 dependency에 있을 때만 pre-bundle.
    // 없는 dep을 강제 include하면 "Failed to resolve" fail. 사용자 vite.config의
    // 이미 있는 optimizeDeps.include에 mergeConfig가 추가하는 방식.
    optimizeDeps: {
      include: buildOptimizeDepsInclude(opts.cwd),
    },
    appType: 'mpa',
    configFile: false,
  })

  const server: ViteDevServer = await vite.createServer(merged)
  await server.listen()

  const resolvedPort = server.config.server.port ?? port
  const url = `http://localhost:${String(resolvedPort)}`

  return {
    url,
    port: resolvedPort,
    close: async () => {
      try {
        await server.close()
      } catch {
        // best-effort
      }
    },
  }
}

function detectViteConfig(cwd: string): string | undefined {
  for (const ext of VITE_CONFIG_EXTS) {
    const candidate = resolve(cwd, `vite.config.${ext}`)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

/**
 * 1.0.0-beta.5: 사용자 package.json의 dependencies를 확인해 optimizeDeps.include에
 * 넣을 항목을 선별. 사용자가 실제로 install 안 한 dep을 include에 넣으면 vite가
 * "Failed to resolve" fail. framework별 pre-bundle 후보에서 존재하는 것만 include.
 *
 * jogak core는 항상 include (workspace 또는 install 시 필수 peer).
 */
function buildOptimizeDepsInclude(cwd: string): readonly string[] {
  const include: string[] = ['@jogak/core']
  let pkgDeps: Record<string, unknown> = {}
  try {
    const pkgPath = resolve(cwd, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
        dependencies?: Record<string, unknown>
        devDependencies?: Record<string, unknown>
      }
      pkgDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    }
  } catch {
    // best-effort — pkg 파싱 실패 시 core만 include.
    return include
  }

  // React 계열
  if ('react' in pkgDeps) {
    include.push('react')
    include.push('react-dom')
    include.push('react-dom/client')
    include.push('@jogak/core/renderers/react')
  }
  // Vue
  if ('vue' in pkgDeps) {
    include.push('vue')
    include.push('@jogak/core/renderers/vue')
  }
  // Svelte
  if ('svelte' in pkgDeps) {
    include.push('svelte')
    include.push('@jogak/core/renderers/svelte')
  }

  return include
}
