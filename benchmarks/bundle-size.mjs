import { stat, readdir, rm } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { gzipSync } from 'node:zlib'
import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const execAsync = promisify(execFile)

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
        // 자바스크립트 산출물에 한해 gzip 크기도 측정 (배포 전송 크기)
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

// 1.1.0: 모노레포 구조 갱신 반영. react/next/web-components/vue/svelte 어댑터는
// alpha.14.1부터 @jogak/core의 `renderers/*` 서브패스로 통합. 별도 npm 패키지 아님.
// 측정 대상은 실제 publish되는 3 패키지 (core/ui/cli).
const TARGETS = [
  { name: '@jogak/core', cmd: ['pnpm', '--filter', '@jogak/core', 'build'], dist: 'packages/core/dist' },
  { name: '@jogak/ui', cmd: ['pnpm', '--filter', '@jogak/ui', 'build'], dist: 'packages/ui/dist' },
  { name: '@jogak/cli', cmd: ['pnpm', '--filter', '@jogak/cli', 'build'], dist: 'packages/cli/dist' },
]

const BASELINE_TARGETS = [
  {
    name: 'baseline-jogak',
    cmd: [
      'pnpm',
      '--filter',
      'baseline-jogak',
      'exec',
      'jogak',
      'build',
      '--patterns',
      'src/**/*.jogak.tsx',
      '--out-dir',
      'jogak-static',
    ],
    dist: 'benchmarks/baselines/jogak/jogak-static',
    cleanBefore: ['benchmarks/baselines/jogak/jogak-static'],
  },
  {
    name: 'baseline-storybook',
    cmd: [
      'pnpm',
      '--filter',
      'baseline-storybook',
      'exec',
      'storybook',
      'build',
      '-o',
      'storybook-static',
    ],
    dist: 'benchmarks/baselines/storybook/storybook-static',
    cleanBefore: ['benchmarks/baselines/storybook/storybook-static'],
  },
]

export async function runBundleBench() {
  const results = []
  for (const t of TARGETS) {
    const t0 = performance.now()
    const [bin, ...args] = t.cmd
    await execAsync(bin, args, { cwd: ROOT })
    const buildMs = performance.now() - t0
    const sz = await dirSize(resolve(ROOT, t.dist))
    results.push({ name: t.name, buildMs, ...sz })
  }
  return results
}

export async function runBaselineBundleBench() {
  const results = []
  for (const t of BASELINE_TARGETS) {
    if (t.cleanBefore !== undefined) {
      for (const c of t.cleanBefore) {
        await rm(resolve(ROOT, c), { recursive: true, force: true })
      }
    }
    const t0 = performance.now()
    const [bin, ...args] = t.cmd
    try {
      await execAsync(bin, args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
    } catch (err) {
      const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr).slice(-300) : ''
      process.stderr.write(`[bundle] ${t.name} build 실패\n${stderr}\n`)
      results.push({ name: t.name, buildMs: NaN, total: 0, totalGzip: 0, files: 0, group: 'baseline', error: true })
      continue
    }
    const buildMs = performance.now() - t0
    const sz = await dirSize(resolve(ROOT, t.dist))
    results.push({ name: t.name, buildMs, ...sz, group: 'baseline' })
  }
  return results
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const onlyBaseline = process.env.JOGAK_BENCH_ONLY_BASELINE === '1'
  const r = onlyBaseline ? await runBaselineBundleBench() : await runBundleBench()
  process.stdout.write('target                       build_ms   dist_kb   js_gzip_kb   files\n')
  for (const x of r) {
    process.stdout.write(
      `${x.name.padEnd(28)} ${(Number.isFinite(x.buildMs) ? x.buildMs.toFixed(0) : 'n/a').padStart(8)}   ${(x.total / 1024).toFixed(1).padStart(7)}   ${(x.totalGzip / 1024).toFixed(2).padStart(10)}   ${x.files.toString().padStart(5)}\n`,
    )
  }
}
