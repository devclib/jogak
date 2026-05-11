import { afterEach, describe, expect, test } from 'vitest'
import { act, createElement, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  ComponentRegistry,
  type Jogak,
  type RegistryEntry,
  type RegistryEntryMeta,
} from '../../index.js'
import { JogakProvider } from './JogakProvider.js'
import { useEntry, type UseEntryState } from './useEntry.js'
import { useRegistryMeta } from './useRegistryMeta.js'

// React 19 IS_REACT_ACT_ENVIRONMENT 플래그 — act 경고 억제.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface MountResult {
  readonly container: HTMLElement
  readonly root: Root
  unmount: () => void
}

async function mount(node: ReactNode): Promise<MountResult> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(node)
  })
  return {
    container,
    root,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function makeMeta(overrides: Partial<RegistryEntryMeta> = {}): RegistryEntryMeta {
  return {
    id: overrides.id ?? 'Form/Button',
    title: overrides.title ?? 'Form/Button',
    jogakNames: overrides.jogakNames ?? ['Default'],
    jogakDefaultArgs: overrides.jogakDefaultArgs ?? {},
    autoArgTypes: overrides.autoArgTypes ?? {},
    userArgTypes: overrides.userArgTypes ?? {},
    source: overrides.source ?? '// jogak source',
    filePath: overrides.filePath ?? '/abs/Button.jogak.tsx',
    metaExtras: overrides.metaExtras ?? {},
  }
}

function makeJogaks(): readonly Jogak[] {
  return [{ name: 'Default', args: { label: 'Hi' } }]
}

interface ProbeProps {
  readonly id: string
  readonly onState: (state: UseEntryState) => void
}

function EntryProbe({ id, onState }: ProbeProps) {
  const state = useEntry(id)
  const lastRef = useRef<UseEntryState | null>(null)
  useEffect(() => {
    if (lastRef.current !== state) {
      lastRef.current = state
      onState(state)
    }
  }, [state, onState])
  return null
}

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length > 0) {
    const fn = cleanups.pop()
    fn?.()
  }
  document.body.innerHTML = ''
})

describe('useEntry', () => {
  test('미등록 id → unknown', async () => {
    const registry = new ComponentRegistry()
    const states: UseEntryState[] = []
    const result = await mount(
      <JogakProvider registry={registry}>
        <EntryProbe id="missing" onState={(s) => states.push(s)} />
      </JogakProvider>,
    )
    cleanups.push(result.unmount)

    expect(states[0]).toEqual({ status: 'unknown' })
  })

  test('hydrated entry → ready 즉시 반환', async () => {
    const registry = new ComponentRegistry()
    const entry: RegistryEntry = {
      id: 'Form/Button',
      title: 'Form/Button',
      jogaks: makeJogaks(),
      meta: { title: 'Form/Button', component: () => null },
    }
    registry.register(entry)

    const states: UseEntryState[] = []
    const result = await mount(
      <JogakProvider registry={registry}>
        <EntryProbe id="Form/Button" onState={(s) => states.push(s)} />
      </JogakProvider>,
    )
    cleanups.push(result.unmount)

    expect(states[0]?.status).toBe('ready')
    if (states[0]?.status === 'ready') {
      expect(states[0].entry.id).toBe('Form/Button')
    }
  })

  test('meta 등록 + loader 주입 → loading → ready 전이', async () => {
    const registry = new ComponentRegistry()
    const meta = makeMeta()
    registry.registerMeta(meta)

    let resolveLoader!: () => void
    const loaderPromise = new Promise<void>((res) => {
      resolveLoader = res
    })
    registry.setEntryLoader(async () => {
      await loaderPromise
      registry.hydrateEntry(meta.id, makeJogaks(), () => null)
    })

    const states: UseEntryState[] = []
    const result = await mount(
      <JogakProvider registry={registry}>
        <EntryProbe id={meta.id} onState={(s) => states.push(s)} />
      </JogakProvider>,
    )
    cleanups.push(result.unmount)

    // mount 직후엔 loading 이어야 한다.
    expect(states[0]?.status).toBe('loading')
    if (states[0]?.status === 'loading') {
      expect(states[0].meta.id).toBe(meta.id)
    }

    await act(async () => {
      resolveLoader()
      await loaderPromise
    })

    const last = states[states.length - 1]
    expect(last?.status).toBe('ready')
    if (last?.status === 'ready') {
      expect(last.entry.title).toBe('Form/Button')
      expect(last.entry.jogaks).toHaveLength(1)
    }
  })

  test('loader reject → error 상태', async () => {
    const registry = new ComponentRegistry()
    const meta = makeMeta({ id: 'X' })
    registry.registerMeta(meta)
    registry.setEntryLoader(() => Promise.reject(new Error('boom')))

    const states: UseEntryState[] = []
    const result = await mount(
      <JogakProvider registry={registry}>
        <EntryProbe id="X" onState={(s) => states.push(s)} />
      </JogakProvider>,
    )
    cleanups.push(result.unmount)

    // microtask 흐름 동기화.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const last = states[states.length - 1]
    expect(last?.status).toBe('error')
    if (last?.status === 'error') {
      expect(last.error.message).toContain('boom')
    }
  })
})

interface MetaProbeProps {
  readonly onSnapshot: (info: {
    readonly count: number
    readonly searchHits: number
  }) => void
  readonly query: string
}

function MetaProbe({ onSnapshot, query }: MetaProbeProps) {
  const { metas, searchMeta } = useRegistryMeta()
  useEffect(() => {
    onSnapshot({
      count: metas.length,
      searchHits: searchMeta(query).length,
    })
  }, [metas, searchMeta, onSnapshot, query])
  return null
}

describe('useRegistryMeta', () => {
  test('registerMeta 후 mount하면 metas/searchMeta가 반영된다', async () => {
    const registry = new ComponentRegistry()
    registry.registerMeta(makeMeta({ id: 'Form/Button', title: 'Form/Button' }))
    registry.registerMeta(makeMeta({ id: 'Form/Input', title: 'Form/Input' }))
    registry.registerMeta(makeMeta({ id: 'Layout/Card', title: 'Layout/Card' }))

    const snaps: Array<{ count: number; searchHits: number }> = []
    const result = await mount(
      <JogakProvider registry={registry}>
        <MetaProbe query="form" onSnapshot={(s) => snaps.push(s)} />
      </JogakProvider>,
    )
    cleanups.push(result.unmount)

    const last = snaps[snaps.length - 1]
    expect(last?.count).toBe(3)
    expect(last?.searchHits).toBe(2)
  })

  test('mount 후 registerMeta → 자동 re-render + 새 meta 반영 (subscribe 경로)', async () => {
    const registry = new ComponentRegistry()
    registry.registerMeta(makeMeta({ id: 'Form/Button', title: 'Form/Button' }))

    const snaps: Array<{ count: number; searchHits: number }> = []
    const result = await mount(
      <JogakProvider registry={registry}>
        <MetaProbe query="form" onSnapshot={(s) => snaps.push(s)} />
      </JogakProvider>,
    )
    cleanups.push(result.unmount)

    // mount 직후 1건.
    expect(snaps[snaps.length - 1]?.count).toBe(1)
    expect(snaps[snaps.length - 1]?.searchHits).toBe(1)

    // mount 후 추가 등록 — useSyncExternalStore가 subscribe로 이를 반영해야 한다.
    await act(async () => {
      registry.registerMeta(makeMeta({ id: 'Form/Input', title: 'Form/Input' }))
    })

    expect(snaps[snaps.length - 1]?.count).toBe(2)
    expect(snaps[snaps.length - 1]?.searchHits).toBe(2)

    // 검색 미스 케이스도 검증.
    await act(async () => {
      registry.registerMeta(makeMeta({ id: 'Layout/Card', title: 'Layout/Card' }))
    })

    expect(snaps[snaps.length - 1]?.count).toBe(3)
    expect(snaps[snaps.length - 1]?.searchHits).toBe(2) // form만 매치
  })

  test('mutation 없으면 추가 re-render 0 (referential identity)', async () => {
    const registry = new ComponentRegistry()
    registry.registerMeta(makeMeta({ id: 'Form/Button', title: 'Form/Button' }))

    let renderCount = 0
    function Counter() {
      const { metas } = useRegistryMeta()
      renderCount += 1
      return <span data-count={metas.length} />
    }

    const result = await mount(
      <JogakProvider registry={registry}>
        <Counter />
      </JogakProvider>,
    )
    cleanups.push(result.unmount)

    const initial = renderCount
    expect(initial).toBeGreaterThan(0)

    // 100ms 동안 mutation 없이 대기 — 무한 re-render 방지 회귀 테스트.
    // (registry 캐시 + closure cache로 동일 reference가 보장되어야 한다.)
    await new Promise((res) => setTimeout(res, 100))

    expect(renderCount).toBe(initial)

    // mutation 1회 → 정확히 1회 추가 re-render.
    await act(async () => {
      registry.registerMeta(makeMeta({ id: 'Form/Input', title: 'Form/Input' }))
    })

    // act 외부 effect까지 동기화되도록 microtask 비우기.
    await new Promise((res) => setTimeout(res, 0))

    expect(renderCount).toBeGreaterThan(initial)
  })
})

// 'reactAdapter' 등 기존 export 시그니처 유지 보호용 임포트 — 빌드/타입 정합성 확인.
import { reactAdapter } from './adapter.js'
import { useRegistry } from './JogakProvider.js'
test('public exports 시그니처 보존 (smoke)', () => {
  expect(typeof reactAdapter.render).toBe('function')
  expect(typeof useRegistry).toBe('function')
  expect(typeof useEntry).toBe('function')
  expect(typeof useRegistryMeta).toBe('function')
})
