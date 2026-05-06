# @jogak/web-components

Web Components adapter for [Jogak](https://github.com/devclib/jogak) — Preact runtime + Shadow DOM custom elements (~3 KB gzip).

## Install

```bash
pnpm add @jogak/web-components @jogak/core
```

Preact is bundled — no React peer required. Use this adapter when you want to ship Jogak entries as framework-agnostic custom elements.

## Usage

```ts
import { defineJogakElement } from '@jogak/web-components'
import { entries } from '../.jogak/registry'

for (const entry of entries) {
  const last = entry.title.split('/').pop()!.toLowerCase()
  defineJogakElement(`jogak-${last}`, entry)
}
```

```html
<jogak-button label="Hello" variant="primary"></jogak-button>
```

Shadow DOM provides style isolation; only the Preact runtime ships in the consumer bundle.

See the [main README](https://github.com/devclib/jogak#readme) for the full architecture and other adapters.

- Repository: https://github.com/devclib/jogak
- Issues: https://github.com/devclib/jogak/issues
- License: [MIT](./LICENSE)
