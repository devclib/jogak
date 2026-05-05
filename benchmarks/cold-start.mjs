import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const CLEAN = process.env.JOGAK_BENCH_CLEAN === '1'
const RUNS = Number(process.env.JOGAK_BENCH_RUNS ?? '3')
const TIMEOUT_MS = 120_000
const ONLY_BASELINE = process.env.JOGAK_BENCH_ONLY_BASELINE === '1'

const INTERNAL_TARGETS = [
  {
    name: 'ui (Vite SPA)',
    command: 'pnpm',
    args: ['--filter', '@jogak/ui', 'exec', 'vite', '--port', '5180', '--strictPort'],
    url: 'http://localhost:5180/',
    caches: ['packages/ui/node_modules/.vite'],
  },
  {
    name: 'wc-demo (Vite + Preact)',
    command: 'pnpm',
    args: ['--filter', 'wc-demo', 'exec', 'vite', '--port', '5181', '--strictPort'],
    url: 'http://localhost:5181/',
    caches: ['apps/wc-demo/node_modules/.vite'],
  },
  {
    name: 'next-demo (/jogak)',
    command: 'pnpm',
    args: ['--filter', 'next-demo', 'exec', 'next', 'dev', '-p', '3091'],
    url: 'http://localhost:3091/jogak',
    caches: ['apps/next-demo/.next'],
  },
]

const BASELINE_TARGETS = [
  {
    name: 'baseline-jogak (jogak dev)',
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
      'src/**/*.jogak.tsx',
    ],
    url: 'http://localhost:5182/',
    caches: ['benchmarks/baselines/jogak/node_modules/.vite'],
    group: 'baseline',
  },
  {
    name: 'baseline-storybook (sb dev)',
    command: 'pnpm',
    args: ['--filter', 'baseline-storybook', 'exec', 'storybook', 'dev', '-p', '6006', '--no-open', '--quiet'],
    url: 'http://localhost:6006/',
    caches: [
      'benchmarks/baselines/storybook/node_modules/.cache/storybook',
      'benchmarks/baselines/storybook/node_modules/.vite-storybook',
    ],
    group: 'baseline',
  },
]

const TARGETS = ONLY_BASELINE
  ? BASELINE_TARGETS
  : [...INTERNAL_TARGETS, ...BASELINE_TARGETS]

async function fetchOnce(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return res.status === 200
  } catch {
    return false
  }
}

async function killTree(pid) {
  if (pid === undefined) return
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    try { process.kill(pid, 'SIGKILL') } catch {}
  }
}

async function measureOnce(target) {
  if (CLEAN && target.caches !== undefined) {
    for (const c of target.caches) {
      await rm(resolve(ROOT, c), { recursive: true, force: true })
    }
  }

  const t0 = performance.now()
  const child = spawn(target.command, target.args, {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  })
  // 출력은 버린다 (벤치 노이즈 방지)
  child.stdout?.resume()
  child.stderr?.resume()

  let elapsed = NaN
  try {
    const deadline = Date.now() + TIMEOUT_MS
    while (Date.now() < deadline) {
      if (await fetchOnce(target.url)) {
        elapsed = performance.now() - t0
        break
      }
      await sleep(50)
    }
  } finally {
    await killTree(child.pid)
    await sleep(800)
  }

  if (Number.isNaN(elapsed)) {
    throw new Error(`${target.name}: ${(TIMEOUT_MS / 1000).toString()}s 안에 첫 200 응답 실패`)
  }
  return elapsed
}

export async function runColdStartBench() {
  const results = []
  for (const target of TARGETS) {
    const times = []
    for (let i = 0; i < RUNS; i++) {
      try {
        times.push(await measureOnce(target))
      } catch (err) {
        times.push(NaN)
        process.stderr.write(`  ${target.name} run ${(i + 1).toString()} 실패: ${err instanceof Error ? err.message : String(err)}\n`)
      }
    }
    const valid = times.filter((t) => !Number.isNaN(t)).sort((a, b) => a - b)
    const median = valid.length > 0 ? valid[Math.floor(valid.length / 2)] : NaN
    const min = valid[0] ?? NaN
    const max = valid[valid.length - 1] ?? NaN
    results.push({
      name: target.name,
      median,
      min,
      max,
      runs: times.length,
      ok: valid.length,
      group: target.group ?? 'internal',
    })
  }
  return results
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`runs=${RUNS.toString()}  clean=${CLEAN.toString()}  only-baseline=${ONLY_BASELINE.toString()}\n\n`)
  const r = await runColdStartBench()
  process.stdout.write('target                              median_ms   min_ms   max_ms   ok\n')
  for (const x of r) {
    process.stdout.write(
      `${x.name.padEnd(34)} ${x.median.toFixed(0).padStart(9)}   ${x.min.toFixed(0).padStart(6)}   ${x.max.toFixed(0).padStart(6)}   ${x.ok.toString()}/${x.runs.toString()}\n`,
    )
  }
}
