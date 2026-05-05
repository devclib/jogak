import { test, expect } from '@playwright/test'

test.describe('Jogak SPA', () => {
  test('홈에서 사이드바가 표시된다', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('sidebar')).toBeVisible()
  })

  test('URL 딥링크로 진입하면 Preview가 렌더된다', async ({ page }) => {
    await page.goto('/?entry=Components%2FBadge&jogak=Blue')
    await expect(page.getByTestId('preview-content')).toBeVisible()
    await expect(page.getByTestId('preview-content')).toContainText('New')
  })

  test('Args를 변경하면 URL이 유지되고 Reset 버튼이 나타난다', async ({ page }) => {
    await page.goto('/?entry=Components%2FBadge&jogak=Blue')
    await expect(page.getByTestId('preview-content')).toBeVisible()

    const labelInput = page.locator('input[type="text"]').first()
    await labelInput.fill('Updated')
    await expect(page.getByTestId('preview-content')).toContainText('Updated')

    const reset = page.getByRole('button', { name: 'Reset' })
    await expect(reset).toBeVisible()
    await reset.click()
    await expect(reset).toBeHidden()
  })

  test('소스 코드 토글이 동작한다', async ({ page }) => {
    await page.goto('/?entry=Components%2FBadge&jogak=Blue')
    const codeButton = page.getByRole('button', { name: 'Show source code' })
    await codeButton.click()
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible()
  })
})
