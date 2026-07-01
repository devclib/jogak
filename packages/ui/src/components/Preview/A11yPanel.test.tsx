/**
 * 1.0.0-beta.3 회귀 가드 — A11yPanel 상태별 렌더링.
 *
 * A11yPanel은 IframeMount의 onA11yResult 콜백을 통해 받은 axe-core 결과를 표시.
 * 4가지 상태 각각 대응하는 UI를 검증.
 */
import { afterEach, describe, expect, test } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { JogakA11yViolation } from '@jogak/core'
import { A11yPanel } from './A11yPanel.js'
import type { A11yResult } from './IframeMount.js'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface MountResult {
  readonly container: HTMLElement
  readonly root: Root
}

const mounts: MountResult[] = []

function mount(node: ReturnType<typeof createElement>): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => { root.render(node) })
  mounts.push({ container, root })
  return container
}

afterEach(() => {
  for (const m of mounts) {
    act(() => { m.root.unmount() })
    m.container.remove()
  }
  mounts.length = 0
})

const sampleViolation: JogakA11yViolation = {
  id: 'button-name',
  impact: 'critical',
  description: 'Buttons must have discernible text',
  help: 'Buttons must have discernible text',
  helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/button-name',
  nodes: [
    {
      target: ['button.icon-only'],
      html: '<button class="icon-only"><svg>...</svg></button>',
      failureSummary: 'Fix any of: Element does not have inner text',
    },
  ],
}

describe('A11yPanel — 1.0.0-beta.3', () => {
  test('result=null → loading 상태', () => {
    const container = mount(createElement(A11yPanel, { result: null }))
    expect(container.textContent).toContain('Running accessibility check')
  })

  test('notInstalled=true → axe-core install 안내 + install 명령', () => {
    const result: A11yResult = { violations: [], notInstalled: true }
    const container = mount(createElement(A11yPanel, { result }))
    expect(container.textContent).toContain('axe-core is not installed')
    expect(container.textContent).toContain('pnpm add -D axe-core')
  })

  test('violations=[] + notInstalled=false → success 메시지', () => {
    const result: A11yResult = { violations: [], notInstalled: false }
    const container = mount(createElement(A11yPanel, { result }))
    expect(container.textContent).toContain('No accessibility violations detected')
  })

  test('violations 있음 → ViolationCard 렌더 (impact, help, description, helpUrl, nodes)', () => {
    const result: A11yResult = { violations: [sampleViolation], notInstalled: false }
    const container = mount(createElement(A11yPanel, { result }))
    // 카운트 표시
    expect(container.textContent).toContain('1 violation detected')
    // impact
    expect(container.textContent?.toLowerCase()).toContain('critical')
    // help/description
    expect(container.textContent).toContain('Buttons must have discernible text')
    // helpUrl 링크
    const link = container.querySelector('a[href^="https://dequeuniversity.com"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('target')).toBe('_blank')
    // node CSS selector
    expect(container.textContent).toContain('button.icon-only')
  })

  test('violations 다수 → 카운트 복수형', () => {
    const result: A11yResult = {
      violations: [sampleViolation, { ...sampleViolation, id: 'label' }],
      notInstalled: false,
    }
    const container = mount(createElement(A11yPanel, { result }))
    expect(container.textContent).toContain('2 violations detected')
  })
})
