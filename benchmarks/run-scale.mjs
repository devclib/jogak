#!/usr/bin/env node
/**
 * Jogak vs Storybook scale benchmark
 *
 * 카탈로그 사이즈를 늘려가며 cold start / build / bundle / extract 시간 측정.
 *
 * 환경변수:
 *   JOGAK_BENCH_SIZES         콤마 구분 사이즈 (기본: '5,50,100')
 *   JOGAK_BENCH_INCLUDE_500   '1'이면 500도 측정 (기본 미포함, 시간 오래 걸림)
 *   JOGAK_BENCH_RUNS          cold-start 반복 횟수 (기본: 2)
 *
 * 출력:
 *   benchmarks/last-run-scale.md    — markdown 표
 *   benchmarks/last-run-scale.json  — 머신 파싱용 raw 결과
 */

import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { rm, writeFile, readFile, readdir } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { gzipSync } from 'node:zlib'
import { glob } from 'glob'
import { createPropsExtractor } from '../packages/core/dist/build/index.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const execAsync = promisify(execFile)

const RUNS = Number(process.env.JOGAK_BENCH_RUNS ?? '2')
const COLD_TIMEOUT_MS = 180_000  // 큰 카탈로그 대비 timeout 늘림
const BUILD_TIMEOUT_MS = 600_000

const sizesEnv = process.env.JOGAK_BENCH_SIZES ?? '5,50,100'
const baseSizes = sizesEnv
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)

const INCLUDE_500 = process.env.JOGAK_BENCH_INCLUDE_500 === '1'
const SIZES = INCLUDE_500 || baseSizes.includes(500) ? baseSizes : baseSizes.filter((n) => n < 500)

if (SIZES.length === 0) {
  process.stderr.write('JOGAK_BENCH_SIZES에 유효한 사이즈가 없습니다.\n')
  process.exit(1)
}

// --------- 헬퍼 ---------
function nowMs() {
  return performance.now()
}

async function killTree(pid) {
  if (pid === undefined) return
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {}
  }
}

async function fetchOnce(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return res.status === 200
  } catch {
    return false
  }
}

async function dirSize(dir) {
  let total = 0
  let totalGzip = 0
  let files = 0
  async function walk(d) {
    const entries = await readdir(d, { withFileTypes: true })
    for (const e of entries) {
      const p = join(d, e.name)
      if (e.isDirectory()) {
        await walk(p)
      } else if (e.isFile()) {
        const buf = await readFile(p)
        total += buf.byteLength
        if (/\.(mjs|cjs|js)$/u.test(e.name)) {
          totalGzip += gzipSync(buf).byteLength
        }
        files += 1
      }
    }
  }
  await walk(dir)
  return { total, totalGzip, files }
}

// --------- 사이즈별 측정 ---------
async function generateFixture(count) {
  const t0 = nowMs()
  await execAsync('node', ['benchmarks/baselines/scripts/generate-fixture.mjs', String(count)], {
    cwd: ROOT,
    maxBuffer: 16 * 1024 * 1024,
  })
  return nowMs() - t0
}

async function measureColdStart(target, runs) {
  const times = []
  for (let i = 0; i < runs; i++) {
    // 캐시 삭제 후 측정 (진짜 cold)
    if (target.caches !== undefined) {
      for (const c of target.caches) {
        await rm(resolve(ROOT, c), { recursive: true, force: true })
      }
    }
    const t0 = nowMs()
    const child = spawn(target.command, target.args, {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', ...target.env },
    })
    child.stdout?.resume()
    child.stderr?.resume()

    let elapsed = NaN
    let timedOut = false
    try {
      const deadline = Date.now() + COLD_TIMEOUT_MS
      while (Date.now() < deadline) {
        if (await fetchOnce(target.url)) {
          elapsed = nowMs() - t0
          break
        }
        await sleep(100)
      }
      if (Number.isNaN(elapsed)) timedOut = true
    } finally {
      await killTree(child.pid)
      await sleep(1000)
    }

    if (timedOut) {
      process.stderr.write(`  cold-start [${target.name}] run ${(i + 1).toString()} timeout (${(COLD_TIMEOUT_MS / 1000).toString()}s)\n`)
      times.push(NaN)
    } else {
      times.push(elapsed)
    }
  }
  const valid = times.filter((t) => !Number.isNaN(t)).sort((a, b) => a - b)
  const median = valid.length > 0 ? valid[Math.floor(valid.length / 2)] : NaN
  const min = valid[0] ?? NaN
  const max = valid[valid.length - 1] ?? NaN
  return { median, min, max, runs: times.length, ok: valid.length, times }
}

async function measureBuild(target) {
  if (target.cleanBefore !== undefined) {
    for (const c of target.cleanBefore) {
      await rm(resolve(ROOT, c), { recursive: true, force: true })
    }
  }
  const t0 = nowMs()
  let error
  try {
    await execAsync(target.command, target.args, {
      cwd: ROOT,
      maxBuffer: 128 * 1024 * 1024,
      timeout: BUILD_TIMEOUT_MS,
      env: { ...process.env, ...target.env },
    })
  } catch (err) {
    error = err
  }
  const buildMs = nowMs() - t0

  if (error !== undefined) {
    const stderr =
      error !== null && typeof error === 'object' && 'stderr' in error ? String(error.stderr).slice(-500) : String(error)
    return { buildMs: NaN, total: 0, totalGzip: 0, files: 0, error: true, stderr }
  }

  const sz = await dirSize(resolve(ROOT, target.dist))
  return { buildMs, ...sz, error: false }
}

async function measureExtract(generatedDir) {
  // ts-morph extract — jogak 쪽만
  const tsConfigFilePath = resolve(ROOT, 'benchmarks/baselines/jogak/tsconfig.json')

  const t0 = nowMs()
  const extractor = createPropsExtractor({ tsConfigFilePath })
  const initMs = nowMs() - t0

  const files = await glob('**/*.jogak.tsx', {
    cwd: generatedDir,
    absolute: true,
  })

  let totalProps = 0
  const t1 = nowMs()
  for (const file of files) {
    const result = extractor.extract(file)
    totalProps += Object.keys(result).length
  }
  const totalMs = nowMs() - t1

  return {
    initMs,
    fileCount: files.length,
    totalMs,
    avgMsPerFile: files.length > 0 ? totalMs / files.length : 0,
    totalProps,
  }
}

// --------- 사이즈별 시나리오 ---------
function jogakColdTarget(_size) {
  return {
    name: 'jogak',
    command: 'pnpm',
    args: [
      '--filter',
      'baseline-jogak',
      'exec',
      'jogak',
      'dev',
      '--port',
      '5182',
      '--patterns',
      'src/generated/**/*.jogak.tsx',
    ],
    url: 'http://localhost:5182/',
    caches: ['benchmarks/baselines/jogak/node_modules/.vite', 'benchmarks/baselines/jogak/.jogak'],
    env: {},
  }
}

function storybookColdTarget(_size) {
  return {
    name: 'storybook',
    command: 'pnpm',
    args: ['--filter', 'baseline-storybook', 'exec', 'storybook', 'dev', '-p', '6006', '--no-open', '--quiet'],
    url: 'http://localhost:6006/',
    caches: [
      'benchmarks/baselines/storybook/node_modules/.cache/storybook',
      'benchmarks/baselines/storybook/node_modules/.vite-storybook',
    ],
    env: {
      JOGAK_BENCH_SB_STORIES: '../src/generated/**/*.stories.@(ts|tsx)',
    },
  }
}

function jogakBuildTarget(_size) {
  return {
    name: 'jogak',
    command: 'pnpm',
    args: [
      '--filter',
      'baseline-jogak',
      'exec',
      'jogak',
      'build',
      '--patterns',
      'src/generated/**/*.jogak.tsx',
      '--out-dir',
      'jogak-static',
    ],
    dist: 'benchmarks/baselines/jogak/jogak-static',
    cleanBefore: ['benchmarks/baselines/jogak/jogak-static', 'benchmarks/baselines/jogak/.jogak'],
    env: {},
  }
}

function storybookBuildTarget(_size) {
  return {
    name: 'storybook',
    command: 'pnpm',
    args: ['--filter', 'baseline-storybook', 'exec', 'storybook', 'build', '-o', 'storybook-static'],
    dist: 'benchmarks/baselines/storybook/storybook-static',
    cleanBefore: [
      'benchmarks/baselines/storybook/storybook-static',
      'benchmarks/baselines/storybook/node_modules/.cache/storybook',
    ],
    env: {
      JOGAK_BENCH_SB_STORIES: '../src/generated/**/*.stories.@(ts|tsx)',
    },
  }
}

// --------- 실행 ---------
async function runForSize(size) {
  process.stdout.write(`\n=== size ${size.toString()} ===\n`)
  const tFix = await generateFixture(size)
  process.stdout.write(`  fixture generated in ${tFix.toFixed(0)} ms\n`)

  // 1. cold start
  process.stdout.write(`  measuring cold-start jogak...\n`)
  const coldJ = await measureColdStart(jogakColdTarget(size), RUNS)
  process.stdout.write(`    median ${Number.isFinite(coldJ.median) ? coldJ.median.toFixed(0) : 'n/a'} ms (ok ${coldJ.ok.toString()}/${coldJ.runs.toString()})\n`)

  process.stdout.write(`  measuring cold-start storybook...\n`)
  const coldS = await measureColdStart(storybookColdTarget(size), RUNS)
  process.stdout.write(`    median ${Number.isFinite(coldS.median) ? coldS.median.toFixed(0) : 'n/a'} ms (ok ${coldS.ok.toString()}/${coldS.runs.toString()})\n`)

  // 2. build
  process.stdout.write(`  measuring build jogak...\n`)
  const buildJ = await measureBuild(jogakBuildTarget(size))
  process.stdout.write(`    build ${Number.isFinite(buildJ.buildMs) ? buildJ.buildMs.toFixed(0) : 'n/a'} ms, dist ${(buildJ.total / 1024).toFixed(1)} KB, gzip ${(buildJ.totalGzip / 1024).toFixed(1)} KB\n`)

  process.stdout.write(`  measuring build storybook...\n`)
  const buildS = await measureBuild(storybookBuildTarget(size))
  if (buildS.error) {
    process.stdout.write(`    storybook BUILD FAILED: ${buildS.stderr}\n`)
  } else {
    process.stdout.write(`    build ${buildS.buildMs.toFixed(0)} ms, dist ${(buildS.total / 1024).toFixed(1)} KB, gzip ${(buildS.totalGzip / 1024).toFixed(1)} KB\n`)
  }

  // 3. ts-morph extract (jogak only)
  process.stdout.write(`  measuring ts-morph extract...\n`)
  const ext = await measureExtract(resolve(ROOT, 'benchmarks/baselines/jogak/src/generated'))
  process.stdout.write(`    init ${ext.initMs.toFixed(0)} ms, total ${ext.totalMs.toFixed(0)} ms, avg ${ext.avgMsPerFile.toFixed(2)} ms/file (${ext.fileCount.toString()} files)\n`)

  return { size, fixtureMs: tFix, cold: { jogak: coldJ, storybook: coldS }, build: { jogak: buildJ, storybook: buildS }, extract: ext }
}

// --------- 결과 포맷 ---------
function fmtMs(v) {
  return Number.isFinite(v) ? `${v.toFixed(0)} ms` : 'n/a'
}
function fmtKb(b) {
  return Number.isFinite(b) ? `${(b / 1024).toFixed(1)} KB` : 'n/a'
}
function ratio(jogakVal, sbVal) {
  if (!Number.isFinite(jogakVal) || !Number.isFinite(sbVal) || jogakVal <= 0) return 'n/a'
  const r = sbVal / jogakVal
  if (r >= 1) return `${r.toFixed(1)}×`
  return `${(1 / r).toFixed(1)}× (SB)`
}

async function main() {
  process.stdout.write(`# Jogak vs Storybook scale benchmark\n`)
  process.stdout.write(`Node ${process.version}  ${process.platform}/${process.arch}\n`)
  process.stdout.write(`sizes: ${SIZES.join(', ')}  runs(cold)=${RUNS.toString()}\n`)

  const tStart = nowMs()
  const results = []
  for (const size of SIZES) {
    try {
      const r = await runForSize(size)
      results.push(r)
    } catch (err) {
      process.stderr.write(`size ${size.toString()} 측정 실패: ${err instanceof Error ? err.message : String(err)}\n`)
      results.push({ size, error: true, errorMessage: err instanceof Error ? err.message : String(err) })
    }
  }
  const totalMs = nowMs() - tStart

  // markdown 작성
  const lines = []
  const log = (s = '') => { lines.push(s) }
  log(`# Jogak vs Storybook scale benchmark`)
  log('')
  log(`측정 시각: ${new Date().toISOString()}`)
  log(`Node: ${process.version}  Platform: ${process.platform}/${process.arch}`)
  log(`sizes: ${SIZES.join(', ')}  cold-runs=${RUNS.toString()}`)
  log(`전체 측정 소요: ${(totalMs / 1000).toFixed(1)} s`)
  log('')

  // 표 1: cold start
  log(`## Cold start (dev)`)
  log('')
  log(`| size | Jogak (median) | Storybook (median) | ratio (SB/J) |`)
  log(`| ---: | ---: | ---: | ---: |`)
  for (const r of results) {
    if (r.error) {
      log(`| ${r.size.toString()} | error | error | - |`)
      continue
    }
    const j = r.cold.jogak
    const s = r.cold.storybook
    log(`| ${r.size.toString()} | ${fmtMs(j.median)} | ${fmtMs(s.median)} | ${ratio(j.median, s.median)} |`)
  }
  log('')

  // 표 2: build time
  log(`## Build time`)
  log('')
  log(`| size | Jogak | Storybook | ratio (SB/J) |`)
  log(`| ---: | ---: | ---: | ---: |`)
  for (const r of results) {
    if (r.error) {
      log(`| ${r.size.toString()} | error | error | - |`)
      continue
    }
    const j = r.build.jogak
    const s = r.build.storybook
    log(`| ${r.size.toString()} | ${fmtMs(j.buildMs)} | ${s.error ? 'BUILD FAIL' : fmtMs(s.buildMs)} | ${ratio(j.buildMs, s.buildMs)} |`)
  }
  log('')

  // 표 3: bundle size
  log(`## Bundle size (dist 합계 / js gzip)`)
  log('')
  log(`| size | Jogak dist | Jogak gzip | Storybook dist | Storybook gzip | gzip ratio (SB/J) |`)
  log(`| ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const r of results) {
    if (r.error) {
      log(`| ${r.size.toString()} | error | error | error | error | - |`)
      continue
    }
    const j = r.build.jogak
    const s = r.build.storybook
    log(`| ${r.size.toString()} | ${fmtKb(j.total)} | ${fmtKb(j.totalGzip)} | ${s.error ? 'FAIL' : fmtKb(s.total)} | ${s.error ? 'FAIL' : fmtKb(s.totalGzip)} | ${ratio(j.totalGzip, s.totalGzip)} |`)
  }
  log('')

  // 표 4: ts-morph extract (jogak only)
  log(`## Jogak ts-morph extract`)
  log('')
  log(`| size | init_ms | total_ms | avg_ms/file | total_props |`)
  log(`| ---: | ---: | ---: | ---: | ---: |`)
  for (const r of results) {
    if (r.error) {
      log(`| ${r.size.toString()} | error | - | - | - |`)
      continue
    }
    const e = r.extract
    log(`| ${r.size.toString()} | ${fmtMs(e.initMs)} | ${fmtMs(e.totalMs)} | ${e.avgMsPerFile.toFixed(2)} | ${e.totalProps.toString()} |`)
  }
  log('')

  // 시각화 끝, 결과 저장
  const md = lines.join('\n')
  process.stdout.write(`\n${md}\n`)

  await writeFile(resolve(ROOT, 'benchmarks/last-run-scale.md'), md, 'utf8')
  await writeFile(
    resolve(ROOT, 'benchmarks/last-run-scale.json'),
    JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, sizes: SIZES, runs: RUNS, totalMs, results }, null, 2),
    'utf8',
  )
  process.stdout.write(`\n결과 저장: benchmarks/last-run-scale.md, benchmarks/last-run-scale.json\n`)
  process.stdout.write(`전체 측정 소요: ${(totalMs / 1000).toFixed(1)} s\n`)
}

await main()
