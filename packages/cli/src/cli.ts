#!/usr/bin/env node
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { generateRegistryFile } from '@jogak/core/build'

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

function help(): void {
  process.stdout.write(`jogak — component showcase codegen

USAGE
  jogak generate [options]
  jogak gen [options]              (alias)

OPTIONS
  --patterns <glob[,glob...]>      쇼케이스 파일 글롭 (기본: 'src/**/*.jogak.ts,src/**/*.jogak.tsx')
  --out <path>                     출력 파일 경로 (기본: '.jogak/registry.ts')
  --cwd <path>                     작업 디렉토리 (기본: process.cwd())
  --ts-config <path>               tsconfig 경로 (기본: 'tsconfig.json')
  --help                           도움말 출력
`)
}

async function runGenerate(args: ParsedArgs): Promise<void> {
  const cwd = resolve(asString(args.flags['cwd'], process.cwd()))
  const patternsArg = asString(args.flags['patterns'], 'src/**/*.jogak.ts,src/**/*.jogak.tsx')
  const patterns = patternsArg.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
  const outFile = asString(args.flags['out'], '.jogak/registry.ts')

  const tsConfigArg = args.flags['ts-config']
  const tsConfigCandidate =
    typeof tsConfigArg === 'string' ? resolve(cwd, tsConfigArg) : resolve(cwd, 'tsconfig.json')
  const tsConfigFilePath = existsSync(tsConfigCandidate) ? tsConfigCandidate : undefined

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

  process.stderr.write(`Unknown command: ${command ?? ''}\n\n`)
  help()
  process.exit(1)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
