/**
 * 알파.14: Svelte 5 renderer adapter.
 *
 * jogak의 framework-agnostic JogakAdapter ABI를 Svelte 5의 `mount`/`unmount` API로
 * 구현한다. `svelte`는 optional peer — 사용자가 svelte 5+를 install한 환경에서만 동작.
 *
 * 마운트 패턴:
 * - Svelte 5: `mount(Component, { target, props })` → unmount용 핸들 반환
 * - 동일 container에 재마운트 시 기존 인스턴스를 unmount 후 재생성 (props 업데이트
 *   reactivity를 활용하려면 $state proxy 필요 — v1은 단순 mount/remount).
 *
 * Function prop 자동 spy: jogak의 injectActions가 처리. Svelte 5는 `onclick`/`onChange`
 * 형태로 props에서 직접 받는 패턴이라 그대로 동작.
 */

import { injectActions } from '../../index.js'
import type { JogakAdapter, RegistryEntry } from '../../index.js'

type ContainerWithComponent = HTMLElement & {
  _jogakSvelteInstance?: unknown
}

interface SvelteMount {
  (
    component: unknown,
    options: { target: HTMLElement; props?: Record<string, unknown> },
  ): unknown
}
interface SvelteUnmount {
  (instance: unknown): void
}

let cachedMount: SvelteMount | undefined
let cachedUnmount: SvelteUnmount | undefined

async function loadSvelte(): Promise<{ mount: SvelteMount; unmount: SvelteUnmount }> {
  if (cachedMount !== undefined && cachedUnmount !== undefined) {
    return { mount: cachedMount, unmount: cachedUnmount }
  }
  try {
    const mod = (await import('svelte')) as {
      mount: SvelteMount
      unmount: SvelteUnmount
    }
    cachedMount = mod.mount
    cachedUnmount = mod.unmount
    return { mount: mod.mount, unmount: mod.unmount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[jogak/svelte-renderer] 'svelte' 5+ 패키지가 설치되어 있지 않습니다.\n` +
        `install: npm i svelte@^5\noriginal: ${message}`,
    )
  }
}

export const svelteAdapter: JogakAdapter = {
  framework: 'svelte',

  async render(
    entry: RegistryEntry,
    args: Readonly<Record<string, unknown>>,
    container: HTMLElement,
  ): Promise<void> {
    const { mount, unmount } = await loadSvelte()
    const finalArgs = injectActions(args, entry.meta.argTypes ?? {})

    const existing = (container as ContainerWithComponent)._jogakSvelteInstance
    if (existing !== undefined) {
      unmount(existing)
      delete (container as ContainerWithComponent)._jogakSvelteInstance
    }

    const instance = mount(entry.meta.component, {
      target: container,
      props: finalArgs as Record<string, unknown>,
    })
    ;(container as ContainerWithComponent)._jogakSvelteInstance = instance
  },

  unmount(container: HTMLElement): void {
    const instance = (container as ContainerWithComponent)._jogakSvelteInstance
    if (instance !== undefined && cachedUnmount !== undefined) {
      cachedUnmount(instance)
    }
    delete (container as ContainerWithComponent)._jogakSvelteInstance
  },
}
