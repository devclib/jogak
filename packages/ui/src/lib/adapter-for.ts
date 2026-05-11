/**
 * 알파.14.1: framework별 renderer adapter dispatch router.
 *
 * `RegistryEntryMeta.framework` 필드를 보고 적절한 어댑터를 dynamic import한다.
 * React-only 사용자가 Vue/Svelte 모듈을 로딩 받지 않도록 dynamic import + 모듈 캐시.
 *
 * 지원 framework:
 *   - 'react' / 'next' → `@jogak/core/renderers/react#reactAdapter`
 *   - 'vue'            → `@jogak/core/renderers/vue#vueAdapter`
 *   - 'svelte'         → `@jogak/core/renderers/svelte#svelteAdapter`
 *   - 'web-components' → 내부 wrapper (defineJogakElement 기반)
 *
 * 알 수 없는 framework는 명시적 에러 메시지로 throw한다.
 */

import type { JogakAdapter, RegistryEntry } from '@jogak/core'

/** RegistryEntryMeta.framework가 받을 수 있는 모든 값 (JogakAdapter.framework와 동일). */
export type FrameworkKey =
  | 'react'
  | 'next'
  | 'web-components'
  | 'vue'
  | 'svelte'

const cache = new Map<FrameworkKey, JogakAdapter>()
const inflight = new Map<FrameworkKey, Promise<JogakAdapter>>()

/**
 * framework 이름으로 어댑터를 가져온다. 첫 호출은 dynamic import, 이후는 캐시 반환.
 *
 * 동시에 같은 framework로 호출되는 경우(예: 여러 effect가 동시에 await)에도 단 한 번만
 * import가 일어나도록 inflight Promise를 공유한다.
 */
export async function adapterFor(framework: string): Promise<JogakAdapter> {
  const key = framework as FrameworkKey
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const pending = inflight.get(key)
  if (pending !== undefined) return pending

  const loader = loadAdapter(key)
  inflight.set(key, loader)
  try {
    const adapter = await loader
    cache.set(key, adapter)
    return adapter
  } finally {
    inflight.delete(key)
  }
}

async function loadAdapter(framework: FrameworkKey): Promise<JogakAdapter> {
  switch (framework) {
    case 'react':
    case 'next': {
      // Next.js의 client-side 렌더링도 React 18+ root API와 동일하므로 reactAdapter 재사용.
      const mod = await import('@jogak/core/renderers/react')
      return mod.reactAdapter
    }
    case 'vue': {
      const mod = await import('@jogak/core/renderers/vue')
      return mod.vueAdapter
    }
    case 'svelte': {
      const mod = await import('@jogak/core/renderers/svelte')
      return mod.svelteAdapter
    }
    case 'web-components': {
      const mod = await import('@jogak/core/renderers/web-components')
      return createWebComponentsAdapter(mod.defineJogakElement)
    }
    default: {
      throw new Error(
        `[jogak/ui] Unknown framework: '${framework as string}'. ` +
          `Expected one of: 'react' | 'next' | 'vue' | 'svelte' | 'web-components'.`,
      )
    }
  }
}

// ── web-components wrapper ────────────────────────────────
//
// web-components renderer는 `defineJogakElement(tagName, entry)`로 custom element를
// 등록하는 형태로, `JogakAdapter` ABI(render/unmount(container))를 직접 제공하지 않는다.
// UI 측 dispatch 통일을 위해 thin wrapper로 감싼다.

type CustomElementHost = HTMLElement & {
  setAttribute(name: string, value: string): void
}

type WCContainer = HTMLElement & {
  _jogakWCElement?: HTMLElement
  _jogakWCTagName?: string
}

function entryToTagName(entryId: string): string {
  // entryId는 `Category/Subcategory/Name` 형태일 수 있다. custom element는 dash를
  // 포함한 lowercase여야 하므로 안전한 문자만 남기고 'jogak-' prefix를 부여한다.
  const safe = entryId
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
  return `jogak-${safe || 'entry'}`
}

function serializeAttribute(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  // 함수/객체는 attribute로 표현 불가 — null로 skip(어댑터가 injectActions 처리).
  if (typeof value === 'function' || typeof value === 'object') return null
  return String(value)
}

function createWebComponentsAdapter(
  defineJogakElement: (tagName: string, entry: RegistryEntry) => void,
): JogakAdapter {
  return {
    framework: 'web-components',
    render(
      entry: RegistryEntry,
      args: Readonly<Record<string, unknown>>,
      container: HTMLElement,
    ): void {
      const state = container as WCContainer
      const tagName = entryToTagName(entry.id)
      defineJogakElement(tagName, entry)

      let el = state._jogakWCElement
      if (el === undefined || state._jogakWCTagName !== tagName) {
        // entry가 바뀐 경우(다른 tagName) 기존 element 제거 후 재생성.
        if (el !== undefined) el.remove()
        el = document.createElement(tagName) as CustomElementHost
        container.replaceChildren(el)
        state._jogakWCElement = el
        state._jogakWCTagName = tagName
      }

      for (const [key, value] of Object.entries(args)) {
        const serialized = serializeAttribute(value)
        if (serialized === null) {
          el.removeAttribute(key)
        } else {
          el.setAttribute(key, serialized)
        }
      }
    },
    unmount(container: HTMLElement): void {
      const state = container as WCContainer
      const el = state._jogakWCElement
      if (el !== undefined) {
        el.remove()
      }
      delete state._jogakWCElement
      delete state._jogakWCTagName
    },
  }
}

// ── test-only helpers ─────────────────────────────────────

/**
 * @internal test-only. 어댑터 캐시를 초기화한다.
 *
 * cache hit/miss 테스트, framework lookup 격리 테스트에 사용. 프로덕션 코드에서는
 * 호출하지 말 것 — dynamic import의 비용이 발생한다.
 */
export function __resetAdapterCacheForTesting(): void {
  cache.clear()
  inflight.clear()
}
