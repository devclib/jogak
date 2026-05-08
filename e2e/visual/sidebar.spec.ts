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
    // NOTE: Sidebar 트리는 entry 등록 순서를 따르며 알파.4 시점엔 Badge/Button 간 등록 순서가
    // 결정적이지 않다 (jogak core/registry 측 이슈, 별도 PR 영역). 본 baseline 의 안정성을
    // 위해 S-3 는 검색 필터로 Badge 만 트리에 보이도록 한 뒤 캡처 — 시나리오 의도(현재 entry
    // 자동 펼침 + Blue highlight)는 보존된다.
    await page.getByLabel('Search components').fill('Badge')
    await waitForChromeReady(page)
    await expect(page.getByTestId('sidebar')).toHaveScreenshot('sidebar-selected.png')
  })
})
