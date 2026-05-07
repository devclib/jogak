# @jogak/ui

Showcase viewer UI for [Jogak](https://github.com/devclib/jogak) — `Sidebar` / `Preview` / `Controls` / `Actions` and the `JogakApp` shell.

## Install

```bash
pnpm add @jogak/ui @jogak/core @jogak/react react react-dom
```

`react` / `react-dom` are peer dependencies (>=18). `vite` and `@vitejs/plugin-react` are optional peers (only when using the Vite plugin).

## Usage

### Embed into a Vite SPA

```ts
// vite.config.ts
import { jogak } from '@jogak/core/vite'

export default defineConfig({
  plugins: [react(), jogak({ codeTheme: 'vsDark' })],
})
```

```tsx
// main.tsx
import 'virtual:jogak'
import { _jogakCodeTheme } from 'virtual:jogak'
import { JogakApp } from '@jogak/ui'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <JogakApp codeTheme={_jogakCodeTheme} />,
)
```

### Static catalog (Next.js / any host bundler)

```tsx
import { JogakApp } from '@jogak/ui'
import { entries } from '../.jogak/registry'

export default function Page() {
  return <JogakApp entries={entries} codeTheme="vsDark" />
}
```

`@jogak/ui` ships pre-built ESM/CJS — no `transpilePackages` required for Next.js.

### Sub-paths

```ts
import { runHost } from '@jogak/ui/host' // Node-only, used by @jogak/cli
```

> ⚠️ `@jogak/ui/host` requires `vite` and `@vitejs/plugin-react` at runtime. They are declared as **optional peers** because the main `JogakApp` export does not need them — install them only when using `runHost`:
>
> ```bash
> pnpm add -D vite @vitejs/plugin-react
> ```

See the [main README](https://github.com/devclib/jogak#readme) for the full host embedding guide.

- Repository: https://github.com/devclib/jogak
- Issues: https://github.com/devclib/jogak/issues
- License: [MIT](./LICENSE)
