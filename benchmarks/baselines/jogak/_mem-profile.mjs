#!/usr/bin/env node
/**
 * baseline-jogak 안에서 실행되는 RSS 분해 진단.
 *
 * - `@jogak/ui/host` (또는 직접 vite createServer)를 in-process로 띄움.
 * - 안정화 후 5초 간격으로 process.memoryUsage()를 출력 → RSS 내부 분포 식별.
 * - --snapshot 시 v8 heap snapshot 캡처.
 *
 * 실행 (root에서):
 *   pnpm --filter baseline-jogak exec node _mem-profile.mjs --mode normal
 *   pnpm --filter baseline-jogak exec node _mem-profile.mjs --mode no-deps
 *
 * 모드:
 *   normal   — runHost 기본 (optimizeDeps.include 활성)
 *   no-deps  — vite createServer 직접 호출, optimizeDeps 사실상 비활성
 */

import { setTimeout as sleep } from 'node:timers/promises'
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeHeapSnapshot } from 'node:v8'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..', '..') // monorepo root
const USER_ROOT = __dirname

function getArg(name, def) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return def
  return process.argv[idx + 1] ?? def
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

const MODE = String(getArg('mode', 'normal'))
const TAKE_SNAPSHOT = hasFlag('snapshot')
const SAMPLE_INTERVAL_MS = 5_000
const N_SAMPLES = 6
const STABILIZE_MS = 5_000

function log(msg) {
  process.stdout.write(`[mem] ${msg}\n`)
}
function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1).padStart(7) + ' MB'
}

// baseline-jogak에는 @jogak/ui dep이 없다 — 절대 경로(file://)로 host의 .ts를 import.
// Node 24 strip-types로 .ts ESM이 직접 동작하며, host 내부의 dynamic import는
// 그 모듈 위치(packages/ui/...) 기준이라 packages/ui/node_modules에서 vite/plugin-react를 찾는다.
const HOST_TS_URL = `file://${resolve(ROOT, 'packages/ui/src/host/index.ts')}`

async function startNormal() {
  const { runHost } = await import(HOST_TS_URL)
  const handle = await runHost({
    mode: 'dev',
    userRoot: USER_ROOT,
    patterns: ['src/**/*.jogak.tsx'],
    port: 5185,
    host: 'localhost',
    open: false,
  })
  log(`server up: ${handle.url}`)
  return { close: () => handle.close() }
}

async function startNoDeps() {
  // packages/ui/node_modules에서 vite/plugin-react를 찾도록 file:// 절대경로 사용
  const UI_ROOT = resolve(ROOT, 'packages/ui')
  const vite = await import(`file://${UI_ROOT}/node_modules/vite/dist/node/index.js`)
  const reactPluginMod = await import(
    `file://${UI_ROOT}/node_modules/@vitejs/plugin-react/dist/index.js`
  ).catch(() =>
    import(`file://${UI_ROOT}/node_modules/@vitejs/plugin-react/dist/index.mjs`),
  )
  const coreVite = await import(`file://${resolve(ROOT, 'packages/core/dist/vite/index.mjs')}`)
  const reactPlugin = reactPluginMod.default ?? reactPluginMod
  const server = await vite.createServer({
    root: UI_ROOT,
    configFile: false,
    plugins: [
      reactPlugin(),
      coreVite.jogak({
        patterns: ['src/**/*.jogak.tsx'],
        codeTheme: 'vsDark',
        cwd: USER_ROOT,
      }),
    ],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { port: 5185, host: 'localhost' },
  })
  await server.listen()
  log(`server up (no-deps): http://localhost:5185/`)
  return { close: () => server.close() }
}

async function main() {
  log(`mode=${MODE} snapshot=${TAKE_SNAPSHOT}`)

  const handle = MODE === 'no-deps' ? await startNoDeps() : await startNormal()
  await sleep(STABILIZE_MS)

  // 워밍업: registry 가상모듈을 한 번 로드시켜 module graph가 채워지도록
  try {
    await fetch('http://localhost:5185/', { signal: AbortSignal.timeout(15_000) })
  } catch (e) {
    log(`warmup fetch failed: ${e.message ?? e}`)
  }
  await sleep(2_000)

  log('sampling memoryUsage every 5s...')
  process.stdout.write(
    'sample      rss      heapTot    heapUsed   external   arrBuf\n',
  )
  const samples = []
  for (let i = 1; i <= N_SAMPLES; i++) {
    const m = process.memoryUsage()
    samples.push(m)
    process.stdout.write(
      `${i.toString().padStart(2)}/${N_SAMPLES}   ` +
        `${fmtMB(m.rss)}  ${fmtMB(m.heapTotal)}  ${fmtMB(m.heapUsed)}  ` +
        `${fmtMB(m.external)}  ${fmtMB(m.arrayBuffers)}\n`,
    )
    if (i < N_SAMPLES) await sleep(SAMPLE_INTERVAL_MS)
  }

  if (TAKE_SNAPSHOT) {
    const path = resolve(ROOT, `benchmarks/heap-${MODE}.heapsnapshot`)
    log(`writing heap snapshot → ${path}`)
    writeHeapSnapshot(path)
  }

  const last = samples[samples.length - 1]
  const native = last.rss - last.heapTotal - last.external
  process.stdout.write('\n=== breakdown (last sample) ===\n')
  process.stdout.write(`RSS         ${fmtMB(last.rss)}\n`)
  process.stdout.write(`  V8 heap   ${fmtMB(last.heapTotal)}  (used ${fmtMB(last.heapUsed)})\n`)
  process.stdout.write(`  external  ${fmtMB(last.external)}  (arrBuf ${fmtMB(last.arrayBuffers)})\n`)
  process.stdout.write(`  native*   ${fmtMB(native)}  (RSS - heapTotal - external)\n`)
  process.stdout.write(`\n  *native ≈ Node 런타임 + esbuild/native binding + 디스크 I/O 잔여\n`)

  const jsonPath = resolve(ROOT, `benchmarks/last-run-mem-${MODE}.json`)
  await writeFile(
    jsonPath,
    JSON.stringify({ meta: { mode: MODE, ts: new Date().toISOString() }, samples }, null, 2),
    'utf8',
  )
  log(`saved: ${jsonPath}`)

  await handle.close()
  log('server closed')
  process.exit(0)
}

main().catch((e) => {
  process.stderr.write(`[mem][error] ${e.stack ?? e.message ?? e}\n`)
  process.exit(1)
})
