# @jogak/next

Next.js App Router embedding shell for [Jogak](https://github.com/devclib/jogak).

## Install

```bash
pnpm add @jogak/next @jogak/core @jogak/ui
```

`next`, `react`, `react-dom` are peer dependencies (Next >=14, React >=18).

## Usage

Generate a static registry from `*.jogak.tsx` files, then mount on any App Router route:

```bash
pnpm jogak generate --patterns 'src/**/*.jogak.tsx'
# → .jogak/registry.ts
```

```tsx
// app/jogak/page.tsx
'use client'
import dynamic from 'next/dynamic'
import { entries } from '../../.jogak/registry'

const JogakApp = dynamic(
  () => import('@jogak/ui').then((m) => ({ default: m.JogakApp })),
  { ssr: false },
)

export default function Page() {
  return <JogakApp entries={entries} codeTheme="vsDark" />
}
```

```js
// next.config.mjs
export default {
  webpack(config) {
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] }
    return config
  },
}
```

Server / client subpaths are exposed for advanced layout integration:

```ts
import { JogakLayout, type JogakLayoutProps } from '@jogak/next/server'      // RSC layout
import { JogakClientShell, type JogakClientShellProps } from '@jogak/next/client' // client shell
```

See the [main README](https://github.com/devclib/jogak#readme) for the host embedding guide.

- Repository: https://github.com/devclib/jogak
- Issues: https://github.com/devclib/jogak/issues
- License: [MIT](./LICENSE)
