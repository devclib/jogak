import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runExtractBench } from './extract-props.mjs'
import { runBundleBench, runBaselineBundleBench } from './bundle-size.mjs'
import { runColdStartBench } from './cold-start.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SKIP_COLD = process.env.JOGAK_BENCH_SKIP_COLD === '1'
const SKIP_BUNDLE = process.env.JOGAK_BENCH_SKIP_BUNDLE === '1'
const SKIP_EXTRACT = process.env.JOGAK_BENCH_SKIP_EXTRACT === '1'
const ONLY_BASELINE = process.env.JOGAK_BENCH_ONLY_BASELINE === '1'

function fmtMs(v) {
  return Number.isFinite(v) ? `${v.toFixed(0)} ms` : 'n/a'
}

function fmtKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function ratio(jogakVal, sbVal) {
  if (!Number.isFinite(jogakVal) || !Number.isFinite(sbVal) || jogakVal <= 0) return 'n/a'
  const r = sbVal / jogakVal
  if (r >= 1) return `${r.toFixed(1)}x faster (Jogak)`
  return `${(1 / r).toFixed(1)}x faster (Storybook)`
}

function ratioSize(jogakVal, sbVal) {
  if (!Number.isFinite(jogakVal) || !Number.isFinite(sbVal) || jogakVal <= 0) return 'n/a'
  const r = sbVal / jogakVal
  if (r >= 1) return `${r.toFixed(1)}x smaller (Jogak)`
  return `${(1 / r).toFixed(1)}x smaller (Storybook)`
}

const lines = []
const log = (s = '') => { lines.push(s); process.stdout.write(`${s}\n`) }

log('# Jogak — benchmark')
log('')
log(`측정 시각: ${new Date().toISOString()}`)
log(`Node: ${process.version}  Platform: ${process.platform}/${process.arch}`)
log('')

// 1. 번들 크기 / 빌드 시간 (Jogak 패키지)
if (!SKIP_BUNDLE && !ONLY_BASELINE) {
  log('## 빌드 시간 · 번들 크기 (Jogak 패키지)')
  log('')
  log('| package | build | dist 합계 | js gzip | files |')
  log('| --- | ---: | ---: | ---: | ---: |')
  const bundle = await runBundleBench()
  for (const b of bundle) {
    log(`| \`${b.name}\` | ${fmtMs(b.buildMs)} | ${fmtKb(b.total)} | ${fmtKb(b.totalGzip)} | ${b.files.toString()} |`)
  }
  log('')
} else if (SKIP_BUNDLE) {
  log('## 빌드 시간 · 번들 크기')
  log('')
  log('_skipped (JOGAK_BENCH_SKIP_BUNDLE=1)_')
  log('')
}

// 2. props 추출
if (!SKIP_EXTRACT && !ONLY_BASELINE) {
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
}

// 3. cold start (전체)
let coldResults = []
if (!SKIP_COLD) {
  log('## cold start (호스트 dev server → 첫 200 응답)')
  log('')
  log(`runs=${process.env.JOGAK_BENCH_RUNS ?? '3'}, clean=${process.env.JOGAK_BENCH_CLEAN === '1' ? 'on' : 'off'}, only-baseline=${ONLY_BASELINE ? 'on' : 'off'}`)
  log('')
  log('| target | median | min | max | ok |')
  log('| --- | ---: | ---: | ---: | ---: |')
  coldResults = await runColdStartBench()
  for (const c of coldResults) {
    log(`| ${c.name} | ${fmtMs(c.median)} | ${fmtMs(c.min)} | ${fmtMs(c.max)} | ${c.ok.toString()}/${c.runs.toString()} |`)
  }
  log('')
} else {
  log('## cold start')
  log('')
  log('_skipped (JOGAK_BENCH_SKIP_COLD=1)_')
  log('')
}

// 4. Baseline 번들 (Jogak vs Storybook 동일 카탈로그)
log('## Jogak vs Storybook (동일 카탈로그)')
log('')
log('5개 React 컴포넌트(Button/Card/Input/Modal/Pill) × 2~3 variant — `benchmarks/baselines/shared/components/`를 양쪽이 import.')
log('Storybook은 `@storybook/react-vite` (Vite builder) 사용 — 공정 비교.')
log('')
const baselineBundle = await runBaselineBundleBench()
log('| 지표 | Jogak | Storybook | 비교 |')
log('| --- | ---: | ---: | --- |')

const jogakBuild = baselineBundle.find((b) => b.name === 'baseline-jogak')
const sbBuild = baselineBundle.find((b) => b.name === 'baseline-storybook')

const jogakCold = coldResults.find((c) => c.name.startsWith('baseline-jogak'))
const sbCold = coldResults.find((c) => c.name.startsWith('baseline-storybook'))

if (jogakCold !== undefined && sbCold !== undefined) {
  log(`| cold start (median) | ${fmtMs(jogakCold.median)} | ${fmtMs(sbCold.median)} | ${ratio(jogakCold.median, sbCold.median)} |`)
}

if (jogakBuild !== undefined && sbBuild !== undefined) {
  log(`| build time | ${fmtMs(jogakBuild.buildMs)} | ${fmtMs(sbBuild.buildMs)} | ${ratio(jogakBuild.buildMs, sbBuild.buildMs)} |`)
  log(`| dist 합계 | ${fmtKb(jogakBuild.total)} | ${fmtKb(sbBuild.total)} | ${ratioSize(jogakBuild.total, sbBuild.total)} |`)
  log(`| js gzip | ${fmtKb(jogakBuild.totalGzip)} | ${fmtKb(sbBuild.totalGzip)} | ${ratioSize(jogakBuild.totalGzip, sbBuild.totalGzip)} |`)
  log(`| 산출물 파일 수 | ${jogakBuild.files.toString()} | ${sbBuild.files.toString()} | - |`)
}

log('')
log('### 목표(api-contracts.md 5.2) 대비')
if (jogakCold !== undefined) {
  log(`- cold start < 2000ms 목표 — Jogak: **${fmtMs(jogakCold.median)}** ${jogakCold.median < 2000 ? '✓' : '✗'}`)
}
if (jogakBuild !== undefined) {
  log(`- build < 10000ms 목표 — Jogak: **${fmtMs(jogakBuild.buildMs)}** ${jogakBuild.buildMs < 10000 ? '✓' : '✗'}`)
  log(`- gzip < 300KB 목표 — Jogak: **${fmtKb(jogakBuild.totalGzip)}** ${jogakBuild.totalGzip < 300 * 1024 ? '✓' : '✗'}`)
}
log('')

const outFile = resolve(ROOT, 'benchmarks/last-run.md')
await writeFile(outFile, lines.join('\n'), 'utf8')
process.stdout.write(`\n결과 저장: ${outFile}\n`)
