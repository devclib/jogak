import { defineJogakElement } from '@jogak/core/renderers/web-components'
import { entries } from '../.jogak/registry.js'

for (const entry of entries) {
  const last = entry.title.split('/').pop()
  if (last === undefined) continue
  defineJogakElement(`jogak-${last.toLowerCase()}`, entry)
}
