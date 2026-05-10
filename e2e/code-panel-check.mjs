import { chromium } from '@playwright/test'

const HOST = process.env.HOST_URL || 'http://localhost:5173'

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

await page.goto(HOST, { waitUntil: 'networkidle' })

// Sidebar 트리: Badge → Default 진입
const badgeBtn = page.locator('button:has-text("Badge")').first()
if (await badgeBtn.count() > 0) {
  await badgeBtn.click()
  await page.waitForTimeout(200)
}
const defaultBtn = page.locator('button:has-text("Default")').first()
if (await defaultBtn.count() > 0) await defaultBtn.click()

// 코드 패널 토글 — </> 버튼
await page.locator('button[aria-label*="source code"]').click()
await page.waitForTimeout(500)

// pre 안의 텍스트 읽기 — 모든 라인 합침
const codeText = await page.locator('pre').first().innerText()
console.log('=== Code panel content ===')
console.log(codeText)
console.log('===========================')

// 검증: jogak 메타 키워드("title:", "satisfies JogakMeta", "argTypes")가 보이면 안됨
const failures = []
const banned = ['JogakMeta', 'satisfies', 'argTypes', 'export default meta', 'export const Default']
for (const pat of banned) {
  if (codeText.includes(pat)) failures.push(`'${pat}' should NOT appear (it's jogak meta, not usage)`)
}

// 검증: 컴포넌트 사용 형태 ("<Badge", "</Badge>") 가 보여야 함
const required = ['<Badge', '</Badge>', 'variant="default"', 'New']
for (const pat of required) {
  if (!codeText.includes(pat)) failures.push(`'${pat}' MUST appear (usage code)`)
}

if (failures.length === 0) {
  console.log('✓ Code panel shows usage code (not jogak meta)')
} else {
  console.log('✗ FAILURES:')
  for (const f of failures) console.log(`  - ${f}`)
}

await browser.close()
process.exit(failures.length === 0 ? 0 : 1)
