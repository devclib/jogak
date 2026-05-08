import { test, expect } from '@playwright/test'
import { waitForChromeReady } from './_helpers'

test.describe('Sidebar', () => {
  test('S-1: 초기 트리 상태', async ({ page }) => {
    await page.goto('/')
    await waitForChromeReady(page)
    await expect(page.getByTestId('sidebar')).toHaveScreenshot('sidebar-initial.png')
  })

  test('S-2: 검색 결과', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Search components').fill('Bad')
    await waitForChromeReady(page)
    await expect(page.getByTestId('sidebar')).toHaveScreenshot('sidebar-search.png')
  })

  test('S-3: entry 선택 (현재 entry 자동 펼침)', async ({ page }) => {
    await page.goto('/?entry=Components%2FBadge&jogak=Blue')
    await waitForChromeReady(page)
    await expect(page.getByTestId('sidebar')).toHaveScreenshot('sidebar-selected.png')
  })
})
