/**
 * 1.0.0-beta.4 회귀 가드 — Sidebar empty state.
 *
 * 사용자가 `.jogak.{ts,tsx}` 파일을 아직 안 만든 상태에서 `jogak dev`를 실행하면
 * 이전에는 sidebar가 완전 빈 nav로 렌더 → 다음 액션을 알 수 없음. 첫 5분 UX 결함.
 *
 * fix: registry가 비어있으면 SidebarEmptyState 렌더 (boilerplate + docs 링크).
 * 검색 결과 zero도 SearchEmptyState로 대체.
 */
import { afterEach, describe, expect, test } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ComponentRegistry, type RegistryEntry } from '@jogak/core'
import { JogakProvider } from '@jogak/core/renderers/react'
import { Sidebar } from './index.js'

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

function sidebarWith(entries: RegistryEntry[]): HTMLElement {
  const registry = new ComponentRegistry()
  for (const e of entries) registry.register(e)
  return mount(
    createElement(JogakProvider, {
      registry,
      children: createElement(Sidebar, {
        selectedEntryId: null,
        selectedJogakName: null,
        onSelect: () => {},
      }),
    }),
  )
}

const buttonEntry: RegistryEntry = {
  id: 'Components/Button',
  title: 'Components/Button',
  jogaks: [{ name: 'Primary', args: {} }],
  meta: { title: 'Components/Button', component: () => null, framework: 'react' },
}

describe('Sidebar empty state — 1.0.0-beta.4', () => {
  test('registry empty → SidebarEmptyState 렌더 (boilerplate + docs 링크)', () => {
    const container = sidebarWith([])
    expect(container.querySelector('[data-testid="sidebar-empty"]')).not.toBeNull()
    // boilerplate 예시 코드가 포함
    expect(container.textContent).toContain('*.jogak.tsx')
    expect(container.textContent).toContain('JogakMeta')
    // docs 링크
    const link = container.querySelector('a[href^="https://jogak.dev"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('target')).toBe('_blank')
  })

  test('registry에 entry 있음 → empty state 없음, TreeView 렌더', () => {
    const container = sidebarWith([buttonEntry])
    expect(container.querySelector('[data-testid="sidebar-empty"]')).toBeNull()
    // entry 이름이 sidebar에 나타남
    expect(container.textContent).toContain('Button')
  })
})
