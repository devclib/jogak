import { test, expect } from '@playwright/test'
import { waitForChromeReady } from './_helpers'

test.describe('Actions', () => {
  test('A-1: 1개 로그 발생', async ({ page }) => {
    await page.goto('/?entry=Components%2FButton&jogak=Primary')
    await expect(page.getByTestId('preview-content')).toBeVisible()
    await page.getByRole('tab', { name: 'actions' }).click()
    // 알파.8+: preview는 iframe(`<iframe data-testid="preview-content">`)으로 격리.
    // iframe 내부 버튼은 frameLocator를 통해 접근한다.
    await page.frameLocator('[data-testid="preview-content"]').getByRole('button').click()

    // timestamp는 가변 → mask
    const logTimes = page.locator('li span').filter({ hasText: /^\d{2}:\d{2}:\d{2}\.\d{3}$/ })
    await waitForChromeReady(page)

    await expect(page.getByTestId('bottom-panel')).toHaveScreenshot('actions-one-log.png', {
      mask: [logTimes],
    })
  })
})
