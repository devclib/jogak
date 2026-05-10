/**
 * 알파.11: vite-adapter의 build 구현.
 *
 * 사용자 vite.config.ts를 `loadConfigFromFile`로 읽고, vite의 programmatic build API로
 * 사용자 plugins(Tailwind 등) 그대로 적용한 채로 preview 산출물을 emit.
 *
 * 산출물: `previewOutDir/index.html` + 자산.
 */

import { resolve } from 'node:path'
import type { BuildOptions, BuildResult } from '../../index.js'
import { scaffoldVitePreview } from './scaffold.js'
import type { Plugin, RollupOutput, RollupWatcher } from './vite-types.js'

export async function buildVite(opts: BuildOptions): Promise<BuildResult> {
  const scaffold = scaffoldVitePreview({
    cwd: opts.cwd,
    ...(opts.globalCss !== undefined ? { globalCss: opts.globalCss } : {}),
  })

  const vite = await import('vite').catch((err: unknown) => {
    scaffold.cleanup()
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[jogak/vite-adapter] vite is not installed in '${opts.cwd}'. ` +
        `Install: pnpm add -D vite\noriginal: ${message}`,
    )
  })

  // 사용자 vite.config.ts 로드 — plugins/aliases/optimizeDeps 등 사용자 설정 보존.
  let userConfig: Record<string, unknown> = {}
  try {
    const loaded = await vite.loadConfigFromFile(
      { command: 'build', mode: 'production' },
      undefined,
      opts.cwd,
    )
    if (loaded?.config !== undefined) {
      userConfig = loaded.config as Record<string, unknown>
    }
  } catch (err: unknown) {
    // config 없거나 syntax error 시 빈 config로 진행 (vite default)
    const message = err instanceof Error ? err.message : String(err)
    opts.logger?.warn?.(`[jogak/vite-adapter] vite.config load skipped: ${message}`)
  }

  // root를 scaffold dir로 설정 — vite는 input을 root-relative path로 emit하므로,
  // root를 cwd로 두면 outDir/.jogak/vite-preview/index.html처럼 nested됨.
  // root=scaffold로 두면 outDir 직하에 index.html이 emit된다.
  // 사용자 plugins(Tailwind 등)은 자기 의존 모듈 그래프를 따라가므로 root 변경의 영향 없음.
  // fs.allow에 cwd를 추가해 사용자 src에서 import할 수 있게 한다.
  const start = Date.now()
  let buildOutput: RollupOutput | RollupOutput[] | RollupWatcher
  try {
    buildOutput = await vite.build({
      ...userConfig,
      configFile: false, // 위에서 이미 로드해 머지했으므로 vite가 재로드하지 않게.
      root: scaffold.scaffoldDir,
      base: './',
      server: {
        ...((userConfig['server'] as Record<string, unknown> | undefined) ?? {}),
        fs: {
          ...((userConfig['server'] as { fs?: Record<string, unknown> } | undefined)?.fs ?? {}),
          allow: [scaffold.scaffoldDir, opts.cwd],
        },
      },
      resolve: {
        ...((userConfig['resolve'] as Record<string, unknown> | undefined) ?? {}),
        // 사용자 cwd의 node_modules를 우선 — root가 scaffold로 변경됐어도
        // @jogak/core, react 등이 사용자 deps에서 해석되도록.
        preserveSymlinks: false,
      },
      build: {
        ...((userConfig['build'] as Record<string, unknown> | undefined) ?? {}),
        outDir: opts.previewOutDir,
        emptyOutDir: true,
        rollupOptions: {
          ...((userConfig['build'] as { rollupOptions?: Record<string, unknown> } | undefined)
            ?.rollupOptions ?? {}),
          input: scaffold.entryHtmlAbsPath,
        },
      },
      // 사용자 plugins 그대로 + jogak 추가 (현재는 preview-frame-plugin이 dev 전용이라
      // build에는 불필요 — scaffold만으로 동작).
      plugins: ((userConfig['plugins'] as Plugin[] | undefined) ?? []) as Plugin[],
    })
  } catch (err: unknown) {
    scaffold.cleanup()
    throw err
  }
  const elapsedMs = Date.now() - start

  scaffold.cleanup()

  const stats = collectBuildStats(buildOutput)

  return {
    outDir: opts.previewOutDir,
    entryHtml: 'index.html',
    elapsedMs,
    assetCount: stats.assetCount,
    totalBytes: stats.totalBytes,
  }
}

function collectBuildStats(
  output: RollupOutput | RollupOutput[] | RollupWatcher,
): { assetCount: number; totalBytes: number } {
  // Watch mode 미사용 — `close` 메서드 존재 여부로 식별.
  if ('close' in output) {
    return { assetCount: 0, totalBytes: 0 }
  }
  const outputs: RollupOutput[] = Array.isArray(output) ? output : [output]
  let assetCount = 0
  let totalBytes = 0
  for (const out of outputs) {
    for (const file of out.output) {
      assetCount += 1
      if ('source' in file) {
        const src = file.source
        totalBytes += typeof src === 'string' ? Buffer.byteLength(src) : src.byteLength
      } else if ('code' in file) {
        totalBytes += Buffer.byteLength(file.code)
      }
    }
  }
  return { assetCount, totalBytes }
}

// resolve import unused — keep for potential future use. Linter satisfaction.
void resolve
