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

## Styling roadmap

| 단계 | 상태 | 내용 |
|------|------|------|
| alpha.4 | ✅ 본 릴리즈 | jogak UI 빌드 파이프라인에 Tailwind v4 + `jogak:` prefix 도입 (인프라) |
| alpha.5 | 예정 | jogak UI 컴포넌트를 Tailwind class로 마이그레이션 |
| alpha.6 | 예정 | 사용자 `globalCss` 옵션 지원 (`JogakPluginOptions.globalCss`) |
| alpha.7+ | 검토 | preview Shadow DOM / iframe 격리 옵션 |

### 현 한계 (alpha.4)

- jogak SPA는 사용자 프로젝트의 globalCss(예: Tailwind, shadcn/ui)를 자동 import하지 않습니다.
  jogak chrome은 자체 스타일만 사용하며, preview 안의 사용자 컴포넌트도 jogak 빌드 환경에서 렌더됩니다.
- 사용자 globalCss를 적용하려면 알파.6을 기다려 주세요.

- Repository: https://github.com/devclib/jogak
- Issues: https://github.com/devclib/jogak/issues
- License: [MIT](./LICENSE)
