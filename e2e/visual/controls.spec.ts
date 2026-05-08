import { test, expect } from '@playwright/test'
import { waitForChromeReady } from './_helpers'

test.describe('Controls', () => {
  test('C-1: Args 기본 상태', async ({ page }) => {
    await page.goto('/?entry=Components%2FBadge&jogak=Blue')
    await expect(page.getByTestId('preview-content')).toBeVisible()
    await waitForChromeReady(page)

    // bottom panel = controls/actions 탭 영역.
    // spec §3.2 NOTE에 따라 Preview/index.tsx의 panel div에 data-testid="bottom-panel" 추가됨.
    await expect(page.getByTestId('bottom-panel')).toHaveScreenshot('controls-default.png')
  })

  test('C-2: Args 수정 후 Reset 노출', async ({ page }) => {
    await page.goto('/?entry=Components%2FBadge&jogak=Blue')
    await expect(page.getByTestId('preview-content')).toBeVisible()
    const labelInput = page.locator('input[type="text"]').first()
    await labelInput.fill('Updated')
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
    await waitForChromeReady(page)

    // toolbar(Reset 노출) + bottom panel을 모두 포함하는 main 영역 캡처
    await expect(page.locator('main')).toHaveScreenshot('controls-modified.png', {
      mask: [page.getByTestId('preview-content')],
    })
  })
})
