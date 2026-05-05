#!/usr/bin/env node
/**
 * Dev server idle RSS benchmark — Jogak vs Storybook
 *
 * 측정 대상: dev server 시작 후 idle 상태에서 process tree 전체의 RSS(Resident Set Size) 합계.
 * Storybook의 manager+iframe(preview) 분리 구조가 메모리를 더 쓰는지 확인.
 *
 * 사용:
 *   node benchmarks/rss-idle.mjs [--sizes 50,100,500] [--target jogak|storybook|both]
 *   node benchmarks/rss-idle.mjs --sizes 50,100,500
 *
 * 흐름 (size별):
 *   1) generate-fixture.mjs <size>
 *   2) dev server spawn → 200 응답 + 5초 안정화
 *   3) process tree 수집 (pgrep -P 재귀)
 *   4) ps -o rss= 로 RSS 읽음, 5초 간격 3회 → median
 *   5) dev server kill
 *
 * 결과: stdout 표 + benchmarks/last-run-rss.json
 */

import { spawn, spawnSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── CLI args ────────────────────────────────────────────────
function getArg(name, def) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return def
  return process.argv[idx + 1] ?? def
}

const SIZES = String(getArg('sizes', '50,100,500'))
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)
const TARGET = String(getArg('target', 'both'))

const SERVER_BOOT_TIMEOUT_MS = 180_000
const STABILIZE_MS = 5_000
const SAMPLE_INTERVAL_MS = 5_000
const N_SAMPLES = 3

// ── helpers ────────────────────────────────────────────────
function log(msg) {
  process.stdout.write(`[rss] ${msg}\n`)
}

function err(msg) {
  process.stderr.write(`[rss][error] ${msg}\n`)
}

async function killTree(pid) {
  if (pid === undefined) return
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // ignore
    }
  }
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (res.status === 200) return true
    } catch {
      // ignore
    }
    await sleep(150)
  }
  return false
}

function generateFixture(count) {
  log(`generate fixture size=${count.toString()}...`)
  const result = spawnSync(
    'node',
    [resolve(ROOT, 'benchmarks/baselines/scripts/generate-fixture.mjs'), count.toString()],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' },
  )
  if (result.status !== 0) {
    throw new Error(`generate-fixture 실패 (status=${result.status}): ${result.stderr}`)
  }
}

// ── process tree 수집 ──────────────────────────────────────
function pgrepChildren(ppid) {
  // pgrep -P ppid → 자식 PID 목록 (한 줄에 하나)
  const r = spawnSync('pgrep', ['-P', ppid.toString()], { encoding: 'utf8' })
  if (r.status !== 0) return [] // 자식 없으면 status=1
  return r.stdout
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
}

function collectTree(rootPid) {
  // BFS로 트리 전체 수집
  const seen = new Set([rootPid])
  const queue = [rootPid]
  while (queue.length > 0) {
    const pid = queue.shift()
    if (pid === undefined) break
    for (const child of pgrepChildren(pid)) {
      if (!seen.has(child)) {
        seen.add(child)
        queue.push(child)
      }
    }
  }
  return [...seen]
}

function readRssKB(pid) {
  // ps -o rss= -p PID → KB
  const r = spawnSync('ps', ['-o', 'rss=', '-p', pid.toString()], { encoding: 'utf8' })
  if (r.status !== 0) return NaN
  const v = Number(r.stdout.trim())
  return Number.isFinite(v) ? v : NaN
}

function readRssMBForTree(pids) {
  let totalKB = 0
  let alive = 0
  for (const pid of pids) {
    const kb = readRssKB(pid)
    if (Number.isFinite(kb)) {
      totalKB += kb
      alive++
    }
  }
  return { mb: totalKB / 1024, alive, total: pids.length }
}

// ── target ─────────────────────────────────────────────────
function jogakTarget() {
  return {
    name: 'Jogak',
    spawn: () =>
      spawn(
        'pnpm',
        [
          '--filter',
          'baseline-jogak',
          'exec',
          'jogak',
          'dev',
          '--port',
          '5184',
          '--patterns',
          'src/**/*.jogak.tsx',
        ],
        {
          cwd: ROOT,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, FORCE_COLOR: '0' },
        },
      ),
    serverUrl: 'http://localhost:5184/',
  }
}

function storybookTarget() {
  return {
    name: 'Storybook',
    spawn: () =>
      spawn(
        'pnpm',
        [
          '--filter',
          'baseline-storybook',
          'exec',
          'storybook',
          'dev',
          '-p',
          '6008',
          '--no-open',
          '--quiet',
        ],
        {
          cwd: ROOT,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, FORCE_COLOR: '0' },
        },
      ),
    serverUrl: 'http://localhost:6008/',
  }
}

// ── 측정 함수 ──────────────────────────────────────────────
async function measureTarget(target, size) {
  log(`▶ ${target.name} size=${size.toString()} server start...`)
  const child = target.spawn()
  child.stdout?.resume()
  child.stderr?.resume()

  const result = {
    target: target.name,
    size,
    rootPid: child.pid,
    bootMs: NaN,
    samples: [],
    median: NaN,
    treePidCount: 0,
    error: null,
  }

  try {
    const t0 = Date.now()
    const ok = await waitForServer(target.serverUrl, SERVER_BOOT_TIMEOUT_MS)
    if (!ok) throw new Error(`${target.name}: dev server 부팅 timeout`)
    result.bootMs = Date.now() - t0
    log(`  boot: ${result.bootMs.toString()}ms — stabilize ${STABILIZE_MS.toString()}ms`)
    await sleep(STABILIZE_MS)

    const rootPid = child.pid
    if (rootPid === undefined) throw new Error('child.pid undefined')

    for (let i = 0; i < N_SAMPLES; i++) {
      const tree = collectTree(rootPid)
      result.treePidCount = Math.max(result.treePidCount, tree.length)
      const { mb, alive, total } = readRssMBForTree(tree)
      result.samples.push({ pids: total, alive, mb })
      log(
        `  sample ${(i + 1).toString()}/${N_SAMPLES.toString()}: ${mb.toFixed(1)}MB (alive ${alive.toString()}/${total.toString()} pids)`,
      )
      if (i < N_SAMPLES - 1) await sleep(SAMPLE_INTERVAL_MS)
    }

    const sorted = result.samples.map((s) => s.mb).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    result.median =
      sorted.length === 0
        ? NaN
        : sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid]
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e)
    err(`${target.name} size=${size.toString()} 실패: ${result.error}`)
  } finally {
    await killTree(child.pid)
    await sleep(800)
  }

  return result
}

// ── main ───────────────────────────────────────────────────
async function main() {
  log(`sizes=${SIZES.join(',')} target=${TARGET}`)

  const targets = []
  if (TARGET === 'jogak' || TARGET === 'both') targets.push(jogakTarget())
  if (TARGET === 'storybook' || TARGET === 'both') targets.push(storybookTarget())

  // size별 × target별 측정
  const results = []
  for (const size of SIZES) {
    generateFixture(size)
    for (const t of targets) {
      const r = await measureTarget(t, size)
      results.push(r)
    }
  }

  // 결과 표
  process.stdout.write('\n')
  process.stdout.write('size  target      median_MB   pids   samples\n')
  for (const r of results) {
    const median = Number.isFinite(r.median) ? `${r.median.toFixed(1)}MB` : 'ERR'
    const samples = r.samples.map((s) => s.mb.toFixed(0)).join('/') || '-'
    process.stdout.write(
      `${r.size.toString().padStart(4)}  ${r.target.padEnd(11)} ${median.padStart(9)}   ${r.treePidCount.toString().padStart(4)}   ${samples}\n`,
    )
  }

  // size별 ratio (Storybook / Jogak)
  process.stdout.write('\nsize  Jogak(MB)  Storybook(MB)  ratio(SB/Jogak)\n')
  for (const size of SIZES) {
    const j = results.find((r) => r.size === size && r.target === 'Jogak')
    const s = results.find((r) => r.size === size && r.target === 'Storybook')
    const jm = j?.median ?? NaN
    const sm = s?.median ?? NaN
    const ratio = Number.isFinite(jm) && Number.isFinite(sm) && jm > 0 ? sm / jm : NaN
    process.stdout.write(
      `${size.toString().padStart(4)}  ${(Number.isFinite(jm) ? jm.toFixed(1) : '-').padStart(9)}  ${(Number.isFinite(sm) ? sm.toFixed(1) : '-').padStart(13)}  ${(Number.isFinite(ratio) ? ratio.toFixed(2) + '×' : '-').padStart(15)}\n`,
    )
  }

  // JSON 저장
  const jsonPath = resolve(ROOT, 'benchmarks/last-run-rss.json')
  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        meta: { sizes: SIZES, target: TARGET, samples: N_SAMPLES, sampleIntervalMs: SAMPLE_INTERVAL_MS, ts: new Date().toISOString() },
        results,
      },
      null,
      2,
    ),
    'utf8',
  )
  log(`saved: ${jsonPath}`)
}

await main()
