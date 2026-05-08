import { test, expect } from '@playwright/test'
import { waitForChromeReady } from './_helpers'

test.describe('Preview', () => {
  test('P-1: ready 상태 (component pixel은 mask)', async ({ page }) => {
    await page.goto('/?entry=Components%2FBadge&jogak=Blue')
    await expect(page.getByTestId('preview-content')).toBeVisible()
    await waitForChromeReady(page)

    // chrome(toolbar/bottom panel)만 검증, 컴포넌트 캔버스 픽셀은 mask
    await expect(page.locator('main')).toHaveScreenshot('preview-ready.png', {
      mask: [page.getByTestId('preview-content')],
    })
  })

  test('P-2: source code 토글 ON', async ({ page }) => {
    await page.goto('/?entry=Components%2FBadge&jogak=Blue')
    await expect(page.getByTestId('preview-content')).toBeVisible()
    await page.getByRole('button', { name: 'Show source code' }).click()
    // Prism highlight 안정화
    await page.getByRole('button', { name: 'Copy' }).waitFor({ state: 'visible' })
    await waitForChromeReady(page)

    await expect(page.locator('main')).toHaveScreenshot('preview-source-on.png', {
      mask: [
        page.getByTestId('preview-content'),
        // syntax-highlighted source는 Prism 버전에 따라 미세 변동 가능 → mask
        page.locator('pre').first(),
      ],
    })
  })

  test('P-3: dark 배경 + tablet 뷰포트', async ({ page }) => {
    await page.goto('/?entry=Components%2FBadge&jogak=Blue')
    await expect(page.getByTestId('preview-content')).toBeVisible()
    await page.getByRole('button', { name: 'dark background' }).click()
    await page.getByRole('button', { name: 'Tablet' }).click()
    await waitForChromeReady(page)

    await expect(page.locator('main')).toHaveScreenshot('preview-dark-tablet.png', {
      mask: [page.getByTestId('preview-content')],
    })
  })
})
