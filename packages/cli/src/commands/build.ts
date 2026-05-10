/**
 * `jogak build` 명령 구현.
 *
 * 알파.11: builder-agnostic build dispatch. 흐름:
 * 1. detectBuilder(cwd)로 사용자 빌더 식별
 * 2. runHost({ mode: 'build', outDir })로 jogak chrome SPA를 outDir/에 emit
 * 3. (standalone 외) loadAdapter + adapter.build({ previewOutDir: outDir/preview })로
 *    사용자 빌더가 preview 산출물을 outDir/preview/에 emit (사용자 plugins/Tailwind 적용)
 * 4. iframe src는 './preview/{adapter.previewEntryMeta.buildEntryName}'로 자동 설정
 *
 * standalone은 사용자 빌더 없이 jogak host vite scope의 preview-frame.html을 그대로 활용.
 */

import { resolve } from 'node:path'
import { generateRegistryFile } from '@jogak/core/build'
import type {
  BuilderAdapter,
  BuilderName,
  BuildResult as AdapterBuildResult,
} from '@jogak/core'
import { detectBuilder } from '@jogak/core/server'
import type {
  BuildResult,
  JogakBuildOptions,
} from '@jogak/ui/host'
import { runHost } from '@jogak/ui/host'
import { loadAdapter } from '../load-adapter.js'

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
  /** 알파.7: 사용자 globalCss 옵션 (config 또는 CLI flag로 결정). */
  readonly globalCss?: boolean | string | readonly string[]
  /** 알파.7: preview 격리 모드. */
  readonly previewIsolation: 'none' | 'shadow' | 'iframe'
  /** 알파.11: 빌더 명시 (자동 감지가 default). */
  readonly builder?: BuilderName | undefined
}

export async function runBuildCommand(args: BuildCliArgs): Promise<void> {
  if (args.emitRegistry) {
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
    process.stdout.write(
      `[jogak] registry regenerated (${result.fileCount.toString()} files)\n`,
    )
  }

  const builderName: Exclude<BuilderName, 'custom'> =
    args.builder !== undefined && args.builder !== 'custom'
      ? args.builder
      : detectBuilder(args.cwd).name
  process.stdout.write(`[jogak] builder detected: ${builderName}\n`)

  const outDirAbs = resolve(args.cwd, args.outDir)
  const previewOutDirAbs = resolve(outDirAbs, 'preview')

  // chrome iframe src 결정 — standalone은 host의 preview-frame.html, 그 외는 ./preview/{...}
  const userPreviewUrlBuild =
    builderName === 'standalone' ? '' : './preview'
  const previewEntryPathBuild =
    builderName === 'standalone'
      ? '/preview-frame.html'
      : `/${getBuildEntryName(builderName)}`

  // ── 1) chrome SPA 빌드 (outDir에 emit) ────────────────────
  const buildOptions: JogakBuildOptions = {
    mode: 'build',
    userRoot: args.cwd,
    patterns: args.patterns,
    codeTheme: args.codeTheme,
    outDir: outDirAbs,
    base: args.base,
    minify: args.minify,
    sourcemap: args.sourcemap,
    ...(args.tsConfigFilePath !== undefined
      ? { tsConfigFilePath: args.tsConfigFilePath }
      : {}),
    ...(args.globalCss !== undefined ? { globalCss: args.globalCss } : {}),
    previewIsolation: args.previewIsolation,
    ...(userPreviewUrlBuild !== ''
      ? { userPreviewUrl: userPreviewUrlBuild, previewEntryPath: previewEntryPathBuild }
      : {}),
  }

  const hostResult: BuildResult = await runHost(buildOptions)
  process.stdout.write(
    `[jogak] host build done — ${hostResult.outDir} (${hostResult.assetCount.toString()} files, ${hostResult.elapsedMs.toString()}ms)\n`,
  )

  // ── 2) adapter build (preview 산출물을 outDir/preview에 emit) ─
  let adapterStats: AdapterBuildResult | undefined
  if (builderName !== 'standalone') {
    let adapter: BuilderAdapter
    try {
      adapter = await loadAdapter(builderName, args.cwd)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(
        `[jogak] adapter '${builderName}' load failed: ${message}\n` +
          `[jogak] preview 산출물이 비어있는 build가 emit됐습니다 (chrome only).\n`,
      )
      printSummary(hostResult, undefined)
      return
    }

    try {
      adapterStats = await adapter.build({
        cwd: args.cwd,
        previewOutDir: previewOutDirAbs,
        ...(args.globalCss !== undefined ? { globalCss: args.globalCss } : {}),
      })
      process.stdout.write(
        `[jogak] preview build done — ${adapterStats.outDir} (${adapterStats.assetCount.toString()} files, ${adapterStats.elapsedMs.toString()}ms)\n`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(
        `[jogak] adapter '${builderName}' build failed: ${message}\n` +
          `[jogak] preview 산출물이 비어있는 build가 emit됐습니다 (chrome only).\n`,
      )
    }
  } else {
    process.stdout.write(
      `[jogak] standalone mode: chrome host vite가 preview-frame.html을 함께 bundle.\n`,
    )
  }

  printSummary(hostResult, adapterStats)
}

function getBuildEntryName(
  builderName: Exclude<BuilderName, 'custom' | 'standalone'>,
): string {
  switch (builderName) {
    case 'vite':
      return 'index.html'
    case 'next':
      return 'jogak-preview/index.html'
    case 'webpack':
      return '__jogak_preview__/index.html'
  }
}

function printSummary(
  host: BuildResult,
  adapter: AdapterBuildResult | undefined,
): void {
  const totalFiles = host.assetCount + (adapter?.assetCount ?? 0)
  const totalBytes = host.totalBytes + (adapter?.totalBytes ?? 0)
  const totalMs = host.elapsedMs + (adapter?.elapsedMs ?? 0)
  process.stdout.write(
    `[jogak] build complete — ${host.outDir} (${totalFiles.toString()} files, ${totalBytes.toString()} bytes, ${totalMs.toString()}ms)\n`,
  )
}
