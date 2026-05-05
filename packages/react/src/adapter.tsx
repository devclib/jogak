import { createElement } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { injectActions } from '@jogak/core'
import type { JogakAdapter, RegistryEntry } from '@jogak/core'

type ContainerWithRoot = HTMLElement & { _jogakRoot?: Root }

export const reactAdapter: JogakAdapter = {
  framework: 'react',

  render(entry: RegistryEntry, args: Readonly<Record<string, unknown>>, container: HTMLElement): void {
    const Component = entry.meta.component as ComponentType<Record<string, unknown>>
    const finalArgs = injectActions(args, entry.meta.argTypes ?? {})

    const existing = (container as ContainerWithRoot)._jogakRoot
    if (existing !== undefined) {
      existing.render(createElement(Component, finalArgs))
    } else {
      const root = createRoot(container)
      root.render(createElement(Component, finalArgs))
      ;(container as ContainerWithRoot)._jogakRoot = root
    }
  },

  unmount(container: HTMLElement): void {
    const root = (container as ContainerWithRoot)._jogakRoot
    root?.unmount()
    delete (container as ContainerWithRoot)._jogakRoot
  },
}
