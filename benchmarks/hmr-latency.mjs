#!/usr/bin/env node
/**
 * HMR latency benchmark — Jogak vs Storybook
 *
 * 측정 대상: `*.jogak.tsx` / `*.stories.tsx` 파일에서 첫 entry의 args.label(또는 동등 필드)을
 * `'iter-{N}'`로 수정 → 브라우저 DOM에 반영될 때까지의 wallclock.
 *
 * api-contracts.md §5.2 목표: HMR < 300ms (Jogak)
 *
 * 사용:
 *   node benchmarks/hmr-latency.mjs [--size 50] [--runs 10] [--target jogak|storybook|both]
 *   node benchmarks/hmr-latency.mjs --size 50 --runs 10
 *
 * 흐름:
 *   1) generate-fixture.mjs <size> 실행 → Comp001.jogak.tsx / Comp001.stories.tsx 생성
 *   2) dev server spawn → 200 응답까지 대기 + 안정화 대기
 *   3) Playwright Chromium 시작 → 첫 entry 페이지 navigate (jogak: query param, storybook: iframe deep link)
 *   4) 첫 렌더 selector 대기 (label 텍스트 매칭)
 *   5) (RUNS+WARMUP)회 반복:
 *        a) 파일에서 첫 entry args의 label 필드를 'iter-{N}'으로 writeFile
 *        b) writeFile 완료 시각 기록(t0)
 *        c) 페이지에서 'iter-{N}' 텍스트가 보일 때까지 polling → t1
 *        d) latency = t1 - t0
 *   6) 첫 N_WARMUP 회는 cold으로 따로 표기, 나머지로 median/min/max
 *
 * 결과: stdout 표 + benchmarks/last-run-hmr.json 저장
 */

import { spawn, spawnSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── CLI args ────────────────────────────────────────────────
function getArg(name, def) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return def
  return process.argv[idx + 1] ?? def
}

const SIZE = Number(getArg('size', '50'))
const RUNS = Number(getArg('runs', '10'))
const TARGET = String(getArg('target', 'both'))
const N_WARMUP = 2 // 처음 2회는 cold (HMR 초기 자원 로딩 영향)
const TOTAL_ITERS = RUNS + N_WARMUP
const HMR_TIMEOUT_MS = 5_000
const SERVER_BOOT_TIMEOUT_MS = 120_000
const SERVER_STABILIZE_MS = 3_000
const POLL_INTERVAL_MS = 16 // ~60Hz

// ── fixture & paths ────────────────────────────────────────
const FIRST_COMP_ID = '001'
const JOGAK_FIXTURE = resolve(
  ROOT,
  'benchmarks/baselines/jogak/src/generated',
  `Comp${FIRST_COMP_ID}.jogak.tsx`,
)
const SB_FIXTURE = resolve(
  ROOT,
  'benchmarks/baselines/storybook/src/generated',
  `Comp${FIRST_COMP_ID}.stories.tsx`,
)

// ── 패턴별 첫 args 키 (generate-fixture.mjs PATTERNS와 1:1) ──
// i=1 → pattern 1 (i % 8 = 1) → key 'title'
// 단, fixture 생성기는 patternFor(i) = PATTERNS[i % 8]를 쓴다.
// Comp001 → i=1 → PATTERNS[1] → 'title' 필드
// 각 entry는 args(i), args(i+1), args(i+2)이므로 첫 entry는 args(1) (Comp001 기준)
//
// 주의: 첫 entry args의 string 필드를 'iter-{N}'으로 바꾼다. 어떤 string 키든 가능하지만,
// 안정성을 위해 generator의 PATTERNS 키와 동일한 매핑을 둔다.
const FIRST_STRING_KEY_BY_PATTERN = [
  'label', // pattern 0
  'title', // pattern 1
  'message', // pattern 2
  'text', // pattern 3
  'itemLabel', // pattern 4
  'id', // pattern 5
  'content', // pattern 6
  'caption', // pattern 7
]
function firstStringKeyFor(i) {
  return FIRST_STRING_KEY_BY_PATTERN[i % FIRST_STRING_KEY_BY_PATTERN.length]
}

// Comp001 → i=1 → pattern 1 → 'title'
const I_FIRST_COMP = 1
const FIRST_KEY = firstStringKeyFor(I_FIRST_COMP)

// ── helpers ────────────────────────────────────────────────
function log(msg) {
  process.stdout.write(`[hmr] ${msg}\n`)
}

function err(msg) {
  process.stderr.write(`[hmr][error] ${msg}\n`)
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
    await sleep(100)
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

// ── 파일 패치 함수 ─────────────────────────────────────────
/**
 * fixture 파일의 첫 entry export(args 블록)에서 firstKey 필드 값을 newValue로 교체.
 * generate-fixture가 만드는 형식:
 *   export const First: Jogak = { name: 'First', args: { title: 'Title 1', ... } }
 *   export const First: Story = { args: { title: 'Title 1', ... } }
 *
 * 매번 source 전체를 읽어 정규식으로 첫 등장 위치만 교체한다.
 * (둘째 entry는 이름이 Second/Third여서 첫 args가 First/default임이 보장되지 않으므로
 *  파일 첫머리에서 가장 처음 등장하는 `<firstKey>: '<...>'`만 바꾼다.)
 */
async function patchFirstArg(filePath, firstKey, newValue) {
  const src = await readFile(filePath, 'utf8')
  // args block 안에서만 매칭. 이전 정규식은 fixture의 meta.title을 잡아
  // jogak 메타 시그니처를 변경시켰고, F4의 meta-only 분기가 아닌 full-reload
  // 분기를 측정해 왔다. `args: { ... <firstKey>: '...'` 형태로 한정.
  const re = new RegExp(`(args:\\s*\\{[^}]*?\\b${firstKey}:\\s*')([^']*)(')`)
  const next = src.replace(re, `$1${newValue}$3`)
  if (next === src) {
    throw new Error(`patch 실패: ${filePath} 에서 args { ... ${firstKey}: '...' } 패턴을 못 찾음`)
  }
  await writeFile(filePath, next, 'utf8')
}

// ── target 정의 ────────────────────────────────────────────
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
          '5183',
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
    serverUrl: 'http://localhost:5183/',
    // Jogak SPA: Comp001은 항상 generate되므로 i=1 고정 사용
    pageUrlFor: async () => {
      const idNum = I_FIRST_COMP
      return {
        url: `http://localhost:5183/?entry=${encodeURIComponent('Generated/Comp001')}&jogak=First`,
        fixture: JOGAK_FIXTURE,
        firstKey: firstStringKeyFor(idNum),
        initialText: initialTextForI(idNum),
      }
    },
    caches: ['benchmarks/baselines/jogak/node_modules/.vite'],
  }
}

function storybookTarget() {
  return {
    name: 'Storybook',
    fixture: SB_FIXTURE,
    firstKey: FIRST_KEY,
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
          '6007',
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
    serverUrl: 'http://localhost:6007/',
    // iframe deep link — Storybook이 인덱싱한 첫 entry id를 동적으로 결정
    // (size에 따라 Comp001이 인덱스에 없을 수 있어 index.json에서 첫 'generated-' 항목을 사용)
    pageUrlFor: async () => {
      const res = await fetch('http://localhost:6007/index.json', {
        signal: AbortSignal.timeout(5000),
      })
      const data = await res.json()
      const entries = data.entries ?? {}
      const ids = Object.keys(entries)
        .filter((k) => k.startsWith('generated-comp') && k.endsWith('--first'))
        .sort()
      const firstId = ids[0]
      if (firstId === undefined) {
        throw new Error('Storybook index에 generated--first story 없음')
      }
      // fixture 경로도 해당 id에 맞춰 결정
      const m = /^generated-comp(\d+)--first$/.exec(firstId)
      if (m === null) throw new Error(`unexpected story id: ${firstId}`)
      const idNum = Number(m[1])
      const idStr = idNum.toString().padStart(3, '0')
      const fixture = resolve(
        ROOT,
        'benchmarks/baselines/storybook/src/generated',
        `Comp${idStr}.stories.tsx`,
      )
      const firstKey = firstStringKeyFor(idNum)
      const initialText = initialTextForI(idNum)
      return {
        url: `http://localhost:6007/iframe.html?id=${firstId}&viewMode=story`,
        fixture,
        firstKey,
        initialText,
      }
    },
    caches: ['benchmarks/baselines/storybook/node_modules/.cache/storybook'],
  }
}

// ── 본 측정 루프 ───────────────────────────────────────────
async function measureTarget(target, chromium) {
  log(`▶ ${target.name}: dev server start...`)
  const child = target.spawn()
  // 출력 버림
  child.stdout?.resume()
  child.stderr?.resume()

  const result = {
    name: target.name,
    iterations: [],
    cold: [],
    warmStats: null,
    timeouts: 0,
    bootMs: NaN,
    error: null,
  }

  let browser = null
  try {
    const t0 = performance.now()
    const ok = await waitForServer(target.serverUrl, SERVER_BOOT_TIMEOUT_MS)
    if (!ok) throw new Error(`${target.name}: dev server 부팅 timeout`)
    result.bootMs = performance.now() - t0
    log(`  boot: ${result.bootMs.toFixed(0)}ms — stabilize ${SERVER_STABILIZE_MS}ms`)
    await sleep(SERVER_STABILIZE_MS)

    // 동적 page 정보 결정 (storybook은 index.json 기반)
    const pageInfo = await target.pageUrlFor()
    result.pageUrl = pageInfo.url
    result.fixture = pageInfo.fixture
    result.firstKey = pageInfo.firstKey
    result.initialText = pageInfo.initialText

    log(`  launch chromium → ${pageInfo.url}`)
    browser = await chromium.launch({ headless: true })
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })

    // 첫 렌더 대기
    log(`  wait initial render: text="${pageInfo.initialText}"`)
    await page.waitForFunction(
      (needle) => document.body !== null && document.body.innerText.includes(needle),
      pageInfo.initialText,
      { timeout: 30_000, polling: POLL_INTERVAL_MS },
    )

    // 측정 루프
    for (let n = 1; n <= TOTAL_ITERS; n++) {
      const value = `iter-${n.toString()}`
      // 측정 전 직전 상태 안정화 잠깐
      await sleep(80)

      // 파일 패치
      await patchFirstArg(pageInfo.fixture, pageInfo.firstKey, value)
      const tStart = performance.now()

      // 변경 반영 polling (browser-side innerText)
      let elapsed = NaN
      let timedOut = false
      let recoveredViaReload = false
      let elapsedWithReload = NaN
      try {
        await page.waitForFunction(
          (needle) => document.body !== null && document.body.innerText.includes(needle),
          value,
          { timeout: HMR_TIMEOUT_MS, polling: POLL_INTERVAL_MS },
        )
        elapsed = performance.now() - tStart
      } catch {
        timedOut = true
        result.timeouts++
        // fallback: page.reload() 후 재측정 (참고용)
        try {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 })
          await page.waitForFunction(
            (needle) => document.body !== null && document.body.innerText.includes(needle),
            value,
            { timeout: 10_000, polling: POLL_INTERVAL_MS },
          )
          elapsedWithReload = performance.now() - tStart
          recoveredViaReload = true
        } catch {
          // give up
        }
      }

      const phase = n <= N_WARMUP ? 'cold' : 'warm'
      const entry = {
        iter: n,
        phase,
        value,
        elapsed,
        timeout: timedOut,
        recoveredViaReload,
        elapsedWithReload,
      }
      if (phase === 'cold') result.cold.push(entry)
      else result.iterations.push(entry)

      log(
        `  ${phase.padEnd(4)} ${n.toString().padStart(2)}/${TOTAL_ITERS.toString()}: ${
          timedOut ? 'TIMEOUT' : `${elapsed.toFixed(0)}ms`
        }`,
      )

      // HMR 처리 여유 (vite watcher 안정)
      await sleep(450)
    }

    // 통계 — pure HMR (timeout 제외)
    const valid = result.iterations.filter((x) => !x.timeout && Number.isFinite(x.elapsed))
    const sorted = valid.map((x) => x.elapsed).sort((a, b) => a - b)
    if (sorted.length > 0) {
      const mid = Math.floor(sorted.length / 2)
      result.warmStats = {
        count: sorted.length,
        median:
          sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      }
    } else {
      result.warmStats = { count: 0, median: NaN, min: NaN, max: NaN, mean: NaN }
    }

    // 통계 — reload-fallback 포함 (timeout이어도 reload로 회복된 케이스 elapsed)
    const validWithReload = result.iterations
      .map((x) => {
        if (!x.timeout && Number.isFinite(x.elapsed)) return x.elapsed
        if (x.recoveredViaReload && Number.isFinite(x.elapsedWithReload))
          return x.elapsedWithReload
        return null
      })
      .filter((v) => v !== null)
    const sorted2 = [...validWithReload].sort((a, b) => a - b)
    if (sorted2.length > 0) {
      const mid = Math.floor(sorted2.length / 2)
      result.warmStatsWithReload = {
        count: sorted2.length,
        median:
          sorted2.length % 2 === 0
            ? (sorted2[mid - 1] + sorted2[mid]) / 2
            : sorted2[mid],
        min: sorted2[0],
        max: sorted2[sorted2.length - 1],
        mean: sorted2.reduce((a, b) => a + b, 0) / sorted2.length,
      }
    } else {
      result.warmStatsWithReload = { count: 0, median: NaN, min: NaN, max: NaN, mean: NaN }
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e)
    err(`${target.name} 측정 실패: ${result.error}`)
  } finally {
    if (browser !== null) {
      try {
        await browser.close()
      } catch {
        // ignore
      }
    }
    await killTree(child.pid)
    await sleep(800)
  }
  return result
}

// 패턴별 초기 args 첫 entry의 화면 노출 텍스트
// generate-fixture.mjs PATTERNS와 1:1 매핑.
// args(i)의 첫 string 필드 값. 첫 entry는 args(i)이고 i는 컴포넌트 인덱스.
const INITIAL_TEXT_PREFIX_BY_PATTERN = [
  'Label ', // 0: label = `Label ${i}`
  'Title ', // 1: title = `Title ${i}`
  'Message ', // 2: message = `Message ${i}`
  'Text ', // 3: text = `Text ${i}`
  'Item ', // 4: itemLabel = `Item ${i}`
  'id-', // 5: id = `id-${i}` (caption은 i%3===0일 때만)
  'Content ', // 6: content = `Content ${i}`
  'Caption ', // 7: caption = `Caption ${i}`
]
function initialTextForI(i) {
  const prefix = INITIAL_TEXT_PREFIX_BY_PATTERN[i % INITIAL_TEXT_PREFIX_BY_PATTERN.length]
  return `${prefix}${i.toString()}`
}

// ── main ───────────────────────────────────────────────────
async function main() {
  log(`size=${SIZE.toString()} runs=${RUNS.toString()} warmup=${N_WARMUP.toString()} target=${TARGET}`)

  // 1) fixture 생성
  generateFixture(SIZE)

  // 2) playwright import
  let chromium
  try {
    const mod = await import('@playwright/test')
    chromium = mod.chromium
  } catch (e) {
    err(`@playwright/test import 실패: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(2)
  }

  // 3) target별 측정
  const targets = []
  if (TARGET === 'jogak' || TARGET === 'both') targets.push(jogakTarget())
  if (TARGET === 'storybook' || TARGET === 'both') targets.push(storybookTarget())

  const results = []
  for (const t of targets) {
    const r = await measureTarget(t, chromium)
    results.push(r)
  }

  // 4) 결과 출력
  process.stdout.write('\n')
  process.stdout.write(
    'target      warm_median  warm_min  warm_max  warm_n  reload_median  reload_n  cold_1st  timeouts/total\n',
  )
  for (const r of results) {
    const w = r.warmStats
    const wr = r.warmStatsWithReload ?? { median: NaN, count: 0 }
    const cold1 = r.cold[0]
    const cold1Str =
      cold1 === undefined
        ? '-'
        : cold1.timeout
          ? cold1.recoveredViaReload
            ? `TO→${cold1.elapsedWithReload.toFixed(0)}`
            : 'TO'
          : `${cold1.elapsed.toFixed(0)}ms`
    const fmt = (v) => (Number.isFinite(v) ? `${v.toFixed(0)}ms` : '-')
    process.stdout.write(
      `${r.name.padEnd(11)} ${fmt(w.median).padStart(11)}  ${fmt(w.min).padStart(8)}  ${fmt(w.max).padStart(8)}  ${w.count.toString().padStart(6)}  ${fmt(wr.median).padStart(13)}  ${wr.count.toString().padStart(8)}  ${cold1Str.padStart(8)}  ${r.timeouts.toString()}/${TOTAL_ITERS.toString()}\n`,
    )
  }

  // 5) 목표 달성 여부
  const jogak = results.find((r) => r.name === 'Jogak')
  if (jogak !== undefined && jogak.warmStats !== null && Number.isFinite(jogak.warmStats.median)) {
    const ok = jogak.warmStats.median < 300
    process.stdout.write(
      `\napi-contracts.md §5.2 목표 (HMR < 300ms): Jogak warm median = ${jogak.warmStats.median.toFixed(0)}ms → ${ok ? 'PASS' : 'FAIL'}\n`,
    )
  }

  // 6) JSON 저장
  const jsonPath = resolve(ROOT, 'benchmarks/last-run-hmr.json')
  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        meta: { size: SIZE, runs: RUNS, warmup: N_WARMUP, target: TARGET, ts: new Date().toISOString() },
        results,
      },
      null,
      2,
    ),
    'utf8',
  )
  log(`saved: ${jsonPath}`)

  // 실패가 있으면 exit 0이지만 보고서에 명시 (에러 처리는 보고서에서)
}

await main()
