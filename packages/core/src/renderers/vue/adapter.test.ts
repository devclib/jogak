/**
 * 알파.14: Vue renderer adapter 단위 테스트.
 *
 * happy-dom 환경에서 실제 vue를 import해 mount/unmount/재마운트 동작을 검증한다.
 * action spy 주입은 jogak core의 injectActions가 책임 — 별도 테스트.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { vueAdapter } from './adapter.js'
import type { RegistryEntry } from '../../index.js'

function makeEntry(component: unknown, argTypes?: Record<string, unknown>): RegistryEntry {
  return {
    id: 'X',
    title: 'X',
    jogaks: [],
    meta: {
      title: 'X',
      component,
      ...(argTypes !== undefined ? { argTypes: argTypes as RegistryEntry['meta']['argTypes'] } : {}),
    },
  }
}

describe('vueAdapter', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    vueAdapter.unmount(container)
    container.remove()
  })

  it('Vue 3 컴포넌트를 container에 마운트해 props를 반영한다', async () => {
    const Hello = {
      props: ['name'],
      template: '<div data-testid="hello">Hello {{ name }}</div>',
    }
    await vueAdapter.render(makeEntry(Hello), { name: 'jogak' }, container)
    const el = container.querySelector('[data-testid="hello"]')
    expect(el?.textContent).toBe('Hello jogak')
  })

  it('동일 container에 재마운트하면 새 props가 반영된다', async () => {
    const Hello = {
      props: ['name'],
      template: '<div data-testid="hello">{{ name }}</div>',
    }
    await vueAdapter.render(makeEntry(Hello), { name: 'first' }, container)
    expect(container.querySelector('[data-testid="hello"]')?.textContent).toBe('first')
    await vueAdapter.render(makeEntry(Hello), { name: 'second' }, container)
    expect(container.querySelector('[data-testid="hello"]')?.textContent).toBe('second')
  })

  it('unmount 시 container가 비워진다', async () => {
    const Hello = {
      props: ['name'],
      template: '<div data-testid="hello">{{ name }}</div>',
    }
    await vueAdapter.render(makeEntry(Hello), { name: 'jogak' }, container)
    expect(container.querySelector('[data-testid="hello"]')).not.toBeNull()
    vueAdapter.unmount(container)
    expect(container.querySelector('[data-testid="hello"]')).toBeNull()
  })

  it('function prop을 받아 click 이벤트가 호출된다', async () => {
    const onClick = vi.fn()
    const Btn = {
      props: ['onClick'],
      template: '<button data-testid="btn" @click="onClick">click</button>',
    }
    await vueAdapter.render(makeEntry(Btn), { onClick }, container)
    const btn = container.querySelector('[data-testid="btn"]') as HTMLButtonElement
    btn.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
