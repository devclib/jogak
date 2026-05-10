/**
 * 알파.11: webpack-adapter의 build 구현.
 *
 * 사용자 webpack.config.{ts,js,mjs,cjs}를 evaluate하고 webpack-merge로 jogak entry +
 * HtmlWebpackPlugin을 추가한 뒤 webpack programmatic API(production)로 정적 emit.
 *
 * 산출물 위치: `previewOutDir/__jogak_preview__/index.html` + chunk/assets.
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { BuildOptions, BuildResult } from '../../index.js'
import { scaffoldPreviewEntry } from './scaffold.js'

interface WebpackAdapterExtra {
  readonly configFile?: string
}

const WEBPACK_CONFIG_EXTS = ['ts', 'js', 'mjs', 'cjs'] as const

export async function buildWebpack(opts: BuildOptions): Promise<BuildResult> {
  const extra = (opts.extra ?? {}) as WebpackAdapterExtra
  const configFile = extra.configFile ?? detectWebpackConfig(opts.cwd)

  const scaffold = scaffoldPreviewEntry({
    cwd: opts.cwd,
    ...(opts.globalCss !== undefined ? { globalCss: opts.globalCss } : {}),
  })

  // 사용자 webpack.config 로드 (mode: 'production')
  let userConfig: Record<string, unknown> = {}
  if (configFile !== undefined) {
    try {
      const mod = await import(pathToFileURL(configFile).toString())
      const exported =
        ((mod as { default?: Record<string, unknown> }).default ??
          (mod as Record<string, unknown>))
      userConfig =
        typeof exported === 'function'
          ? (exported as (env?: unknown, argv?: unknown) => Record<string, unknown>)(
              { production: true },
              { mode: 'production' },
            )
          : (exported as Record<string, unknown>)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      opts.logger?.warn?.(`[jogak/webpack-adapter] webpack.config evaluate failed: ${message}`)
    }
  }

  type WebpackFn = (config: unknown) => {
    run(callback: (err: Error | null, stats?: WebpackStats) => void): void
    close(callback: (err: Error | null) => void): void
  }
  type WebpackStats = {
    hasErrors(): boolean
    toJson(opts: { all: boolean; errors: boolean; assets: boolean }): {
      errors?: ReadonlyArray<{ message: string }>
      assets?: ReadonlyArray<{ name: string; size: number }>
    }
  }
  type HtmlWebpackPluginCtor = new (opts?: object) => unknown

  let webpackMod: { default: WebpackFn } | WebpackFn
  let HtmlWebpackPluginMod: { default: HtmlWebpackPluginCtor } | HtmlWebpackPluginCtor
  let mergeFn: (...configs: unknown[]) => Record<string, unknown>
  try {
    webpackMod = (await import('webpack')) as unknown as { default: WebpackFn }
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
        `install: pnpm add -D webpack webpack-merge html-webpack-plugin\n` +
        `original: ${message}`,
    )
  }

  const HtmlWebpackPlugin =
    (HtmlWebpackPluginMod as { default: HtmlWebpackPluginCtor }).default
    ?? (HtmlWebpackPluginMod as unknown as HtmlWebpackPluginCtor)

  const config = mergeFn(userConfig, {
    mode: 'production',
    entry: { __jogak_preview__: scaffold.entryAbsPath },
    output: {
      path: opts.previewOutDir,
      publicPath: './',
      clean: true,
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: '__jogak_preview__/index.html',
        chunks: ['__jogak_preview__'],
        template: scaffold.htmlTemplateAbsPath,
        publicPath: '../',
      }),
    ],
  })

  const webpackFn =
    (webpackMod as { default: WebpackFn }).default ?? (webpackMod as unknown as WebpackFn)
  const compiler = webpackFn(config)

  const start = Date.now()
  const stats = await new Promise<WebpackStats>((res, rej) => {
    compiler.run((err, s) => {
      compiler.close(() => {
        if (err) rej(err)
        else if (s === undefined) rej(new Error('[jogak/webpack-adapter] no stats'))
        else if (s.hasErrors()) {
          const json = s.toJson({ all: false, errors: true, assets: false })
          rej(new Error(
            `[jogak/webpack-adapter] build errors:\n` +
              (json.errors ?? []).map((e) => e.message).join('\n'),
          ))
        } else {
          res(s)
        }
      })
    })
  })
  const elapsedMs = Date.now() - start

  scaffold.cleanup()

  // stats.assets는 entry chunk만 포함 — HtmlWebpackPlugin emit한 HTML이 누락될 수 있어
  // outDir 직접 walk로 정확한 file count + bytes 산출.
  const fsStats = walkDir(opts.previewOutDir)

  // stats가 사용 가능하면 webpack의 errors check만 활용 (이미 위에서 reject), assets는 fs walk 사용.
  void stats

  return {
    outDir: opts.previewOutDir,
    entryHtml: '__jogak_preview__/index.html',
    elapsedMs,
    assetCount: fsStats.fileCount,
    totalBytes: fsStats.totalBytes,
  }
}

function detectWebpackConfig(cwd: string): string | undefined {
  for (const ext of WEBPACK_CONFIG_EXTS) {
    const candidate = resolve(cwd, `webpack.config.${ext}`)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

function walkDir(dir: string): { fileCount: number; totalBytes: number } {
  let fileCount = 0
  let totalBytes = 0
  if (!existsSync(dir)) return { fileCount, totalBytes }
  for (const entry of readdirSync(dir)) {
    const p = resolve(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) {
      const sub = walkDir(p)
      fileCount += sub.fileCount
      totalBytes += sub.totalBytes
    } else {
      fileCount += 1
      totalBytes += st.size
    }
  }
  return { fileCount, totalBytes }
}
