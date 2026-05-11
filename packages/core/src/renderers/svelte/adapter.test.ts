/**
 * 알파.14: Svelte renderer adapter 단위 테스트.
 *
 * Svelte 5 compile 환경 설정(vite-plugin-svelte) 없이도 adapter ABI를 검증한다.
 * `svelte`의 `mount`/`unmount`를 vi.mock으로 가로채 호출 횟수/인자/순서를 확인한다.
 *
 * 실제 .svelte 컴파일된 컴포넌트 렌더링 검증은 fixture e2e에서 별도 수행.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegistryEntry } from '../../index.js'

const mockInstance = Symbol('svelte-instance')
const mountFn = vi.fn(() => mockInstance)
const unmountFn = vi.fn()

vi.mock('svelte', () => ({
  mount: mountFn,
  unmount: unmountFn,
}))

// 실제 모듈 import — vi.mock 이전에 import하면 안 됨.
const { svelteAdapter } = await import('./adapter.js')

function makeEntry(component: unknown): RegistryEntry {
  return {
    id: 'X',
    title: 'X',
    jogaks: [],
    meta: { title: 'X', component },
  }
}

describe('svelteAdapter', () => {
  let container: HTMLElement
  const FakeComponent = function fakeSvelteComponent() {
    /* compiled svelte component placeholder */
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    mountFn.mockClear()
    unmountFn.mockClear()
  })

  afterEach(() => {
    svelteAdapter.unmount(container)
    container.remove()
  })

  it('Svelte mount를 컴포넌트 + target + props로 호출한다', async () => {
    await svelteAdapter.render(makeEntry(FakeComponent), { count: 42 }, container)
    expect(mountFn).toHaveBeenCalledTimes(1)
    const arg = mountFn.mock.calls[0]
    expect(arg?.[0]).toBe(FakeComponent)
    expect(arg?.[1]).toMatchObject({ target: container, props: { count: 42 } })
  })

  it('재마운트 시 기존 instance를 unmount 후 새로 mount한다', async () => {
    await svelteAdapter.render(makeEntry(FakeComponent), { count: 1 }, container)
    await svelteAdapter.render(makeEntry(FakeComponent), { count: 2 }, container)
    expect(unmountFn).toHaveBeenCalledTimes(1)
    expect(unmountFn).toHaveBeenCalledWith(mockInstance)
    expect(mountFn).toHaveBeenCalledTimes(2)
    expect(mountFn.mock.calls[1]?.[1]).toMatchObject({ props: { count: 2 } })
  })

  it('unmount 시 svelte unmount를 호출하고 container 트래킹을 정리한다', async () => {
    await svelteAdapter.render(makeEntry(FakeComponent), {}, container)
    svelteAdapter.unmount(container)
    expect(unmountFn).toHaveBeenCalledWith(mockInstance)
    // 다시 unmount 호출해도 unmountFn은 추가 호출되지 않는다.
    svelteAdapter.unmount(container)
    expect(unmountFn).toHaveBeenCalledTimes(1)
  })

  it('framework metadata가 svelte다', () => {
    expect(svelteAdapter.framework).toBe('svelte')
  })
})
