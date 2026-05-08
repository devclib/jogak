/**
 * 알파.9: vite-adapter의 spawnDev 구현.
 *
 * 사용자 vite.config.{ts,mts,js,mjs,cjs}를 자동 탐지 → loadConfigFromFile + mergeConfig로
 * jogakPreviewFramePlugin + jogak() (previewFrame=true) 자동 inject → createServer.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ViteDevServer } from 'vite'
import type { DevHandle, SpawnDevOptions } from '@jogak/core'
import { jogak } from '@jogak/core/vite'
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
