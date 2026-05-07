# Jogak

> English · [한국어 README](./README.ko.md)

A lightweight, fast component showcase tool. A drop-in alternative to Storybook with the same workflow (`dev` / `build` / static deploy).

> Status: `0.1.0-alpha.0` — API is not yet stable.

## Numbers vs. Storybook

Same React catalog (N components, 3 entries each) set up on Storybook 8 (Vite builder) and Jogak.

| Metric | size 100 | size 500 | Notes |
|---|---|---|---|
| dev cold start | **1.7 s** vs 3.3 s (**2.0×**) | **2.9 s** vs 3.6 s (1.3×) | "First HTTP 200" |
| build time | **2.0 s** vs 2.9 s (1.4×) | **4.1 s** vs 7.6 s (**1.8×**) | gap widens with catalog size |
| bundle (gzip) | **108 KB** vs 716 KB (**6.6×**) | **156 KB** vs 1.09 MB (**7.0×**) | no manager bundle |
| dist total | **340 KB** vs 3 MB (**8.9×**) | **— vs —** | static hosting transfer |
| **idle RSS** (dev) | **321 MB** vs 403 MB (1.3×) | **345 MB** vs 489 MB (**1.4×**) | dev tree RSS median |
| **HMR** (warm median) | **153 ms** | **199 ms** | args edit → DOM, < 200 ms |

Reproduce: `pnpm bench:scale:full` · `pnpm bench:rss` · `pnpm bench:hmr`. Measurement code lives in `benchmarks/`.

## Why it's light

- **Single Vite instance** — no Storybook manager UI (separate React app), no preview iframe, no addon loader.
- **Lazy virtual modules** — the index module exposes only entry metadata; each entry's component is dynamically imported when the user clicks it. On first dev page load, the module graph contains zero user modules → idle RSS barely scales with catalog size.
- **child_process-isolated ts-morph** — props extraction runs in a separate child process. After 5 s of idle the child is SIGTERMed, so the OS reclaims the memory immediately.
- **In-place HMR** — when you edit a `*.jogak.tsx` file, index metadata is patched via a ws custom event, while args/component changes are picked up by the entry virtual module's self-accept and rehydrated automatically. No full reload.
- **Build-time props extraction** — no runtime `react-docgen`. ts-morph extracts types once at build time.
- **Minimal deps** — `vite` + `@vitejs/plugin-react` + `react`. No addon system.

## Requirements

- **Node** 20.18+ (or 22+, 24+) — uses `fetch`, `AbortSignal.timeout`, `node:test` parity APIs
- **React** 19.x — peer dependency
- **Vite** 6.x — peer dependency (when embedding)
- **TypeScript** 5.5+ — required for props auto-extraction (without `tsconfig.json`, extraction is skipped and you fall back to manual `meta.argTypes`)

## Quick start

```bash
pnpm add -D @jogak/cli @jogak/react

# author *.jogak.tsx next to your components (see example below)

npx jogak dev          # dev server (defaults to 5173)
npx jogak build        # static build → ./jogak-static/
```

The build output (`jogak-static/`) is `index.html` + a single JS chunk. Upload it as-is to GitHub Pages, Vercel, Netlify, S3 — anywhere. Adjust the base path with `--base /repo-name/`.

### Defining a component

```tsx
// Button.jogak.tsx
import type { JogakMeta, Jogak } from '@jogak/core'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
} satisfies JogakMeta

export default meta

export const Primary: Jogak = {
  name: 'Primary',
  args: { label: 'Click me', variant: 'primary' },
}

export const Disabled: Jogak = {
  name: 'Disabled',
  args: { label: 'Click me', variant: 'primary', disabled: true },
}
```

`Button`'s prop types — `variant: 'primary' | 'secondary'`, `disabled?: boolean`, `onClick?: (e) => void` — are auto-extracted into select/checkbox/Action controls.

### tsconfig

`@jogak/cli` auto-detects `<cwd>/tsconfig.json`. To use a different file:

```bash
npx jogak dev --ts-config ./tsconfig.app.json
```

If no `tsconfig` is found, props auto-extraction is skipped. You can define controls manually via `meta.argTypes`:

```tsx
const meta = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
    onClick: { action: true },
  },
} satisfies JogakMeta
```

## CLI

```
jogak dev [options]
  --patterns <glob[,glob...]>   '*.jogak.tsx' globs (default: src/**/*.jogak.{ts,tsx})
  --port <number>               default 5173
  --host <string>               'true'/'false'/host string
  --open [path]                 open browser on start
  --no-generate                 disable .jogak/registry.ts safety-net codegen
  --ts-config <path>            tsconfig path (default: <cwd>/tsconfig.json)
  --cwd <path>                  user project root (default: process.cwd())
  --code-theme <name>           prism theme (default: vsDark)

jogak build [options]
  --out-dir <path>              default 'jogak-static'
  --base <string>               public path. default './' (works anywhere)
  --minify <boolean|esbuild|terser>  default 'esbuild'
  --sourcemap                   default false
  --emit-registry               also emit .jogak/registry.ts during build

jogak generate [options]        # codegen for host-bundler embedding
  --out <path>                  default '.jogak/registry.ts'
```

## Core features

- **`*.jogak.tsx` convention** — meta + named exports define component variants
- **Props auto-extraction** — TypeScript types → text/number/boolean/select controls
- **Actions** — function props are auto-filled with spies; call logs show in the panel
- **URL deep linking** — `?entry=...&jogak=...` for sharing
- **Source code viewer** — prism-react-renderer (theme option)
- **Viewport / background toggle** — Mobile / Tablet / Desktop · White / Dark / Transparent
- **In-place HMR** — args edits trigger automatic entry rehydration; sidebar metadata reflows via ws patch

## Host embedding (optional)

Skip the `jogak dev` SPA and embed the catalog directly into an existing host (Next.js / Vite SPA / WC) bundle. Useful when you want to integrate with the host's routing or design system.

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

createRoot(rootEl).render(<JogakApp codeTheme={_jogakCodeTheme} />)
```

Evaluating the `virtual:jogak` index module auto-registers metadata on `defaultRegistry`. `<JogakApp />` (no args) reads from `defaultRegistry`. To pass a statically-decided list, use `<JogakApp entries={...} />`.

### Vite plugin options

```ts
jogak({
  patterns: ['src/**/*.jogak.tsx'],   // default: src/**/*.jogak.{ts,tsx}
  codeTheme: 'vsDark',                // prism theme
  cwd: __dirname,                     // glob base. default: vite config.root
  tsConfigFilePath: './tsconfig.json',// default: <cwd>/tsconfig.json (auto-detected)
  disableCacheValidation: false,      // auto-purge stale @jogak/* deps cache on dev boot (default on)
})
```

### Embed into Next.js App Router

Codegen `*.jogak.tsx` into plain TS that any host bundler can consume.

```bash
pnpm jogak generate --patterns 'src/**/*.jogak.tsx'
# → .jogak/registry.ts
```

```tsx
// app/jogak/page.tsx
'use client'
import dynamic from 'next/dynamic'
import { entries } from '../../../.jogak/registry'

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
  transpilePackages: ['@jogak/core', '@jogak/react', '@jogak/ui'],
  webpack(config) {
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] }
    return config
  },
}
```

### Web Components

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

Shadow DOM for style isolation, only the Preact runtime ships (~3 KB).

## Troubleshooting

### "does not provide an export named X" after a library update

When `@jogak/core` / `@jogak/react` is updated, Vite's `node_modules/.vite/deps` pre-bundle cache may go stale. The plugin auto-detects this on dev boot and purges the cache. If that doesn't kick in:

```bash
rm -rf node_modules/.vite
```

### HMR doesn't fire on a custom registry

If you inject your own instance via `<JogakProvider registry={customRegistry}>`, the HMR `jogak:meta-update` event only updates `defaultRegistry` (the plugin doesn't know which registry you're using). With a custom registry, jogak file changes fall back to a full reload.

### RSS spike right after boot

For the first ~5 s of dev, RSS can briefly hit 700 MB+ from esbuild prebundle + ts-morph child spawn. It settles within 5 s and drops further once lazy virtual modules kick in. On very memory-constrained environments (<1 GB), this initial spike can be risky.

## Packages

```
packages/
├── core              # registry, types, Vite plugin, ts-morph extractor, ActionChannel
├── react             # React adapter + JogakProvider
├── ui                # Sidebar / Preview / Controls / Actions, JogakApp + host
├── cli               # jogak dev / build / generate CLI
├── next              # Next.js App Router embedding shell
└── web-components    # Preact + Shadow DOM custom element
```

## Development

```bash
pnpm install
pnpm --filter @jogak/core build       # other packages depend on this
pnpm --filter @jogak/ui dev           # SPA demo (5173)
pnpm --filter next-demo dev           # Next embed demo
pnpm --filter wc-demo dev             # WC embed demo
```

### Tests

```bash
pnpm test                             # unit tests
pnpm test:e2e                         # Playwright e2e
```

### Benchmarks

```bash
pnpm bench                            # self benchmark (bundle / extract / cold-start)
pnpm bench:baseline                   # Jogak vs Storybook (size 5)
pnpm bench:scale                      # size 5/50/100
pnpm bench:scale:full                 # size 5/50/100/500
pnpm bench:rss                        # idle RSS (jogak vs storybook)
pnpm bench:hmr                        # HMR latency (size 50, 10 runs)
```

## Tech stack

TypeScript · React · pnpm workspaces · Vite · ts-morph · Preact · prism-react-renderer · Vitest · Playwright

## License

[MIT](./LICENSE)
