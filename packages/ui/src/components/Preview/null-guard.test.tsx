/**
 * 1.0.0-beta 회귀 가드 — chrome scope stub(component=null) 처리.
 *
 * alpha.14.1에서 도입된 chrome scope stub은 사용자 vite/dev server scope가 component를
 * hydrate하는 전제로 동작. 사용자 vite 없는 환경(Next/Nuxt/standalone fallback)에서
 * stub이 그대로 chrome SPA의 mount path에 도달하면 React.createElement(null) 등
 * framework별 불명확 에러 발생.
 *
 * 본 fix는 NoneAdapterContent + ShadowAdapterContent + preview-frame.tsx 세 path에
 * component=null guard를 추가해 placeholder UI로 대체. 본 test는 chrome scope 두 path에
 * 대한 회귀 가드.
 */
import { afterEach, describe, expect, test } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ComponentRegistry, type RegistryEntry } from '@jogak/core'
import { JogakProvider } from '@jogak/core/renderers/react'
import { Preview } from './index.js'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function buildStubEntry(id: string): RegistryEntry {
  return {
    id,
    title: id,
    jogaks: [{ name: 'Default', args: {} }],
    meta: {
      title: id,
      argTypes: {},
      // chrome scope stub — component=null
      component: null,
      framework: 'react',
    },
  }
}

interface MountResult {
  readonly container: HTMLElement
  readonly root: Root
}

const mounts: MountResult[] = []

function mount(node: ReturnType<typeof createElement>): MountResult {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(node)
  })
  const result = { container, root }
  mounts.push(result)
  return result
}

afterEach(() => {
  for (const m of mounts) {
    act(() => { m.root.unmount() })
    m.container.remove()
  }
  mounts.length = 0
})

function renderPreview(entry: RegistryEntry, previewIsolation: 'none' | 'shadow'): HTMLElement {
  const registry = new ComponentRegistry()
  registry.register(entry)
  const previewNode = createElement(Preview, {
    entryId: entry.id,
    jogakName: 'Default',
    overrideArgs: {},
    onArgChange: () => {},
    onReset: () => {},
    codeTheme: 'vsDark',
    previewIsolation,
  })
  const result = mount(
    createElement(JogakProvider, { registry, children: previewNode }),
  )
  return result.container
}

describe('Preview — chrome scope stub guard (1.0.0-beta)', () => {
  test('previewIsolation=none + component=null: placeholder 표시, createElement(null) 회피', () => {
    const container = renderPreview(buildStubEntry('Atoms/Stub'), 'none')

    const placeholder = container.querySelector('[data-jogak-preview-placeholder]')
    expect(placeholder).not.toBeNull()
    expect(container.querySelector('[data-testid="preview-content"]')).not.toBeNull()
    expect(container.textContent).toContain('Atoms/Stub')
  })

  test('previewIsolation=shadow + component=null: placeholder 표시', () => {
    const container = renderPreview(buildStubEntry('Atoms/StubShadow'), 'shadow')

    // ShadowMount는 portal을 ShadowRoot에 mount — container.querySelector로 안 잡힘.
    // shadow root 안에서 검색.
    const host = container.querySelector('[data-testid="preview-content"]')
    expect(host).not.toBeNull()
    const shadowRoot = (host as Element & { shadowRoot: ShadowRoot | null }).shadowRoot
    expect(shadowRoot).not.toBeNull()
    const placeholder = shadowRoot!.querySelector('[data-jogak-preview-placeholder]')
    expect(placeholder).not.toBeNull()
    expect(shadowRoot!.textContent).toContain('Atoms/StubShadow')
  })
})
