# @jogak/core

Core types, registry, and Vite plugin for [Jogak](https://github.com/devclib/jogak) — a lightweight Storybook alternative.

## Install

```bash
pnpm add @jogak/core
# or: npm i @jogak/core / yarn add @jogak/core
```

## Usage

### Vite plugin (dev/build)

```ts
// vite.config.ts
import { jogak } from '@jogak/core/vite'

export default defineConfig({
  plugins: [react(), jogak()],
})
```

### Build-time codegen (host bundler embedding)

```ts
import { generateRegistryFile } from '@jogak/core/build'

await generateRegistryFile({
  patterns: ['src/**/*.jogak.tsx'],
  cwd: process.cwd(),
  outFile: '.jogak/registry.ts',
})
```

### Registry / types

```ts
import { defaultRegistry } from '@jogak/core'
import type { JogakMeta, Jogak, RegistryEntry, ArgType } from '@jogak/core'
```

See the [main README](https://github.com/devclib/jogak#readme) for architecture, CLI, host embedding, and Storybook benchmarks.

- Repository: https://github.com/devclib/jogak
- Issues: https://github.com/devclib/jogak/issues
- License: [MIT](./LICENSE)
