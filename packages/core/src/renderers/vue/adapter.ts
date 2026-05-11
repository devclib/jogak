/**
 * 알파.14: Vue 3 renderer adapter.
 *
 * jogak의 framework-agnostic JogakAdapter ABI를 Vue 3로 구현한다.
 * `vue`는 optional peer — 사용자가 vue를 install한 환경에서만 동작한다.
 *
 * 마운트 패턴 (알파.14.1):
 * - `createApp(component, reactiveProps)` → `app.mount(container)`
 * - 동일 container + 동일 component에 재 render 시: 기존 app 유지하고
 *   reactiveProps만 mutate하여 Vue reactivity로 자동 갱신. (unmount/remount 없음)
 * - component가 바뀌면 기존 app을 unmount하고 새로 createApp.
 *
 * Function prop 자동 spy: jogak의 injectActions가 처리. Vue는 자식 emit이 아니라
 * props 형태로 function을 받으면 동작 (Vue 3의 일반 패턴).
 */

import { injectActions } from '../../index.js'
import type { JogakAdapter, RegistryEntry } from '../../index.js'

type Reactive = <T extends object>(target: T) => T
type NextTick = () => Promise<void>
type H = (component: unknown, props?: Record<string, unknown>) => unknown

type ContainerState = HTMLElement & {
  _jogakVueApp?: { unmount(): void }
  _jogakVueProps?: Record<string, unknown>
  _jogakVueComponent?: unknown
}

interface VueCreateApp {
  (component: unknown, props?: Record<string, unknown>): {
    mount(container: HTMLElement): unknown
    unmount(): void
  }
}

interface VueModule {
  createApp: VueCreateApp
  reactive: Reactive
  nextTick: NextTick
  h: H
}

let cachedVue: VueModule | undefined

async function loadVue(): Promise<VueModule> {
  if (cachedVue !== undefined) return cachedVue
  try {
    const mod = (await import('vue')) as VueModule
    cachedVue = {
      createApp: mod.createApp,
      reactive: mod.reactive,
      nextTick: mod.nextTick,
      h: mod.h,
    }
    return cachedVue
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[jogak/vue-renderer] 'vue' 패키지가 설치되어 있지 않습니다.\n` +
        `install: npm i vue\noriginal: ${message}`,
    )
  }
}

function syncReactiveProps(
  target: Record<string, unknown>,
  next: Record<string, unknown>,
): void {
  // 추가/변경
  for (const [key, value] of Object.entries(next)) {
    target[key] = value
  }
  // 제거된 키 삭제 (Vue가 undefined와 missing prop을 구분하므로 명시 삭제)
  for (const key of Object.keys(target)) {
    if (!(key in next)) {
      delete target[key]
    }
  }
}

export const vueAdapter: JogakAdapter = {
  framework: 'vue',

  async render(
    entry: RegistryEntry,
    args: Readonly<Record<string, unknown>>,
    container: HTMLElement,
  ): Promise<void> {
    const { createApp, reactive, nextTick, h } = await loadVue()
    const finalArgs = injectActions(args, entry.meta.argTypes ?? {})
    const state = container as ContainerState
    const nextComponent = entry.meta.component

    // Case 1: 동일 component 재 render → reactive props만 mutate.
    // Wrapper의 render가 reactiveProps를 dereference하므로 변경이 자동 trigger.
    if (
      state._jogakVueApp !== undefined &&
      state._jogakVueProps !== undefined &&
      state._jogakVueComponent === nextComponent
    ) {
      syncReactiveProps(state._jogakVueProps, finalArgs)
      // Vue reactivity는 microtask로 DOM에 반영. 호출자가 render 직후 DOM을
      // 검사해도 일관된 상태를 보도록 nextTick까지 await.
      await nextTick()
      return
    }

    // Case 2: 첫 mount 또는 component 변경 → 기존 app unmount 후 새로 생성.
    // createApp의 rootProps는 정적이라 reactive 갱신이 안 됨 → wrapper의 render에서
    // h(child, reactiveProps)로 spread해 child의 props에 reactivity 전달.
    if (state._jogakVueApp !== undefined) {
      state._jogakVueApp.unmount()
      delete state._jogakVueApp
      delete state._jogakVueProps
      delete state._jogakVueComponent
    }

    const reactiveProps = reactive({ ...finalArgs })
    const wrapper = {
      render: () => h(nextComponent, reactiveProps),
    }
    const app = createApp(wrapper)
    app.mount(container)
    state._jogakVueApp = app
    state._jogakVueProps = reactiveProps
    state._jogakVueComponent = nextComponent
  },

  unmount(container: HTMLElement): void {
    const state = container as ContainerState
    state._jogakVueApp?.unmount()
    delete state._jogakVueApp
    delete state._jogakVueProps
    delete state._jogakVueComponent
  },
}
