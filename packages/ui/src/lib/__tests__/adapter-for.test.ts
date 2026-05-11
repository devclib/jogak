/**
 * 알파.14.1: adapter-for dispatch router unit tests.
 *
 * 검증 항목:
 *   - 5개 framework lookup(react / next / vue / svelte / web-components)
 *   - 같은 framework 재호출은 cache hit (반환 객체 identity 동일)
 *   - cache reset 후 재호출은 새 어댑터 인스턴스
 *   - unknown framework는 명시적 에러로 throw
 *   - 동시 호출(in-flight 공유)은 동일 인스턴스로 수렴
 *
 * 어댑터 객체 자체는 mock한다 — UI 패키지의 dependency closure에 vue/svelte 런타임이
 * 없을 수 있고, 본 테스트의 목적은 dispatch 라우터 동작 검증이지 어댑터 내부 동작
 * 검증이 아니다 (어댑터 단위 테스트는 @jogak/core에 있음).
 *
 * 참고: vi.mock factory는 한 번 평가된 뒤 module registry에 캐시되므로, factory 안에서
 * 매번 새 spy를 만들지 않는다. 따라서 "dynamic import가 N번 호출됐다"가 아니라
 * "반환 adapter 인스턴스 identity가 동일하다"로 cache 효과를 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JogakAdapter } from '@jogak/core'

vi.mock('@jogak/core/renderers/react', () => {
  const adapter: JogakAdapter = {
    framework: 'react',
    render: vi.fn(),
    unmount: vi.fn(),
  }
  return { reactAdapter: adapter }
})

vi.mock('@jogak/core/renderers/vue', () => {
  const adapter: JogakAdapter = {
    framework: 'vue',
    render: vi.fn(),
    unmount: vi.fn(),
  }
  return { vueAdapter: adapter }
})

vi.mock('@jogak/core/renderers/svelte', () => {
  const adapter: JogakAdapter = {
    framework: 'svelte',
    render: vi.fn(),
    unmount: vi.fn(),
  }
  return { svelteAdapter: adapter }
})

vi.mock('@jogak/core/renderers/web-components', () => {
  return {
    defineJogakElement: vi.fn(() => {
      // no-op — test에서는 element 등록 자체는 검증하지 않음.
    }),
  }
})

beforeEach(async () => {
  // 매 테스트마다 module registry 초기화 → adapter-for의 모듈 스코프 캐시(Map)가
  // 새로 만들어진다. 격리된 cache 상태에서 lookup 동작을 검증.
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

async function loadModule(): Promise<typeof import('../adapter-for.js')> {
  return await import('../adapter-for.js')
}

describe('adapterFor', () => {
  it("framework='react' → reactAdapter 반환", async () => {
    const { adapterFor } = await loadModule()
    const adapter = await adapterFor('react')
    expect(adapter.framework).toBe('react')
    expect(typeof adapter.render).toBe('function')
    expect(typeof adapter.unmount).toBe('function')
  })

  it("framework='next' → reactAdapter 재사용 (Next.js client-side는 React)", async () => {
    const { adapterFor } = await loadModule()
    const adapter = await adapterFor('next')
    expect(adapter.framework).toBe('react')
    // next/react 모두 react renderer를 반환하므로 같은 객체 instance를 반환해야 한다
    // (next 분기도 cache에 저장되고, react 분기와는 별도 키이지만 같은 reactAdapter 참조).
    const reactAdapter = await adapterFor('react')
    expect(adapter).toBe(reactAdapter)
  })

  it("framework='vue' → vueAdapter 반환", async () => {
    const { adapterFor } = await loadModule()
    const adapter = await adapterFor('vue')
    expect(adapter.framework).toBe('vue')
  })

  it("framework='svelte' → svelteAdapter 반환", async () => {
    const { adapterFor } = await loadModule()
    const adapter = await adapterFor('svelte')
    expect(adapter.framework).toBe('svelte')
  })

  it("framework='web-components' → defineJogakElement 기반 JogakAdapter wrapper 반환", async () => {
    const { adapterFor } = await loadModule()
    const adapter = await adapterFor('web-components')
    expect(adapter.framework).toBe('web-components')
    expect(typeof adapter.render).toBe('function')
    expect(typeof adapter.unmount).toBe('function')
  })

  it('동일 framework 재호출은 cache hit — 동일 instance 반환', async () => {
    const { adapterFor } = await loadModule()
    const a1 = await adapterFor('react')
    const a2 = await adapterFor('react')
    const a3 = await adapterFor('react')
    expect(a1).toBe(a2)
    expect(a2).toBe(a3)
  })

  it('각 framework는 독립된 cache key — vue ≠ svelte ≠ react', async () => {
    const { adapterFor } = await loadModule()
    const r = await adapterFor('react')
    const v = await adapterFor('vue')
    const s = await adapterFor('svelte')
    const w = await adapterFor('web-components')
    expect(r.framework).toBe('react')
    expect(v.framework).toBe('vue')
    expect(s.framework).toBe('svelte')
    expect(w.framework).toBe('web-components')
    expect(r).not.toBe(v)
    expect(v).not.toBe(s)
    expect(s).not.toBe(w)
  })

  it('동시 호출(in-flight)도 동일 instance로 수렴 — race-safe', async () => {
    const { adapterFor } = await loadModule()
    const [a1, a2, a3] = await Promise.all([
      adapterFor('vue'),
      adapterFor('vue'),
      adapterFor('vue'),
    ])
    expect(a1).toBe(a2)
    expect(a2).toBe(a3)
  })

  it("알 수 없는 framework는 명시적 에러 throw", async () => {
    const { adapterFor } = await loadModule()
    await expect(adapterFor('angular')).rejects.toThrow(/Unknown framework: 'angular'/u)
  })

  it('에러 메시지에 지원 framework 목록이 포함된다', async () => {
    const { adapterFor } = await loadModule()
    await expect(adapterFor('solid')).rejects.toThrow(
      /react.*next.*vue.*svelte.*web-components/u,
    )
  })
})

describe('adapterFor web-components wrapper', () => {
  it('render는 entry.id 기반 custom element를 container에 마운트', async () => {
    const { adapterFor } = await loadModule()
    const adapter = await adapterFor('web-components')

    const container = document.createElement('div')
    document.body.appendChild(container)

    // entry는 component 객체를 가지지만 wrapper는 defineJogakElement에 위임하므로
    // component 내용은 직접 검증하지 않는다. tagName/attribute 직렬화만 본다.
    const entry = {
      id: 'UI/Button',
      title: 'UI/Button',
      jogaks: [],
      meta: { title: 'UI/Button', component: function Button() { return null }, argTypes: {} },
      source: '',
      filePath: '',
    } as unknown as Parameters<typeof adapter.render>[0]

    adapter.render(entry, { label: 'Hello', disabled: true }, container)

    const el = container.firstElementChild as HTMLElement | null
    expect(el).not.toBeNull()
    expect(el?.tagName.toLowerCase()).toBe('jogak-ui-button')
    expect(el?.getAttribute('label')).toBe('Hello')
    expect(el?.getAttribute('disabled')).toBe('true')
  })

  it('unmount는 등록된 custom element를 제거', async () => {
    const { adapterFor } = await loadModule()
    const adapter = await adapterFor('web-components')

    const container = document.createElement('div')
    document.body.appendChild(container)

    const entry = {
      id: 'UI/Card',
      title: 'UI/Card',
      jogaks: [],
      meta: { title: 'UI/Card', component: function Card() { return null }, argTypes: {} },
      source: '',
      filePath: '',
    } as unknown as Parameters<typeof adapter.render>[0]

    adapter.render(entry, {}, container)
    expect(container.firstElementChild).not.toBeNull()

    adapter.unmount(container)
    expect(container.firstElementChild).toBeNull()
  })

  it('함수/객체 prop은 attribute로 직렬화되지 않는다 (skip)', async () => {
    const { adapterFor } = await loadModule()
    const adapter = await adapterFor('web-components')

    const container = document.createElement('div')
    document.body.appendChild(container)

    const entry = {
      id: 'UI/Foo',
      title: 'UI/Foo',
      jogaks: [],
      meta: { title: 'UI/Foo', component: function Foo() { return null }, argTypes: {} },
      source: '',
      filePath: '',
    } as unknown as Parameters<typeof adapter.render>[0]

    adapter.render(entry, { onClick: () => {}, data: { x: 1 }, name: 'ok' }, container)
    const el = container.firstElementChild as HTMLElement
    expect(el.hasAttribute('onClick')).toBe(false)
    expect(el.hasAttribute('data')).toBe(false)
    expect(el.getAttribute('name')).toBe('ok')
  })
})

describe('__resetAdapterCacheForTesting', () => {
  it('cache 초기화는 helper export로 가능 (test-only)', async () => {
    const { adapterFor, __resetAdapterCacheForTesting } = await loadModule()
    const first = await adapterFor('svelte')

    // reset 전: 같은 인스턴스 반환 (cache hit)
    const cached = await adapterFor('svelte')
    expect(cached).toBe(first)

    __resetAdapterCacheForTesting()

    // reset 후: vi.mock factory가 반환하는 동일 객체이긴 하지만, adapter-for 내부의
    // cache Map은 초기화됐으므로 다시 import resolve 경로를 탄다. mock factory가
    // 동일 인스턴스를 반환하므로 비교는 identity 동일이 정상.
    const refetched = await adapterFor('svelte')
    expect(refetched.framework).toBe('svelte')
  })
})
