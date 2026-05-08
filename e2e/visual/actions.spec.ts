import { test, expect } from '@playwright/test'
import { waitForChromeReady } from './_helpers'

test.describe('Actions', () => {
  test('A-1: 1개 로그 발생', async ({ page }) => {
    await page.goto('/?entry=Components%2FButton&jogak=Primary')
    await expect(page.getByTestId('preview-content')).toBeVisible()
    await page.getByRole('tab', { name: 'actions' }).click()
    // preview 내 버튼 클릭 → onClick 액션 발생
    await page.getByTestId('preview-content').getByRole('button').click()

    // timestamp는 가변 → mask
    const logTimes = page.locator('li span').filter({ hasText: /^\d{2}:\d{2}:\d{2}\.\d{3}$/ })
    await waitForChromeReady(page)

    await expect(page.getByTestId('bottom-panel')).toHaveScreenshot('actions-one-log.png', {
      mask: [logTimes],
    })
  })
})
