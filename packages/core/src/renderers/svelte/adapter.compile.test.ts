/**
 * 알파.14.1: Svelte renderer — 실제 .svelte 컴파일 결과를 마운트하는 e2e 단위 테스트.
 *
 * happy-dom + @sveltejs/vite-plugin-svelte로 실제 컴파일된 Hello.svelte를 import해
 * svelteAdapter.render/unmount가 정상 DOM 출력을 만들어내는지 검증한다.
 * (adapter.test.ts는 vi.mock 기반 ABI 검증 — 양쪽 모두 유지.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { svelteAdapter } from './adapter.js'
import Hello from './__fixtures__/Hello.svelte'
import type { RegistryEntry } from '../../index.js'

function makeEntry(component: unknown): RegistryEntry {
  return {
    id: 'X',
    title: 'X',
    jogaks: [],
    meta: { title: 'X', component },
  }
}

describe('svelteAdapter (real .svelte compilation)', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    svelteAdapter.unmount(container)
    container.remove()
  })

  it('컴파일된 .svelte 컴포넌트를 마운트해 props가 DOM에 반영된다', async () => {
    await svelteAdapter.render(makeEntry(Hello), { name: 'jogak' }, container)
    const el = container.querySelector('[data-testid="hello"]')
    expect(el?.textContent).toBe('Hello jogak')
  })

  it('재마운트 시 새 props가 DOM에 반영된다', async () => {
    await svelteAdapter.render(makeEntry(Hello), { name: 'first' }, container)
    expect(container.querySelector('[data-testid="hello"]')?.textContent).toBe(
      'Hello first',
    )
    await svelteAdapter.render(makeEntry(Hello), { name: 'second' }, container)
    expect(container.querySelector('[data-testid="hello"]')?.textContent).toBe(
      'Hello second',
    )
  })

  it('function prop을 받아 click 이벤트가 호출된다', async () => {
    const onPing = vi.fn()
    await svelteAdapter.render(makeEntry(Hello), { onPing }, container)
    const btn = container.querySelector('[data-testid="ping"]') as HTMLButtonElement
    btn.click()
    expect(onPing).toHaveBeenCalledTimes(1)
  })

  it('unmount 시 container가 비워진다', async () => {
    await svelteAdapter.render(makeEntry(Hello), { name: 'jogak' }, container)
    expect(container.querySelector('[data-testid="hello"]')).not.toBeNull()
    svelteAdapter.unmount(container)
    expect(container.querySelector('[data-testid="hello"]')).toBeNull()
  })
})
