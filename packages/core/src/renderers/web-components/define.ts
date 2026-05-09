import { h, render } from 'preact'
import type { ComponentType } from 'preact'
import { injectActions } from '../../index.js'
import type { ArgType, RegistryEntry } from '../../index.js'

/**
 * RegistryEntry를 Custom Element로 등록한다.
 *
 * Shadow DOM으로 스타일을 격리하므로 호스트 페이지 스타일이 프리뷰를 오염하지 않는다.
 * Preact를 사용하여 React 런타임(~150KB) 없이 ~3KB로 렌더링한다.
 *
 * Attribute로 받은 값은 string이므로 ArgType.type을 보고 boolean/number로 캐스팅한다.
 * 함수 prop은 attribute로 받을 수 없으므로 어댑터가 자동으로 Action spy를 주입한다.
 */
export function defineJogakElement(tagName: string, entry: RegistryEntry): void {
  if (customElements.get(tagName) !== undefined) return

  class JogakPreviewElement extends HTMLElement {
    #args: Record<string, unknown> = {}
    #shadow: ShadowRoot

    static get observedAttributes(): readonly string[] {
      return Object.keys(entry.meta.argTypes ?? {})
    }

    constructor() {
      super()
      this.#shadow = this.attachShadow({ mode: 'open' })
    }

    connectedCallback(): void {
      this.#render()
    }

    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
      const argType = entry.meta.argTypes?.[name]
      this.#args = {
        ...this.#args,
        [name]: parseAttributeValue(newValue, argType),
      }
      this.#render()
    }

    disconnectedCallback(): void {
      render(null, this.#shadow)
    }

    #render(): void {
      const Component = entry.meta.component as ComponentType<Record<string, unknown>>
      const finalArgs = injectActions(this.#args, entry.meta.argTypes ?? {})
      render(h(Component, finalArgs), this.#shadow)
    }
  }

  customElements.define(tagName, JogakPreviewElement)
}

function parseAttributeValue(raw: string | null, argType: ArgType | undefined): unknown {
  if (raw === null) return undefined
  if (argType?.type === 'boolean') return raw !== 'false' && raw !== '0'
  if (argType?.type === 'number') return Number(raw)
  return raw
}
