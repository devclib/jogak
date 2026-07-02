#!/usr/bin/env node
/**
 * @jogak/codemod CLI.
 *
 * ```
 * jogak-codemod [--write] [--verbose] <pattern>...
 * ```
 *
 * Flags:
 * - `--write`   변환된 소스를 파일에 저장 + `.stories.tsx` → `.jogak.tsx` 이름 변경 (destructive, 명시 opt-in)
 * - `--dry`     기본값. 변환 결과 log만 출력, 파일 미변경
 * - `--verbose` 각 파일별 변경 통계 출력
 * - `<pattern>` glob 패턴 (하나 이상). 예: `src/**\/*.stories.tsx`
 */

import { readFile, writeFile, rename } from 'node:fs/promises'
import { relative, resolve, dirname, basename } from 'node:path'
import { transformSource } from './transform.js'

interface CliArgs {
  readonly patterns: readonly string[]
  readonly write: boolean
  readonly verbose: boolean
}

function parseArgs(argv: readonly string[]): CliArgs {
  const patterns: string[] = []
  let write = false
  let verbose = false
  for (const arg of argv) {
    if (arg === '--write') write = true
    else if (arg === '--dry') write = false
    else if (arg === '--verbose' || arg === '-v') verbose = true
    else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else if (arg.startsWith('--')) {
      process.stderr.write(`Unknown flag: ${arg}\n`)
      process.exit(1)
    } else {
      patterns.push(arg)
    }
  }
  return { patterns, write, verbose }
}

function printHelp(): void {
  process.stdout.write(`jogak-codemod — migrate Storybook CSF3 (.stories.tsx) → jogak entries (.jogak.tsx)

USAGE
  jogak-codemod [flags] <pattern>...

FLAGS
  --dry       preview mode (default). print change stats, no file writes.
  --write     apply changes: rewrite source, rename .stories.tsx → .jogak.tsx.
  --verbose   per-file change details.
  --help      print this help.

EXAMPLES
  jogak-codemod 'src/**/*.stories.tsx'                    # preview
  jogak-codemod --write 'src/**/*.stories.tsx'            # apply
  jogak-codemod --write --verbose 'src/components/*.stories.tsx'

Reference: https://jogak.dev/en/docs/migration-from-storybook
`)
}

async function expandGlob(patterns: readonly string[], cwd: string): Promise<string[]> {
  const { glob } = await import('glob')
  const results: string[] = []
  for (const p of patterns) {
    const matched = await glob(p, { cwd, absolute: true, ignore: ['**/node_modules/**'] })
    for (const f of matched) if (!results.includes(f)) results.push(f)
  }
  return results.sort()
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.patterns.length === 0) {
    process.stderr.write('No patterns provided. Use --help for usage.\n')
    process.exit(1)
  }

  const cwd = process.cwd()
  const files = await expandGlob(args.patterns, cwd)
  if (files.length === 0) {
    process.stderr.write(`No files matched: ${args.patterns.join(', ')}\n`)
    process.exit(1)
  }

  process.stdout.write(`[jogak-codemod] ${args.write ? 'apply' : 'dry-run'} — ${files.length} file(s)\n\n`)

  const totals = { importsRewritten: 0, metaTypeReplaced: 0, storyObjReplaced: 0, satisfiesRewritten: 0, nameFieldsAdded: 0 }
  let touched = 0

  for (const file of files) {
    const original = await readFile(file, 'utf8')
    const { source, changes } = transformSource(original, { filePath: file })
    const rel = relative(cwd, file)
    const changed = source !== original
    if (changed) touched += 1
    for (const k of Object.keys(totals) as (keyof typeof totals)[]) {
      totals[k] += changes[k]
    }
    if (args.verbose || (changed && !args.write)) {
      const stats = Object.entries(changes)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
      process.stdout.write(`  ${changed ? '✓' : '·'} ${rel} ${stats ? '— ' + stats : ''}\n`)
    }
    if (args.write && changed) {
      await writeFile(file, source, 'utf8')
      // 파일명 rename: X.stories.tsx → X.jogak.tsx
      if (/\.stories\.(tsx?|jsx?)$/u.test(file)) {
        const dir = dirname(file)
        const base = basename(file).replace(/\.stories\.(tsx?|jsx?)$/u, '.jogak.$1')
        await rename(file, resolve(dir, base))
      }
    }
  }

  process.stdout.write(`\n[jogak-codemod] ${touched}/${files.length} file(s) touched\n`)
  process.stdout.write(`  imports rewritten:    ${totals.importsRewritten}\n`)
  process.stdout.write(`  Meta → JogakMeta:     ${totals.metaTypeReplaced}\n`)
  process.stdout.write(`  StoryObj → Jogak:     ${totals.storyObjReplaced}\n`)
  process.stdout.write(`  satisfies rewritten:  ${totals.satisfiesRewritten}\n`)
  process.stdout.write(`  name fields added:    ${totals.nameFieldsAdded}\n`)

  if (!args.write && touched > 0) {
    process.stdout.write(`\nRe-run with --write to apply changes.\n`)
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`)
  process.exit(1)
})
