# @jogak/react

React adapter for [Jogak](https://github.com/devclib/jogak): `useEntry` / `useRegistry` / `useRegistryMeta` hooks and `JogakProvider`.

## Install

```bash
pnpm add @jogak/react @jogak/core react react-dom
```

`react` / `react-dom` are peer dependencies (>=18).

## Usage

```tsx
import { JogakProvider, useEntry, useRegistryMeta } from '@jogak/react'
import { defaultRegistry } from '@jogak/core'

function Sidebar() {
  const { metas } = useRegistryMeta()
  return (
    <ul>
      {metas.map((m) => (
        <li key={m.id}>{m.title}</li>
      ))}
    </ul>
  )
}

function Preview({ id }: { id: string }) {
  const state = useEntry(id) // 'loading' | 'ready' | 'error' | 'unknown'
  if (state.status !== 'ready') return null
  return <div>{state.entry.title}</div>
}

export function App() {
  return (
    <JogakProvider registry={defaultRegistry}>
      <Sidebar />
      <Preview id="Components/Button" />
    </JogakProvider>
  )
}
```

`useEntry(id)` automatically requests entry hydration when an entry is selected — args/component edits in `*.jogak.tsx` files trigger in-place HMR via `import.meta.hot`.

See the [main README](https://github.com/devclib/jogak#readme) for architecture, lazy virtual modules, and HMR details.

- Repository: https://github.com/devclib/jogak
- Issues: https://github.com/devclib/jogak/issues
- License: [MIT](./LICENSE)
