import { stat, readdir } from 'node:fs/promises'
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

const TARGETS = [
  { name: '@jogak/core', cmd: ['pnpm', '--filter', '@jogak/core', 'build'], dist: 'packages/core/dist' },
  { name: '@jogak/react', cmd: ['pnpm', '--filter', '@jogak/react', 'build'], dist: 'packages/react/dist' },
  { name: '@jogak/next', cmd: ['pnpm', '--filter', '@jogak/next', 'build'], dist: 'packages/next/dist' },
  { name: '@jogak/web-components', cmd: ['pnpm', '--filter', '@jogak/web-components', 'build'], dist: 'packages/web-components/dist' },
  { name: '@jogak/cli', cmd: ['pnpm', '--filter', '@jogak/cli', 'build'], dist: 'packages/cli/dist' },
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runBundleBench()
  process.stdout.write('package                  build_ms   dist_kb   js_gzip_kb   files\n')
  for (const x of r) {
    process.stdout.write(
      `${x.name.padEnd(24)} ${x.buildMs.toFixed(0).padStart(7)}   ${(x.total / 1024).toFixed(1).padStart(7)}   ${(x.totalGzip / 1024).toFixed(2).padStart(10)}   ${x.files.toString().padStart(5)}\n`,
    )
  }
}
