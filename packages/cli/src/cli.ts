#!/usr/bin/env node
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { generateRegistryFile } from '@jogak/core/build'
import { runDevCommand, type DevCliArgs } from './commands/dev.js'
import { runBuildCommand, type BuildCliArgs } from './commands/build.js'

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
  if (v === undefined) return 'localhost'
  if (v === true) return true // bare --host → enable
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}

function parseOpenFlag(v: string | true | undefined): boolean | string {
  if (v === undefined) return false
  if (v === true) return true
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}

function parsePortFlag(v: string | true | undefined): number {
  if (typeof v !== 'string') return 5173
  const n = Number(v)
  if (!Number.isFinite(n)) {
    process.stderr.write(`[jogak] invalid --port: ${v}\n`)
    process.exit(1)
  }
  return n
}

function parseMinifyFlag(
  v: string | true | undefined,
): boolean | 'esbuild' | 'terser' {
  if (v === undefined) return 'esbuild'
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

function parseBaseFlag(v: string | true | undefined): string {
  const raw = asString(v, './')
  if (!raw.startsWith('/') && raw !== './' && !raw.startsWith('./')) {
    process.stderr.write(
      `[jogak] warning: --base "${raw}" does not start with '/' or './' — typo?\n`,
    )
  }
  return raw
}

function help(): void {
  process.stdout.write(`jogak — component showcase

USAGE
  jogak generate [options]         (alias: gen)  사용자 프로젝트에 .jogak/registry.ts 생성
  jogak dev [options]              쇼케이스 dev server 실행
  jogak build [options]            쇼케이스 정적 빌드

COMMON OPTIONS
  --patterns <glob[,glob...]>      쇼케이스 파일 글롭 (기본: 'src/**/*.jogak.ts,src/**/*.jogak.tsx')
  --cwd <path>                     사용자 프로젝트 루트 (기본: process.cwd())
  --ts-config <path>               tsconfig 경로 (기본: '<cwd>/tsconfig.json' 자동 감지)
  --code-theme <name>              prism 테마 (기본: 'vsDark')
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
  --emit-registry                  build 도중 .jogak/registry.ts도 생성 (기본: false)
`)
}

async function runGenerate(args: ParsedArgs): Promise<void> {
  const cwd = resolve(asString(args.flags['cwd'], process.cwd()))
  const patterns = parsePatterns(args.flags['patterns'])
  const outFile = asString(args.flags['out'], '.jogak/registry.ts')

  const tsConfigFilePath = resolveTsConfig(cwd, args.flags['ts-config'])

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

function parseDevArgs(parsed: ParsedArgs): DevCliArgs {
  const cwd = resolve(asString(parsed.flags['cwd'], process.cwd()))
  const patterns = parsePatterns(parsed.flags['patterns'])
  const tsConfigFilePath = resolveTsConfig(cwd, parsed.flags['ts-config'])

  return {
    patterns,
    port: parsePortFlag(parsed.flags['port']),
    host: parseHostFlag(parsed.flags['host']),
    open: parseOpenFlag(parsed.flags['open']),
    cwd,
    tsConfigFilePath,
    codeTheme: asString(parsed.flags['code-theme'], 'vsDark'),
    noGenerate: parseBoolFlag(parsed.flags['no-generate'], false),
  }
}

function parseBuildArgs(parsed: ParsedArgs): BuildCliArgs {
  const cwd = resolve(asString(parsed.flags['cwd'], process.cwd()))
  const patterns = parsePatterns(parsed.flags['patterns'])
  const tsConfigFilePath = resolveTsConfig(cwd, parsed.flags['ts-config'])

  const outDirRaw = asString(parsed.flags['out-dir'], 'jogak-static')
  const outDir = resolve(cwd, outDirRaw)

  return {
    patterns,
    outDir,
    base: parseBaseFlag(parsed.flags['base']),
    cwd,
    tsConfigFilePath,
    codeTheme: asString(parsed.flags['code-theme'], 'vsDark'),
    minify: parseMinifyFlag(parsed.flags['minify']),
    sourcemap: parseBoolFlag(parsed.flags['sourcemap'], false),
    emitRegistry: parseBoolFlag(parsed.flags['emit-registry'], false),
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

  if (command === 'generate' || command === 'gen') {
    await runGenerate(parsed)
    return
  }

  if (command === 'dev') {
    await runDevCommand(parseDevArgs(parsed))
    return
  }

  if (command === 'build') {
    await runBuildCommand(parseBuildArgs(parsed))
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
