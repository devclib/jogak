import type { Page } from '@playwright/test'

/** 폰트/이미지 로딩 + 첫 paint 안정화 헬퍼. */
export async function waitForChromeReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  // requestAnimationFrame 1 tick으로 layout 안정화
  await page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      ),
  )
}
