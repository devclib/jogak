/**
 * `jogak dev` 명령 구현.
 *
 * 알파.9: builder-agnostic adapter dispatch.
 * 1. detectBuilder로 사용자 cwd의 빌더 감지 (또는 명시 옵션)
 * 2. loadAdapter로 해당 어댑터 dynamic import
 * 3. adapter.spawnDev로 사용자 빌더의 dev server 시작
 * 4. runHost로 jogak SPA 시작 (adapter dev URL을 iframe src base로)
 */

import { generateRegistryFile } from '@jogak/core/build'
import type { BuilderAdapter, BuilderName, DevHandle as AdapterDevHandle, UserViteOptions } from '@jogak/core'
import { detectBuilder } from '@jogak/core/server'
import type {
  DevHandle,
  JogakDevOptions,
} from '@jogak/ui/host'
import { runHost } from '@jogak/ui/host'
import { loadAdapter } from '../load-adapter.js'

export interface DevCliArgs {
  readonly patterns: readonly string[]
  readonly port: number
  readonly host: string | boolean
  readonly open: boolean | string
  readonly cwd: string
  readonly tsConfigFilePath: string | undefined
  readonly codeTheme: string
  readonly noGenerate: boolean
  /** 알파.7: 사용자 globalCss 옵션. */
  readonly globalCss?: boolean | string | readonly string[]
  /** 알파.7: preview 격리 모드. */
  readonly previewIsolation: 'none' | 'shadow' | 'iframe'
  /** @deprecated 알파.8 alias. 알파.9에서는 builder/builderOptions로 마이그. */
  readonly userVite?: UserViteOptions
  /** 알파.9: 빌더 명시 (자동 감지가 default). */
  readonly builder?: BuilderName | undefined
  /** 알파.9: 어댑터별 추가 옵션. */
  readonly builderOptions?: Readonly<Record<string, unknown>>
}

export async function runDevCommand(args: DevCliArgs): Promise<void> {
  if (!args.noGenerate) {
    const generateStart = Date.now()
    try {
      const result = await generateRegistryFile(
        args.tsConfigFilePath !== undefined
          ? {
              patterns: args.patterns,
              cwd: args.cwd,
              outFile: '.jogak/registry.ts',
              tsConfigFilePath: args.tsConfigFilePath,
            }
          : {
              patterns: args.patterns,
              cwd: args.cwd,
              outFile: '.jogak/registry.ts',
            },
      )
      const elapsedMs = Date.now() - generateStart
      process.stdout.write(
        `[jogak] registry regenerated (${result.fileCount.toString()} files, ${elapsedMs.toString()}ms)\n`,
      )
      // 1.0.0-beta.5: 첫 5분 UX — .jogak.{ts,tsx} 없이 dev 실행 시 명확 안내.
      // sidebar empty state는 SPA에서 보이지만 터미널에서도 즉시 알림.
      if (result.fileCount === 0) {
        const patternsHint = args.patterns !== undefined
          ? args.patterns.join(', ')
          : 'src/**/*.jogak.{ts,tsx}'
        process.stdout.write(
          `[jogak] no .jogak.{ts,tsx} files found (patterns: ${patternsHint}).\n` +
            `[jogak] create one next to a component to see it in the sidebar. Guide: https://jogak.dev/en/docs\n`,
        )
      }
    } catch (err: unknown) {
      // 생성 실패해도 host는 띄울 수 있게 하되, non-vite 어댑터는 빈 registry로 동작.
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(`[jogak] generate skipped: ${message}\n`)
    }
  }

  // 알파.9: 빌더 감지 + 어댑터 dispatch
  const builderName: Exclude<BuilderName, 'custom'> =
    args.builder !== undefined && args.builder !== 'custom'
      ? args.builder
      : detectBuilder(args.cwd).name
  process.stdout.write(`[jogak] builder detected: ${builderName}\n`)

  // 알파.8 userVite alias → builderOptions 변환
  const builderOptions =
    args.builderOptions ??
    (args.userVite !== undefined && builderName === 'vite'
      ? (args.userVite as Readonly<Record<string, unknown>>)
      : undefined)

  // previewIsolation === 'iframe'(default)에서만 어댑터 spawn.
  // standalone은 spawn 자체를 throw하므로 catch + fallback.
  let adapter: BuilderAdapter | undefined
  let adapterHandle: AdapterDevHandle | undefined
  if (args.previewIsolation === 'iframe' && builderName !== 'standalone') {
    try {
      adapter = await loadAdapter(builderName, args.cwd)
      adapterHandle = await adapter.spawnDev({
        cwd: args.cwd,
        ...(args.globalCss !== undefined ? { globalCss: args.globalCss } : {}),
        ...(builderOptions !== undefined ? { extra: builderOptions } : {}),
      })
      process.stdout.write(`[jogak] ${builderName} adapter dev: ${adapterHandle.url}\n`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(
        `[jogak] adapter '${builderName}' spawn failed: ${message}\n` +
          `[jogak] fallback: jogak SPA만 시작 (사용자 utility 미컴파일).\n`,
      )
    }
  } else if (builderName === 'standalone') {
    process.stdout.write(
      `[jogak] standalone mode: 사용자 utility는 사용자가 사전 빌드한 css에 한정.\n`,
    )
  }

  const previewEntryPath = adapter?.previewEntryMeta.devEntryPath ?? '/preview-frame.html'

  const devOptions: JogakDevOptions = {
    mode: 'dev',
    userRoot: args.cwd,
    patterns: args.patterns,
    codeTheme: args.codeTheme,
    port: args.port,
    host: args.host,
    open: args.open,
    ...(args.tsConfigFilePath !== undefined
      ? { tsConfigFilePath: args.tsConfigFilePath }
      : {}),
    ...(args.globalCss !== undefined ? { globalCss: args.globalCss } : {}),
    previewIsolation: args.previewIsolation,
    ...(adapterHandle !== undefined
      ? { userPreviewUrl: adapterHandle.url, previewEntryPath }
      : {}),
  }

  const handle: DevHandle = await runHost(devOptions)
  handle.printUrls()

  let shuttingDown = false
  const shutdown = (): void => {
    if (shuttingDown) return
    shuttingDown = true
    Promise.all([
      handle.close(),
      adapterHandle !== undefined ? adapterHandle.close() : Promise.resolve(),
    ])
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        process.stderr.write(`[jogak] dev close error: ${message}\n`)
      })
      .finally(() => {
        process.exit(0)
      })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
