/**
 * `jogak dev` 명령 구현.
 *
 * `@jogak/ui/host`의 `runHost()`를 호출하는 얇은 어댑터다.
 * Vite/React 의존을 직접 import하지 않고, host 모듈을 통해 dynamic import 경로
 * 위에서 모두 처리되도록 위임한다.
 */

import { generateRegistryFile } from '@jogak/core/build'
import type { UserViteOptions } from '@jogak/core'
import type {
  DevHandle,
  JogakDevOptions,
} from '@jogak/ui/host'
import { runHost } from '@jogak/ui/host'
import { spawnUserVite } from '../spawn-user-vite.js'

export interface DevCliArgs {
  readonly patterns: readonly string[]
  readonly port: number
  readonly host: string | boolean
  readonly open: boolean | string
  readonly cwd: string
  readonly tsConfigFilePath: string | undefined
  readonly codeTheme: string
  readonly noGenerate: boolean
  /** 알파.7: 사용자 globalCss 옵션 (config 또는 CLI flag로 결정). */
  readonly globalCss?: boolean | string | readonly string[]
  /** 알파.7: preview 격리 모드. */
  readonly previewIsolation: 'none' | 'shadow' | 'iframe'
  /** 알파.8: 사용자 vite spawn 옵션 (config 파일에서만 결정). */
  readonly userVite?: UserViteOptions
}

/**
 * dev 모드 실행.
 *
 * 1. `--no-generate`가 아니면 `generateRegistryFile`을 fire-and-forget으로 시작.
 *    실패해도 dev 진행 (가상 모듈로 작동하므로).
 * 2. `runHost`에 dev 옵션 위임.
 * 3. `printUrls()` 출력 후 SIGINT/SIGTERM 핸들러 등록.
 */
export async function runDevCommand(args: DevCliArgs): Promise<void> {
  // dev는 가상 모듈로 처리되므로 generate는 IDE 타입체크용 안전망일 뿐.
  // blocking으로 두면 큰 카탈로그(500+)에서 cold start 지연 → fire-and-forget으로 둠.
  if (!args.noGenerate) {
    const generateStart = Date.now()
    const generatePromise = generateRegistryFile(
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
    void generatePromise.then(
      (result) => {
        const elapsedMs = Date.now() - generateStart
        process.stdout.write(
          `[jogak] registry regenerated (${result.fileCount.toString()} files, ${elapsedMs.toString()}ms)\n`,
        )
      },
      (err: unknown) => {
        // best-effort: dev에서 가상 모듈을 사용하므로 generate 실패는 치명적이지 않음.
        const message = err instanceof Error ? err.message : String(err)
        process.stderr.write(`[jogak] generate skipped: ${message}\n`)
      },
    )
  }

  // 알파.8: previewIsolation === 'iframe'인 경우(default)에만 사용자 vite spawn.
  // 'shadow'/'none'은 deprecated 경로 — fallback 모드와 동일하게 jogak SPA만 시작.
  let userVite: { url: string; port: number; close(): Promise<void> } | undefined
  if (args.previewIsolation === 'iframe') {
    userVite = await spawnUserVite({
      cwd: args.cwd,
      ...(args.userVite !== undefined ? { userVite: args.userVite } : {}),
      ...(args.globalCss !== undefined ? { globalCss: args.globalCss } : {}),
    })
    if (userVite !== undefined) {
      process.stdout.write(`[jogak] user vite ready: ${userVite.url}\n`)
    }
  }

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
    // 알파.7: host 통로로 plugin 옵션 전달.
    ...(args.globalCss !== undefined ? { globalCss: args.globalCss } : {}),
    previewIsolation: args.previewIsolation,
    ...(userVite !== undefined ? { userViteUrl: userVite.url } : {}),
  }

  const handle: DevHandle = await runHost(devOptions)
  handle.printUrls()

  // 종료 핸들러 — close()는 멱등이지만 한 번만 호출되도록 가드.
  let shuttingDown = false
  const shutdown = (): void => {
    if (shuttingDown) return
    shuttingDown = true
    Promise.all([
      handle.close(),
      userVite !== undefined ? userVite.close() : Promise.resolve(),
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
