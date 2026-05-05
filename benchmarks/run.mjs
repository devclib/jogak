import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runExtractBench } from './extract-props.mjs'
import { runBundleBench } from './bundle-size.mjs'
import { runColdStartBench } from './cold-start.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SKIP_COLD = process.env.JOGAK_BENCH_SKIP_COLD === '1'
const SKIP_BUNDLE = process.env.JOGAK_BENCH_SKIP_BUNDLE === '1'

function fmtMs(v) {
  return Number.isFinite(v) ? `${v.toFixed(0)} ms` : 'n/a'
}

function fmtKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

const lines = []
const log = (s = '') => { lines.push(s); process.stdout.write(`${s}\n`) }

log('# Jogak — benchmark')
log('')
log(`측정 시각: ${new Date().toISOString()}`)
log(`Node: ${process.version}  Platform: ${process.platform}/${process.arch}`)
log('')

// 1. 번들 크기 / 빌드 시간
if (!SKIP_BUNDLE) {
  log('## 빌드 시간 · 번들 크기')
  log('')
  log('| package | build | dist 합계 | js gzip | files |')
  log('| --- | ---: | ---: | ---: | ---: |')
  const bundle = await runBundleBench()
  for (const b of bundle) {
    log(`| \`${b.name}\` | ${fmtMs(b.buildMs)} | ${fmtKb(b.total)} | ${fmtKb(b.totalGzip)} | ${b.files.toString()} |`)
  }
  log('')
} else {
  log('## 빌드 시간 · 번들 크기')
  log('')
  log('_skipped (JOGAK_BENCH_SKIP_BUNDLE=1)_')
  log('')
}

// 2. props 추출
log('## props 자동 추출 (ts-morph)')
log('')
const ext = await runExtractBench()
log(`- Project 초기화: ${fmtMs(ext.initMs)}`)
log(`- ${ext.fileCount.toString()}개 파일 추출 합계: ${fmtMs(ext.runMs)} (props ${ext.totalProps.toString()}개)`)
log(`- 평균 ${ext.avgMs.toFixed(1)} ms/file`)
log('')
log('| file | extract |')
log('| --- | ---: |')
for (const f of ext.perFile) {
  log(`| \`${f.file}\` | ${fmtMs(f.ms)} |`)
}
log('')

// 3. cold start
if (!SKIP_COLD) {
  log('## cold start (호스트 dev server → 첫 200 응답)')
  log('')
  log(`runs=${process.env.JOGAK_BENCH_RUNS ?? '3'}, clean=${process.env.JOGAK_BENCH_CLEAN === '1' ? 'on' : 'off'}`)
  log('')
  log('| target | median | min | max | ok |')
  log('| --- | ---: | ---: | ---: | ---: |')
  const cold = await runColdStartBench()
  for (const c of cold) {
    log(`| ${c.name} | ${fmtMs(c.median)} | ${fmtMs(c.min)} | ${fmtMs(c.max)} | ${c.ok.toString()}/${c.runs.toString()} |`)
  }
  log('')
} else {
  log('## cold start')
  log('')
  log('_skipped (JOGAK_BENCH_SKIP_COLD=1)_')
  log('')
}

const outFile = resolve(ROOT, 'benchmarks/last-run.md')
await writeFile(outFile, lines.join('\n'), 'utf8')
process.stdout.write(`\n결과 저장: ${outFile}\n`)
