---
name: jogak-test-qa
description: "Jogak 라이브러리 테스트 및 QA를 실행한다. Vitest 단위 테스트, Playwright 시각적 회귀 테스트, Vitest 성능 벤치마크, 크로스 프레임워크 일관성 검증이 필요하면 반드시 이 스킬을 사용. 테스트 실행, 기준선 생성, QA 보고서 작성 포함."
---

# Jogak Test & QA

Jogak 라이브러리의 전체 테스트 전략과 실행 패턴을 담는다.

## 테스트 스택

| 유형 | 도구 | 위치 |
|------|------|------|
| 단위 테스트 | Vitest | `packages/*/src/__tests__/` |
| 시각적 회귀 | Playwright | `e2e/` |
| 성능 벤치마크 | Vitest bench | `benchmarks/` |
| 타입 검사 | tsc --noEmit | 루트 레벨 |
| 크로스 프레임워크 | Playwright | `e2e/cross-framework/` |

## Vitest 설정 (모노레포)

```typescript
// vitest.workspace.ts (루트)
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/core',
  'packages/react',
  'packages/next',
  'packages/web-components',
  'packages/ui',
])
```

```typescript
// packages/core/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',  // core는 DOM 불필요
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      thresholds: { lines: 80, functions: 80 },
    },
  },
})
```

## 단위 테스트 패턴

**레지스트리 테스트:**
```typescript
// packages/core/src/__tests__/registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ComponentRegistry } from '../registry'

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry

  beforeEach(() => {
    registry = new ComponentRegistry()  // 테스트마다 새 인스턴스 — 격리 보장
  })

  it('컴포넌트를 등록하고 조회한다', () => {
    const entry = { id: 'button', title: 'Form/Button', stories: [], meta: {} as any }
    registry.register(entry)
    expect(registry.get('button')).toEqual(entry)
  })

  it('카테고리 트리를 올바르게 구성한다', () => {
    registry.register({ id: 'a', title: 'Form/Button', stories: [], meta: {} as any })
    registry.register({ id: 'b', title: 'Form/Input', stories: [], meta: {} as any })
    const tree = registry.getTree()
    expect(tree).toHaveProperty('Form')
    expect(Object.keys(tree.Form)).toContain('Button')
  })
})
```

**Props 추출 테스트:**
```typescript
// 실제 .tsx 픽스처 파일로 테스트 — Mock 금지 (실제 TypeScript AST를 테스트해야 의미있다)
it('ButtonProps를 정확히 추출한다', () => {
  const result = extractPropsMetadata('fixtures/Button.tsx')
  expect(result.label).toMatchObject({ type: 'string' })
  expect(result.disabled).toMatchObject({ type: 'boolean', defaultValue: false })
})
```

## Playwright 시각적 회귀 테스트

```typescript
// e2e/visual/sidebar.spec.ts
import { test, expect } from '@playwright/test'

test('사이드바 컴포넌트 트리 렌더링', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await page.waitForSelector('[data-testid="sidebar"]')
  
  // 픽셀 수준 스냅샷 비교
  await expect(page.locator('[data-testid="sidebar"]')).toHaveScreenshot('sidebar.png', {
    maxDiffPixelRatio: 0.01,  // 1% 허용
  })
})

test('Props 컨트롤러 — boolean 토글', async ({ page }) => {
  await page.goto('http://localhost:5173/Form/Button')
  await page.getByLabel('disabled').click()  // 토글
  await expect(page.locator('[data-testid="preview"]')).toHaveScreenshot('button-disabled.png')
})
```

**스냅샷 업데이트 규칙:**
스냅샷 diff가 감지되면 의도된 변경인지 확인 후 `playwright test --update-snapshots` 실행.
자동으로 업데이트하지 않는다 — 회귀를 놓칠 수 있다.

## 성능 벤치마크

```typescript
// benchmarks/registry.bench.ts
import { bench, describe } from 'vitest'
import { ComponentRegistry } from '@jogak/core'

describe('ComponentRegistry 성능', () => {
  bench('100개 컴포넌트 등록', () => {
    const registry = new ComponentRegistry()
    for (let i = 0; i < 100; i++) {
      registry.register({ id: `comp-${i}`, title: `Category/Comp${i}`, stories: [], meta: {} as any })
    }
  })

  bench('카테고리 트리 생성 (100개)', () => {
    const registry = createRegistryWith(100)
    registry.getTree()
  })
})
```

**기준선 저장:**
첫 실행 시 `benchmarks/baseline.json`에 결과를 저장한다.
이후 실행에서 10% 이상 저하 시 경고를 보고서에 포함한다.

```typescript
// benchmarks/compare.ts
const current = JSON.parse(readFileSync('_workspace/03_test-report/bench.json', 'utf-8'))
const baseline = JSON.parse(readFileSync('benchmarks/baseline.json', 'utf-8'))

for (const [name, result] of Object.entries(current)) {
  const base = baseline[name]
  const ratio = result.mean / base.mean
  if (ratio > 1.1) console.warn(`⚠ 성능 회귀: ${name} — ${((ratio - 1) * 100).toFixed(1)}% 느려짐`)
}
```

## 크로스 프레임워크 일관성 검증

동일 스토리가 세 어댑터에서 동일하게 렌더링되는지 검증한다.

```typescript
// e2e/cross-framework/Button.spec.ts
import { test, expect } from '@playwright/test'

const STORY_ID = 'Form/Button'
const ARGS = { label: 'Submit', disabled: false }

const adapters = [
  { name: 'React SPA', url: 'http://localhost:5173' },
  { name: 'Next.js', url: 'http://localhost:3000' },
  { name: 'Web Components', url: 'http://localhost:5174' },
]

test('동일 스토리는 모든 프레임워크에서 동일한 DOM 구조를 가진다', async ({ page }) => {
  const snapshots: string[] = []

  for (const adapter of adapters) {
    await page.goto(`${adapter.url}/${STORY_ID}`)
    await page.waitForSelector('[data-testid="preview-content"]')
    const html = await page.locator('[data-testid="preview-content"]').innerHTML()
    snapshots.push(normalizeHtml(html))  // 공백, 속성 순서 정규화
  }

  // 세 어댑터의 HTML이 동일해야 한다
  expect(snapshots[0]).toBe(snapshots[1])
  expect(snapshots[1]).toBe(snapshots[2])
})
```

**normalizeHtml**: 클래스 순서, 공백, 브라우저별 차이를 제거하는 정규화 함수.
이 함수가 없으면 의미 없는 차이에서 테스트가 실패한다.

## 테스트 결과 보고서 형식

`_workspace/03_test-report/summary.md`:
```markdown
# Jogak 테스트 결과 — {날짜}

## 단위 테스트
- 통과: {N}개 / 전체: {M}개
- 커버리지: {lines}% lines
- 실패 항목: (있으면 목록)

## 시각적 회귀
- 새 스냅샷: {N}개
- Diff 감지: {M}개 (각 항목 파일 경로 및 diff% 포함)

## 성능 벤치마크
| 벤치마크 | 현재 (ms) | 기준선 (ms) | 변화 |
|---------|----------|------------|------|
| ...     | ...      | ...        | ...  |

## 크로스 프레임워크 검증
- React SPA ↔ Next.js: {결과}
- Next.js ↔ Web Components: {결과}

## 타입 검사
- tsc --noEmit: {PASS / FAIL}
```
