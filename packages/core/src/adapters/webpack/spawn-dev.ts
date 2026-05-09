/**
 * 알파.9: webpack-adapter의 spawnDev 구현.
 *
 * 1. `.jogak/webpack-preview/preview-entry.tsx` scaffold (`.gitignore` 자동)
 * 2. 사용자 webpack.config.{ts,js,mjs,cjs} evaluate
 * 3. `webpack-merge`로 jogak entry 추가 + HtmlWebpackPlugin
 * 4. `webpack-dev-server` programmatic API 시작
 * 5. shutdown: server.stop + scaffold cleanup
 *
 * 한계 (CRA): `react-scripts` 사용 시 webpack config 노출 X — 별도 detect로 standalone fallback.
 * 본 어댑터는 webpack 5 + 사용자 webpack.config.* 직접 환경 한정.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { DevHandle, SpawnDevOptions } from '../../index.js'
import { scaffoldPreviewEntry } from './scaffold.js'

interface WebpackAdapterExtra {
  readonly configFile?: string
}

const WEBPACK_CONFIG_EXTS = ['ts', 'js', 'mjs', 'cjs'] as const

export async function spawnWebpackDev(opts: SpawnDevOptions): Promise<DevHandle> {
  const extra = (opts.extra ?? {}) as WebpackAdapterExtra
  const configFile = extra.configFile ?? detectWebpackConfig(opts.cwd)

  // 1. scaffold
  const scaffold = scaffoldPreviewEntry({
    cwd: opts.cwd,
    ...(opts.globalCss !== undefined ? { globalCss: opts.globalCss } : {}),
  })

  // 2. 사용자 webpack.config 로드
  let userConfig: Record<string, unknown> = {}
  if (configFile !== undefined) {
    try {
      const mod = await import(pathToFileURL(configFile).toString())
      userConfig =
        ((mod as { default?: Record<string, unknown> }).default ??
          (mod as Record<string, unknown>)) as Record<string, unknown>
      if (typeof userConfig === 'function') {
        // webpack config가 함수 형태일 수 있음 — 호출
        userConfig = (userConfig as (env?: unknown, argv?: unknown) => Record<string, unknown>)(
          { development: true },
          { mode: 'development' },
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(
        `[jogak/webpack-adapter] webpack.config evaluate failed: ${message}\n`,
      )
    }
  }

  // 3. webpack-merge로 jogak entry 추가
  type WebpackFn = (config: unknown) => unknown
  type WebpackDevServerCtor = new (opts: unknown, compiler: unknown) => {
    start: () => Promise<void>
    stop: () => Promise<void>
  }
  type HtmlWebpackPluginCtor = new (opts?: object) => unknown
  let webpackMod: { default: WebpackFn } | WebpackFn
  let WebpackDevServerMod: { default: WebpackDevServerCtor } | WebpackDevServerCtor
  let HtmlWebpackPluginMod: { default: HtmlWebpackPluginCtor } | HtmlWebpackPluginCtor
  let mergeFn: (...configs: unknown[]) => Record<string, unknown>
  try {
    webpackMod = (await import('webpack')) as unknown as { default: WebpackFn }
    WebpackDevServerMod = (await import('webpack-dev-server')) as unknown as { default: WebpackDevServerCtor }
    HtmlWebpackPluginMod = (await import('html-webpack-plugin')) as unknown as {
      default: HtmlWebpackPluginCtor
    }
    mergeFn = ((await import('webpack-merge')) as { merge: (...c: unknown[]) => Record<string, unknown> })
      .merge
  } catch (err) {
    scaffold.cleanup()
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[jogak/webpack-adapter] required deps not installed.\n` +
        `install: pnpm add -D webpack webpack-dev-server webpack-merge html-webpack-plugin\n` +
        `original: ${message}`,
    )
  }

  const port = opts.port ?? 5174
  const HtmlWebpackPlugin =
    (HtmlWebpackPluginMod as { default: HtmlWebpackPluginCtor }).default
    ?? (HtmlWebpackPluginMod as unknown as HtmlWebpackPluginCtor)

  const config = mergeFn(userConfig, {
    mode: 'development',
    entry: { __jogak_preview__: scaffold.entryAbsPath },
    plugins: [
      new HtmlWebpackPlugin({
        filename: '__jogak_preview__/index.html',
        chunks: ['__jogak_preview__'],
        template: scaffold.htmlTemplateAbsPath,
      }),
    ],
    devServer: {
      port,
      host: opts.host ?? 'localhost',
      historyApiFallback: false,
      hot: true,
    },
  })

  // 4. webpack compiler + dev-server
  const webpackFn =
    (webpackMod as { default: WebpackFn }).default ?? (webpackMod as unknown as WebpackFn)
  const compiler = webpackFn(config)
  const WebpackDevServer =
    (WebpackDevServerMod as { default: WebpackDevServerCtor }).default
    ?? (WebpackDevServerMod as unknown as WebpackDevServerCtor)

  type DevServerInstance = { start: () => Promise<void>; stop: () => Promise<void> }
  const server = new WebpackDevServer(
    {
      port,
      host: opts.host ?? 'localhost',
      historyApiFallback: false,
      hot: true,
    },
    compiler,
  ) as DevServerInstance

  try {
    await server.start()
  } catch (err) {
    scaffold.cleanup()
    throw err
  }

  return {
    url: `http://localhost:${String(port)}`,
    port,
    close: async () => {
      try {
        await server.stop()
      } catch {
        // best-effort
      }
      scaffold.cleanup()
    },
  }
}

function detectWebpackConfig(cwd: string): string | undefined {
  for (const ext of WEBPACK_CONFIG_EXTS) {
    const candidate = resolve(cwd, `webpack.config.${ext}`)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}
