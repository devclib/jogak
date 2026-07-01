/**
 * Vue / Svelte fixture에 대한 jogak dev smoke.
 *
 * Usage:
 *   node e2e/framework-smoke.mjs --fixture=vue
 *   node e2e/framework-smoke.mjs --fixture=svelte
 *
 * 검증:
 *   1. apps/jogak-{vue,svelte}-test에서 `jogak dev`가 부팅된다
 *   2. chrome SPA가 사이드바에 fixture entry를 노출한다
 *   3. entry 클릭 → iframe scope에서 framework 어댑터가 마운트
 *      (vue → `[data-testid="vue-hello"]`, svelte → `[data-testid="svelte-hello"]`)
 *   4. `jogak:ready` + `jogak:rendered` postMessage 흐름
 *   5. console.error / pageerror zero
 *
 * 빌드 가정: `pnpm --filter @jogak/core build` + `--filter @jogak/ui build`
 * + `--filter @jogak/cli build`가 사전 완료되어 있어야 한다.
 */

import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const FIXTURES = {
  vue: {
    appName: 'jogak-vue-test',
    titleGroup: 'Vue',
    titleEntry: 'Hello',
    testid: 'vue-hello',
    expectedText: 'Hello jogak-vue (vue)',
  },
  svelte: {
    appName: 'jogak-svelte-test',
    titleGroup: 'Svelte',
    titleEntry: 'Hello',
    testid: 'svelte-hello',
    expectedText: 'Hello jogak-svelte (svelte)',
  },
  // 1.0.0-beta.5: React/Next smoke 추가. 이전엔 "React/Next은 VR이 보호"라고 했으나
  // VR은 chrome scope만 catch. axe-core vite 정적 스캔 이슈(beta.3 hotfix in beta.4)처럼
  // iframe scope 어댑터 dispatch 결함은 smoke만 catch. 5 framework matrix 완성.
  react: {
    appName: 'jogak-vite-test',
    titleGroup: 'React',
    titleEntry: 'Hello',
    testid: 'react-hello',
    expectedText: 'Hello jogak-vite (react)',
  },
  next: {
    appName: 'jogak-next-test',
    titleGroup: 'Next',
    titleEntry: 'Hello',
    testid: 'next-hello',
    expectedText: 'Hello jogak-next (next)',
  },
  // 1.0.0 post-1.0: Web Components 편입. wc-demo에 jogak.config.ts +
  // Hello fixture 추가 → jogak dev로 vite adapter가 wc renderer dispatch.
  wc: {
    appName: 'wc-demo',
    titleGroup: 'WC',
    titleEntry: 'Hello',
    testid: 'wc-hello',
    expectedText: 'Hello wc-demo (wc)',
  },
}

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => a.split('='))
    .map(([k, v = 'true']) => [k.replace(/^--?/u, ''), v]),
)
const fixture = (args['fixture'] || '').toLowerCase()
const cfg = FIXTURES[fixture]
if (!cfg) {
  console.error('Usage: node e2e/framework-smoke.mjs --fixture=vue|svelte|react|next|wc')
  process.exit(2)
}

const PORT = Number(process.env['JOGAK_E2E_PORT'] || 5173)
const HOST_URL = `http://localhost:${PORT}`
// 사용자 vite scope (jogak dev가 자체 spawn). default 5174부터 시작 — adapter spawn 로직.
const PREVIEW_ORIGIN = process.env['PREVIEW_ORIGIN'] || 'http://localhost:5174'

// `pnpm --filter <app> exec jogak`은 CI의 첫 install 시점에 cli/dist가 없어
// fixture node_modules/.bin/jogak symlink가 누락된다(workspace bin link 시점
// 제약). Node로 cli.js를 직접 호출해 install/build 순서에 무관하게 구동한다.
const CLI_BIN = resolve(ROOT, 'packages/cli/dist/cli.js')
const FIXTURE_CWD = resolve(ROOT, 'apps', cfg.appName)
console.log(`[smoke:${fixture}] spawn jogak dev (cwd=${cfg.appName}) on :${PORT}`)

const child = spawn(
  process.execPath,
  [CLI_BIN, 'dev', '--port', String(PORT), '--host', 'false'],
  {
    cwd: FIXTURE_CWD,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', BROWSER: 'none' },
    detached: false,
  },
)

const childLog = []
child.stdout.on('data', (b) => childLog.push(String(b)))
child.stderr.on('data', (b) => childLog.push(String(b)))

function shutdown() {
  if (child.exitCode === null && !child.killed) {
    try {
      child.kill('SIGTERM')
    } catch {
      /* noop */
    }
  }
}
process.on('exit', shutdown)
process.on('SIGINT', () => {
  shutdown()
  process.exit(130)
})

async function waitForHttp(url, totalMs = 60_000) {
  const deadline = Date.now() + totalMs
  let lastErr
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (res.ok || (res.status >= 200 && res.status < 500)) return true
    } catch (err) {
      lastErr = err
    }
    if (child.exitCode !== null) {
      throw new Error(
        `[smoke:${fixture}] jogak dev exited prematurely (code=${child.exitCode}). logs:\n${childLog.join('')}`,
      )
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(
    `[smoke:${fixture}] ${url} did not respond within ${totalMs}ms. last error: ${lastErr?.message ?? '(none)'}\n` +
      `child logs:\n${childLog.slice(-40).join('')}`,
  )
}

const passes = []
const fails = []
const expect = (label, cond) => (cond ? passes : fails).push(label)

try {
  await waitForHttp(HOST_URL, 60_000)
  console.log(`[smoke:${fixture}] dev ready at ${HOST_URL}`)

  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => {
    window.__jogakMessages = []
    window.addEventListener('message', (e) => {
      window.__jogakMessages.push({ origin: e.origin, type: e.data?.type })
    })
  })

  const page = await ctx.newPage()
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))

  // URL deep-link 진입 — 사이드바 클릭 의존을 피해 결정적으로 entry mount 유도.
  // entry.id = meta.title (`Vue/Hello`, `Svelte/Hello`), jogak name = `Default`.
  const entryId = `${cfg.titleGroup}/${cfg.titleEntry}`
  const deepLink = `${HOST_URL}?entry=${encodeURIComponent(entryId)}&jogak=Default`
  await page.goto(deepLink, { waitUntil: 'networkidle' })

  // iframe 등장 대기 (사용자 vite scope src).
  const SAME_ORIGIN =
    PREVIEW_ORIGIN === HOST_URL || PREVIEW_ORIGIN === HOST_URL.replace(/\/$/, '')
  const iframeSelector = SAME_ORIGIN ? 'iframe' : 'iframe'
  const frameHandle = await page.waitForSelector(iframeSelector, { timeout: 30_000 })
  const frame = await frameHandle.contentFrame()
  if (!frame) throw new Error('iframe contentFrame null')

  // framework 마운트 확인.
  // 1.0.0-beta.5: CI slow runner에서 React iframe compile이 20초 초과하는 경우 있음
  // (Vue/Svelte는 성공). 40초로 확장 — 로컬은 여전히 <10s에 성공.
  // 1.0.0-beta.7: Next 어댑터는 next dev 초기 컴파일 30s+라 환경변수로 override
  // 가능 (workflow의 next-smoke job이 240s로 설정).
  const testidTimeoutMs = Number(process.env['JOGAK_SMOKE_TESTID_TIMEOUT_MS'] ?? 40_000)
  await frame.waitForSelector(`[data-testid="${cfg.testid}"]`, { timeout: testidTimeoutMs })
  const mounted = frame.locator(`[data-testid="${cfg.testid}"]`).first()
  const text = (await mounted.textContent()) ?? ''

  const messages = await page.evaluate(() => window.__jogakMessages || [])
  const sawReady = messages.some((m) => m.type === 'jogak:ready')
  const sawRendered = messages.some((m) => m.type === 'jogak:rendered')
  const sawError = messages.some((m) => m.type === 'jogak:error')

  console.log(`[smoke:${fixture}] mounted text: ${JSON.stringify(text)}`)
  console.log(`[smoke:${fixture}] messages:`, { sawReady, sawRendered, sawError })
  console.log(`[smoke:${fixture}] page errors: ${errors.length}`)

  expect('jogak:ready emitted', sawReady)
  expect('jogak:rendered emitted', sawRendered)
  expect('no jogak:error', !sawError)
  expect(`[data-testid="${cfg.testid}"] mounted`, true)
  expect(`text contains "${cfg.expectedText}"`, text.trim() === cfg.expectedText)
  expect('no console / pageerror', errors.length === 0)

  await browser.close()
} catch (err) {
  fails.push(`fatal: ${err?.message ?? String(err)}`)
  console.error(err)
  // 1.0.0-beta.5: 진단 인프라 — fail 시 childLog(jogak dev stdout/stderr) dump.
  // CI에서 iframe timeout이 발생할 때 사용자 vite adapter가 spawn됐는지, error를
  // 던졌는지, HMR 준비됐는지 등이 log에 있음. childLog 자체는 spawn 이후 계속
  // 쌓이므로 마지막 200줄만 표시 (재시도 시 최신 상태).
  console.error(`[smoke:${fixture}] --- jogak dev childLog (last 200 lines) ---`)
  const combined = childLog.join('')
  const lines = combined.split('\n')
  console.error(lines.slice(-200).join('\n'))
  console.error(`[smoke:${fixture}] --- end childLog ---`)
} finally {
  shutdown()
}

const total = passes.length + fails.length
console.log(`[smoke:${fixture}] passes: ${passes.length}/${total}`)
for (const p of passes) console.log(`  ✓ ${p}`)
if (fails.length) {
  console.log(`[smoke:${fixture}] fails:`)
  for (const f of fails) console.log(`  ✗ ${f}`)
}

process.exit(fails.length === 0 ? 0 : 1)
