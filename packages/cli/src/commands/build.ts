/**
 * `jogak build` 명령 구현.
 *
 * `@jogak/ui/host`의 `runHost()`를 build 모드로 호출하고 결과 통계를 출력한다.
 * 실패 시 예외는 main 핸들러로 전파되어 exit code 1을 만든다.
 */

import { generateRegistryFile } from '@jogak/core/build'
import type {
  BuildResult,
  JogakBuildOptions,
} from '@jogak/ui/host'
import { runHost } from '@jogak/ui/host'

export interface BuildCliArgs {
  readonly patterns: readonly string[]
  readonly outDir: string
  readonly base: string
  readonly cwd: string
  readonly tsConfigFilePath: string | undefined
  readonly codeTheme: string
  readonly minify: boolean | 'esbuild' | 'terser'
  readonly sourcemap: boolean
  readonly emitRegistry: boolean
}

export async function runBuildCommand(args: BuildCliArgs): Promise<void> {
  if (args.emitRegistry) {
    await generateRegistryFile(
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
  }

  const buildOptions: JogakBuildOptions = {
    mode: 'build',
    userRoot: args.cwd,
    patterns: args.patterns,
    codeTheme: args.codeTheme,
    outDir: args.outDir,
    base: args.base,
    minify: args.minify,
    sourcemap: args.sourcemap,
    ...(args.tsConfigFilePath !== undefined
      ? { tsConfigFilePath: args.tsConfigFilePath }
      : {}),
  }

  const result: BuildResult = await runHost(buildOptions)

  process.stdout.write(
    `[jogak] build done — ${result.outDir} (${result.assetCount.toString()} files, ${result.totalBytes.toString()} bytes, ${result.elapsedMs.toString()}ms)\n`,
  )
}
