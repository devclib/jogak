/**
 * 알파.14: Vue 3 renderer adapter.
 *
 * jogak의 framework-agnostic JogakAdapter ABI를 Vue 3로 구현한다.
 * `vue`는 optional peer — 사용자가 vue를 install한 환경에서만 동작한다.
 *
 * 마운트 패턴:
 * - `createApp(component, props)` → `app.mount(container)`
 * - 동일 container에 재마운트 시 기존 app을 unmount 후 재생성 (Vue는 reactive props
 *   업데이트 통로가 createApp 인스턴스에 없음 — render 함수로 wrapping 가능하지만
 *   v1은 단순 unmount/remount).
 *
 * Function prop 자동 spy: jogak의 injectActions가 처리. Vue는 자식 emit이 아니라
 * props 형태로 function을 받으면 동작 (Vue 3의 일반 패턴).
 */

import { injectActions } from '../../index.js'
import type { JogakAdapter, RegistryEntry } from '../../index.js'

type ContainerWithApp = HTMLElement & {
  _jogakVueApp?: { unmount(): void }
}

interface VueCreateApp {
  (component: unknown, props?: Record<string, unknown>): {
    mount(container: HTMLElement): unknown
    unmount(): void
  }
}

let cachedCreateApp: VueCreateApp | undefined

async function loadCreateApp(): Promise<VueCreateApp> {
  if (cachedCreateApp !== undefined) return cachedCreateApp
  try {
    const mod = (await import('vue')) as { createApp: VueCreateApp }
    cachedCreateApp = mod.createApp
    return mod.createApp
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[jogak/vue-renderer] 'vue' 패키지가 설치되어 있지 않습니다.\n` +
        `install: npm i vue\noriginal: ${message}`,
    )
  }
}

export const vueAdapter: JogakAdapter = {
  framework: 'vue',

  async render(
    entry: RegistryEntry,
    args: Readonly<Record<string, unknown>>,
    container: HTMLElement,
  ): Promise<void> {
    const createApp = await loadCreateApp()
    const finalArgs = injectActions(args, entry.meta.argTypes ?? {})

    // Vue는 createApp 후 props 업데이트 통로가 별도라 동일 container 재마운트 시
    // 기존 app을 unmount하고 새로 만든다. props 변경이 잦은 jogak 시나리오에서
    // 약간의 비용이 있지만 단순/안정성 우선.
    const existing = (container as ContainerWithApp)._jogakVueApp
    if (existing !== undefined) {
      existing.unmount()
      delete (container as ContainerWithApp)._jogakVueApp
    }

    const app = createApp(entry.meta.component, finalArgs)
    app.mount(container)
    ;(container as ContainerWithApp)._jogakVueApp = app
  },

  unmount(container: HTMLElement): void {
    const app = (container as ContainerWithApp)._jogakVueApp
    app?.unmount()
    delete (container as ContainerWithApp)._jogakVueApp
  },
}
