#!/usr/bin/env node
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { generateRegistryFile } from '@jogak/core/build'
import type { JogakConfig } from '@jogak/core'
import { runDevCommand, type DevCliArgs } from './commands/dev.js'
import { runBuildCommand, type BuildCliArgs } from './commands/build.js'
import { loadJogakConfig } from './config-loader.js'

interface ParsedArgs {
  readonly _: readonly string[]
  readonly flags: Readonly<Record<string, string | true>>
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = []
  const flags: Record<string, string | true> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === undefined) continue
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    } else {
      positional.push(a)
    }
  }
  return { _: positional, flags }
}

function asString(v: string | true | undefined, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

function parsePatterns(v: string | true | undefined): readonly string[] {
  const raw = asString(v, 'src/**/*.jogak.ts,src/**/*.jogak.tsx')
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

function resolveTsConfig(cwd: string, v: string | true | undefined): string | undefined {
  const candidate =
    typeof v === 'string' ? resolve(cwd, v) : resolve(cwd, 'tsconfig.json')
  return existsSync(candidate) ? candidate : undefined
}

function parseHostFlag(v: string | true | undefined): string | boolean {
  if (v === true) return true // bare --host → enable
  if (v === 'true') return true
  if (v === 'false') return false
  if (typeof v === 'string') return v
  return 'localhost'
}

function parseOpenFlag(v: string | true | undefined): boolean | string {
  if (v === true) return true
  if (v === 'true') return true
  if (v === 'false') return false
  if (typeof v === 'string') return v
  return false
}

function parsePortFlag(v: string): number {
  const n = Number(v)
  if (!Number.isFinite(n)) {
    process.stderr.write(`[jogak] invalid --port: ${v}\n`)
    process.exit(1)
  }
  return n
}

function parseMinifyFlag(v: string | true): boolean | 'esbuild' | 'terser' {
  if (v === true) return true
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'esbuild' || v === 'terser') return v
  process.stderr.write(`[jogak] invalid --minify: ${v} (expected true|false|esbuild|terser)\n`)
  process.exit(1)
}

function parseBoolFlag(v: string | true | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback
  if (v === true) return true
  if (v === 'true') return true
  if (v === 'false') return false
  return fallback
}

function parseBaseFlag(v: string): string {
  if (!v.startsWith('/') && v !== './' && !v.startsWith('./')) {
    process.stderr.write(
      `[jogak] warning: --base "${v}" does not start with '/' or './' — typo?\n`,
    )
  }
  return v
}

/**
 * 알파.7: `--global-css` 플래그 normalizer.
 * - 미지정 → fileValue 그대로 (config 또는 undefined)
 * - bare `--global-css` 또는 `--global-css true` → true
 * - `--global-css false` → false
 * - `--global-css <path>` → 명시 경로 (string 1개)
 */
function parseGlobalCssFlag(
  v: string | true | undefined,
  fileValue: boolean | string | readonly string[] | undefined,
): boolean | string | readonly string[] | undefined {
  if (v === undefined) return fileValue
  if (v === true) return true
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}

/**
 * 알파.8: `--preview-isolation` 플래그 normalizer.
 * - 미지정 → fileValue ?? 'iframe' (알파.8 default 변경, 사용자 vite 통합)
 * - 'none'|'shadow'|'iframe' → 그대로
 * - 그 외 → exit 1
 *
 * 'shadow'/'none'은 deprecated — warning 출력.
 */
function parsePreviewIsolationFlag(
  v: string | true | undefined,
  fileValue: 'none' | 'shadow' | 'iframe' | undefined,
): 'none' | 'shadow' | 'iframe' {
  if (v === undefined || v === true) {
    const resolved = fileValue ?? 'iframe'
    if (resolved === 'shadow' || resolved === 'none') {
      process.stderr.write(
        `[jogak] previewIsolation '${resolved}' is deprecated in alpha.8 (사용자 utility 미적용 한계). 'iframe' 권장.\n`,
      )
    }
    return resolved
  }
  if (v === 'none' || v === 'shadow' || v === 'iframe') {
    if (v === 'shadow' || v === 'none') {
      process.stderr.write(
        `[jogak] previewIsolation '${v}' is deprecated in alpha.8. 'iframe' 권장.\n`,
      )
    }
    return v
  }
  process.stderr.write(
    `[jogak] invalid --preview-isolation: ${v} (expected none|shadow|iframe)\n`,
  )
  process.exit(1)
}

function help(): void {
  process.stdout.write(`jogak — component showcase

USAGE
  jogak generate [options]         (alias: gen)  사용자 프로젝트에 .jogak/registry.ts 생성
  jogak dev [options]              쇼케이스 dev server 실행
  jogak build [options]            쇼케이스 정적 빌드

COMMON OPTIONS
  --config <path>                  jogak.config 경로 (기본: '<cwd>/jogak.config.{ts,mts,mjs,js,json}' 자동 감지)
  --patterns <glob[,glob...]>      쇼케이스 파일 글롭 (기본: 'src/**/*.jogak.ts,src/**/*.jogak.tsx')
  --cwd <path>                     사용자 프로젝트 루트 (기본: process.cwd())
  --ts-config <path>               tsconfig 경로 (기본: '<cwd>/tsconfig.json' 자동 감지)
  --code-theme <name>              prism 테마 (기본: 'vsDark')
  --global-css [true|false|path]   사용자 globalCss 적용 (알파.7, 기본: jogak.config 또는 false)
  --preview-isolation <mode>       preview 격리 (none|shadow|iframe, 알파.7, 기본: 'none')
  --help                           도움말 출력

generate OPTIONS
  --out <path>                     출력 파일 경로 (기본: '.jogak/registry.ts')

dev OPTIONS
  --port <number>                  dev server 포트 (기본: 5173)
  --host <string|true|false>       bind host (기본: 'localhost', '0.0.0.0' 또는 'true'로 LAN 노출)
  --open [path]                    시작 시 브라우저 자동 오픈 (기본: false)
  --no-generate                    시작 전 generate 1회 실행 비활성화

build OPTIONS
  --out-dir <path>                 출력 디렉토리 (기본: 'jogak-static')
  --base <string>                  public path (기본: './')
  --minify <mode>                  true|false|esbuild|terser (기본: esbuild)
  --sourcemap                      소스맵 생성 (기본: false)
  --emit-registry                  (deprecated, 알파.11부터 항상 생성)
`)
}

async function runGenerate(args: ParsedArgs, fileConfig: JogakConfig): Promise<void> {
  const cwd = resolve(asString(args.flags['cwd'], process.cwd()))
  const cliPatterns = args.flags['patterns']
  const patterns =
    cliPatterns !== undefined
      ? parsePatterns(cliPatterns)
      : fileConfig.patterns ?? ['src/**/*.jogak.ts', 'src/**/*.jogak.tsx']
  const outFile = asString(args.flags['out'], '.jogak/registry.ts')

  const tsConfigFlag = args.flags['ts-config']
  const tsConfigFilePath =
    typeof tsConfigFlag === 'string'
      ? resolveTsConfig(cwd, tsConfigFlag)
      : fileConfig.tsConfigFilePath ?? resolveTsConfig(cwd, undefined)

  const start = Date.now()
  const result = await generateRegistryFile(
    tsConfigFilePath !== undefined
      ? { patterns, cwd, outFile, tsConfigFilePath }
      : { patterns, cwd, outFile },
  )
  const elapsed = Date.now() - start
  process.stdout.write(
    `[jogak] generated ${result.outFile}  (${result.fileCount.toString()} files, ${elapsed.toString()}ms)\n`,
  )
}

function parseDevArgs(parsed: ParsedArgs, fileConfig: JogakConfig): DevCliArgs {
  const cwd = resolve(asString(parsed.flags['cwd'], process.cwd()))

  const cliPatterns = parsed.flags['patterns']
  const patterns =
    cliPatterns !== undefined
      ? parsePatterns(cliPatterns)
      : fileConfig.patterns ?? ['src/**/*.jogak.ts', 'src/**/*.jogak.tsx']

  const tsConfigFlag = parsed.flags['ts-config']
  const tsConfigFilePath =
    typeof tsConfigFlag === 'string'
      ? resolveTsConfig(cwd, tsConfigFlag)
      : fileConfig.tsConfigFilePath ?? resolveTsConfig(cwd, undefined)

  const portFlag = parsed.flags['port']
  const port =
    typeof portFlag === 'string'
      ? parsePortFlag(portFlag)
      : fileConfig.port ?? 5173

  const hostFlag = parsed.flags['host']
  const host =
    hostFlag !== undefined
      ? parseHostFlag(hostFlag)
      : fileConfig.host ?? 'localhost'

  const openFlag = parsed.flags['open']
  const open =
    openFlag !== undefined
      ? parseOpenFlag(openFlag)
      : fileConfig.open ?? false

  const codeThemeFlag = parsed.flags['code-theme']
  const codeTheme =
    typeof codeThemeFlag === 'string'
      ? codeThemeFlag
      : fileConfig.codeTheme ?? 'vsDark'

  const globalCss = parseGlobalCssFlag(
    parsed.flags['global-css'],
    fileConfig.globalCss,
  )

  return {
    patterns,
    port,
    host,
    open,
    cwd,
    tsConfigFilePath,
    codeTheme,
    noGenerate: parseBoolFlag(parsed.flags['no-generate'], false),
    // exactOptionalPropertyTypes 컨벤션: undefined는 spread로 분기.
    ...(globalCss !== undefined ? { globalCss } : {}),
    previewIsolation: parsePreviewIsolationFlag(
      parsed.flags['preview-isolation'],
      fileConfig.previewIsolation,
    ),
    // 알파.8 alias (deprecated): userVite — jogak.config.ts에만 노출.
    ...(fileConfig.userVite !== undefined ? { userVite: fileConfig.userVite } : {}),
    // 알파.9: builder/builderOptions — jogak.config.ts에만 노출 (CLI flag 미노출).
    ...(fileConfig.builder !== undefined ? { builder: fileConfig.builder } : {}),
    ...(fileConfig.builderOptions !== undefined ? { builderOptions: fileConfig.builderOptions } : {}),
  }
}

function parseBuildArgs(parsed: ParsedArgs, fileConfig: JogakConfig): BuildCliArgs {
  const cwd = resolve(asString(parsed.flags['cwd'], process.cwd()))

  const cliPatterns = parsed.flags['patterns']
  const patterns =
    cliPatterns !== undefined
      ? parsePatterns(cliPatterns)
      : fileConfig.patterns ?? ['src/**/*.jogak.ts', 'src/**/*.jogak.tsx']

  const tsConfigFlag = parsed.flags['ts-config']
  const tsConfigFilePath =
    typeof tsConfigFlag === 'string'
      ? resolveTsConfig(cwd, tsConfigFlag)
      : fileConfig.tsConfigFilePath ?? resolveTsConfig(cwd, undefined)

  const outDirFlag = parsed.flags['out-dir']
  const outDirRaw =
    typeof outDirFlag === 'string'
      ? outDirFlag
      : fileConfig.outDir ?? 'jogak-static'
  const outDir = resolve(cwd, outDirRaw)

  const baseFlag = parsed.flags['base']
  const base =
    typeof baseFlag === 'string'
      ? parseBaseFlag(baseFlag)
      : fileConfig.base ?? './'

  const minifyFlag = parsed.flags['minify']
  const minify =
    minifyFlag !== undefined
      ? parseMinifyFlag(minifyFlag)
      : fileConfig.minify ?? 'esbuild'

  const sourcemapFlag = parsed.flags['sourcemap']
  const sourcemap =
    sourcemapFlag !== undefined
      ? parseBoolFlag(sourcemapFlag, false)
      : fileConfig.sourcemap ?? false

  const codeThemeFlag = parsed.flags['code-theme']
  const codeTheme =
    typeof codeThemeFlag === 'string'
      ? codeThemeFlag
      : fileConfig.codeTheme ?? 'vsDark'

  const globalCss = parseGlobalCssFlag(
    parsed.flags['global-css'],
    fileConfig.globalCss,
  )

  return {
    patterns,
    outDir,
    base,
    cwd,
    tsConfigFilePath,
    codeTheme,
    minify,
    sourcemap,
    emitRegistry: parseBoolFlag(parsed.flags['emit-registry'], false),
    // exactOptionalPropertyTypes 컨벤션: undefined는 spread로 분기.
    ...(globalCss !== undefined ? { globalCss } : {}),
    previewIsolation: parsePreviewIsolationFlag(
      parsed.flags['preview-isolation'],
      fileConfig.previewIsolation,
    ),
    // 알파.13: builderOptions를 build adapter에 그대로 전달 (next: { rsc } 등).
    ...(fileConfig.builderOptions !== undefined
      ? { builderOptions: fileConfig.builderOptions }
      : {}),
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    help()
    return
  }

  const command = argv[0]
  const rest = argv.slice(1)
  const parsed = parseArgs(rest)

  // 알파.7: jogak.config.* 자동 발견 + 로드. CLI 플래그가 override.
  const cwd = resolve(asString(parsed.flags['cwd'], process.cwd()))
  const explicitConfig =
    typeof parsed.flags['config'] === 'string' ? parsed.flags['config'] : undefined
  const { path: configPath, config: fileConfig } = await loadJogakConfig(
    cwd,
    explicitConfig,
  )
  if (configPath !== undefined) {
    process.stdout.write(`[jogak] config loaded: ${configPath}\n`)
  }

  if (command === 'generate' || command === 'gen') {
    await runGenerate(parsed, fileConfig)
    return
  }

  if (command === 'dev') {
    await runDevCommand(parseDevArgs(parsed, fileConfig))
    return
  }

  if (command === 'build') {
    await runBuildCommand(parseBuildArgs(parsed, fileConfig))
    return
  }

  process.stderr.write(`Unknown command: ${command ?? ''}\n\n`)
  help()
  process.exit(1)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
