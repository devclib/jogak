import { chromium } from '@playwright/test'

const HOST_URL = process.env.HOST_URL || 'http://localhost:5173'
const PREVIEW_ORIGIN = process.env.PREVIEW_ORIGIN || 'http://localhost:5174'
const ADAPTER_NAME = process.env.ADAPTER_NAME || 'unknown'

const browser = await chromium.launch()
const ctx = await browser.newContext()
await ctx.addInitScript(() => {
  ;(window).__jogakMessages = []
  window.addEventListener('message', (e) => {
    ;(window).__jogakMessages.push({ origin: e.origin, data: e.data })
  })
})

const page = await ctx.newPage()
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))

await page.goto(HOST_URL, { waitUntil: 'networkidle' })
await page.waitForLoadState('networkidle')

// Sidebar 트리: Badge 그룹 확장 → Default 진입.
const badgeBtn = page.locator('button:has-text("Badge")').first()
if (await badgeBtn.count() > 0) {
  await badgeBtn.click()
  await page.waitForTimeout(200)
}
const defaultBtn = page.locator('button:has-text("Default")').first()
if (await defaultBtn.count() > 0) await defaultBtn.click()

// iframe 등장 + Badge mount 대기.
// standalone(same-origin)에서는 src가 상대 경로(`/preview-frame.html`)이므로 단순 iframe 매처.
const SAME_ORIGIN = PREVIEW_ORIGIN === HOST_URL || PREVIEW_ORIGIN === HOST_URL.replace(/\/$/, '')
const iframeSelector = SAME_ORIGIN ? 'iframe' : `iframe[src*="${PREVIEW_ORIGIN}"]`
const frameHandle = await page.waitForSelector(iframeSelector, { timeout: 30000 })
const frame = await frameHandle.contentFrame()
if (!frame) throw new Error('iframe contentFrame null')
await frame.waitForSelector('[data-slot="badge"]', { timeout: 20000 })

const badge = frame.locator('[data-slot="badge"]').first()
const styles = await badge.evaluate((el) => {
  const cs = getComputedStyle(el)
  return {
    bg: cs.backgroundColor,
    color: cs.color,
    padding: cs.padding,
    borderRadius: cs.borderRadius,
    fontSize: cs.fontSize,
    display: cs.display,
  }
})

const messages = await page.evaluate(() => (window).__jogakMessages)
const sawReady = messages.some((m) => m.data?.type === 'jogak:ready')
const sawRendered = messages.some((m) => m.data?.type === 'jogak:rendered')
const sawError = messages.some((m) => m.data?.type === 'jogak:error')

console.log(`adapter: ${ADAPTER_NAME}`)
console.log('badge styles:', JSON.stringify(styles, null, 2))
console.log('messages flow:', { sawReady, sawRendered, sawError })
console.log('errors:', errors)

const passes = []
const fails = []
const expect = (label, cond) => (cond ? passes : fails).push(label)

expect('jogak:ready emitted', sawReady)
expect('jogak:rendered emitted', sawRendered)
expect('no jogak:error', !sawError)
expect('bg=oklch(0.205 0 0)', styles.bg === 'oklch(0.205 0 0)')
expect('color=oklch(0.985 0 0)', styles.color === 'oklch(0.985 0 0)')
expect('borderRadius pill', parseFloat(styles.borderRadius) > 100)
expect('fontSize=12px', styles.fontSize === '12px')
expect('display=inline-flex', styles.display === 'inline-flex')
expect('no console errors', errors.length === 0)

console.log(`passes: ${passes.length}/${passes.length + fails.length}`, passes)
if (fails.length) console.log('fails:', fails)

await browser.close()
process.exit(fails.length === 0 ? 0 : 1)
