/**
 * 알파.14: Vue renderer adapter 단위 테스트.
 *
 * happy-dom 환경에서 실제 vue를 import해 mount/unmount/재 render 동작을 검증한다.
 * 알파.14.1: 동일 component 재 render는 unmount/remount 대신 reactive props mutate.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { vueAdapter } from './adapter.js'
import type { RegistryEntry } from '../../index.js'

function makeEntry(component: unknown): RegistryEntry {
  return {
    id: 'X',
    title: 'X',
    jogaks: [],
    meta: { title: 'X', component },
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

  it('동일 component 재 render는 unmount 없이 reactive props만 갱신한다', async () => {
    const Hello = {
      props: ['name'],
      template: '<div data-testid="hello">{{ name }}</div>',
    }
    await vueAdapter.render(makeEntry(Hello), { name: 'first' }, container)
    const firstEl = container.querySelector('[data-testid="hello"]')
    expect(firstEl?.textContent).toBe('first')

    await vueAdapter.render(makeEntry(Hello), { name: 'second' }, container)
    const secondEl = container.querySelector('[data-testid="hello"]')
    // 같은 DOM 노드가 갱신되어야 함 — unmount/remount였다면 새 노드.
    expect(secondEl).toBe(firstEl)
    expect(secondEl?.textContent).toBe('second')
  })

  it('component가 바뀌면 unmount 후 새 component를 마운트한다', async () => {
    const Hello = {
      props: ['name'],
      template: '<div data-testid="hello">{{ name }}</div>',
    }
    const Bye = {
      props: ['name'],
      template: '<div data-testid="bye">{{ name }}</div>',
    }
    await vueAdapter.render(makeEntry(Hello), { name: 'a' }, container)
    expect(container.querySelector('[data-testid="hello"]')).not.toBeNull()
    await vueAdapter.render(makeEntry(Bye), { name: 'b' }, container)
    expect(container.querySelector('[data-testid="hello"]')).toBeNull()
    expect(container.querySelector('[data-testid="bye"]')?.textContent).toBe('b')
  })

  it('undefined로 설정된 prop은 control 토글 시 갱신된다', async () => {
    const Hello = {
      props: ['name', 'title'],
      template: '<div data-testid="hello">{{ title ?? "(none)" }}-{{ name }}</div>',
    }
    await vueAdapter.render(
      makeEntry(Hello),
      { name: 'jogak', title: 'TITLE' },
      container,
    )
    expect(container.querySelector('[data-testid="hello"]')?.textContent).toBe(
      'TITLE-jogak',
    )
    // 사용자가 control에서 title을 비우면 args에서 undefined로 전달
    await vueAdapter.render(
      makeEntry(Hello),
      { name: 'jogak', title: undefined },
      container,
    )
    expect(container.querySelector('[data-testid="hello"]')?.textContent).toBe(
      '(none)-jogak',
    )
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
