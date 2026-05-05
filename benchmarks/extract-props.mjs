import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { glob } from 'glob'
import { createPropsExtractor } from '../packages/core/dist/build/index.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

export async function runExtractBench() {
  const tsConfigFilePath = resolve(ROOT, 'apps/next-demo/tsconfig.json')

  const t0 = performance.now()
  const extractor = createPropsExtractor({ tsConfigFilePath })
  const initMs = performance.now() - t0

  const files = await glob('{apps,packages}/**/*.jogak.tsx', {
    cwd: ROOT,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**'],
  })

  let totalProps = 0
  const perFile = []
  for (const file of files) {
    const t1 = performance.now()
    // extract는 child_process로 격리되어 비동기다.
    const result = await extractor.extract(file)
    perFile.push({ file: file.replace(`${ROOT}/`, ''), ms: performance.now() - t1 })
    totalProps += Object.keys(result).length
  }

  const runMs = perFile.reduce((sum, x) => sum + x.ms, 0)
  // 자식 프로세스 즉시 정리 — bench가 매달리지 않게.
  extractor.releaseCache()
  return {
    initMs,
    fileCount: files.length,
    runMs,
    avgMs: files.length > 0 ? runMs / files.length : 0,
    totalProps,
    perFile,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runExtractBench()
  process.stdout.write(`init           ${r.initMs.toFixed(0)} ms\n`)
  process.stdout.write(`extract total  ${r.runMs.toFixed(0)} ms (${r.fileCount} files, ${r.totalProps} props)\n`)
  process.stdout.write(`per file avg   ${r.avgMs.toFixed(1)} ms\n\n`)
  for (const f of r.perFile) {
    process.stdout.write(`  ${f.ms.toFixed(1).padStart(6)} ms  ${f.file}\n`)
  }
}
