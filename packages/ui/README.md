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
| alpha.4 | ✅ 완료 | jogak UI 빌드 파이프라인에 Tailwind v4 + `jogak:` prefix 도입 (인프라) |
| alpha.5 | ✅ 완료 | jogak UI 컴포넌트를 Tailwind class로 마이그레이션 (4 PR) |
| **alpha.6** | ✅ **본 릴리즈** | **사용자 `globalCss` 옵션 (`JogakPluginOptions.globalCss`)** |
| alpha.7+ | 예정 | preview Shadow DOM / iframe 격리 옵션 (`previewIsolation`) |

### 사용자 globalCss 적용 (alpha.6)

`runHost`는 vite root를 `@jogak/ui` 패키지로 두고 사용자 `vite.config.ts` / `main.tsx`를 무시하므로(`configFile: false`), 사용자 `index.css`(Tailwind/shadcn 디자인 토큰)가 jogak SPA에 자동 적용되지 않습니다. `globalCss` 옵션은 이를 opt-in으로 해결합니다.

#### 사용법

```ts
// vite.config.ts — 자동 감지 (shadcn/ui Vite 시나리오)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { jogak } from '@jogak/core/vite'

export default defineConfig({
  plugins: [react(), jogak({ globalCss: true })],
})
```

`globalCss: true`는 다음 후보를 우선순위 순으로 자동 감지해 **첫 발견 1개**만 import합니다:

1. `src/index.css` (shadcn/ui Vite)
2. `src/main.css`
3. `src/styles.css`
4. `src/styles/globals.css` (Next.js shadcn)
5. `src/styles/index.css`
6. `src/app/globals.css` (Next.js App Router shadcn)
7. `src/global.css`
8. `src/app.css`

명시 경로(상대/절대) 또는 배열도 사용 가능합니다:

```ts
// 명시 경로 1개
jogak({ globalCss: './src/index.css' })

// 다중 import (디자인 토큰 + reset 분리)
jogak({ globalCss: ['./src/tokens.css', './src/reset.css'] })
```

#### 격리 보장

- **Tailwind utility class**: jogak UI는 `prefix=jogak`로 빌드되어 사용자 utility와 충돌 zero (예: 사용자 `bg-primary` ≠ jogak `jogak:bg-...`).
- **CSS variable**: jogak은 `--jogak-*` prefix로 namespace 격리 → 사용자 `:root { --primary }` 같은 디자인 토큰은 영향 없음.
- **Form element 보호**: `[data-jogak-shell]` 안의 button/input/select/textarea는 사용자 reset의 `border` / `background` / `color` 침범을 받지 않도록 `:where()` 보호 rule 적용. specificity 0이라 사용자가 명시적으로 `[data-jogak-shell] button { ... }`를 작성하면 정상 override됩니다.

#### scope 가이드 — 알려진 영향 영역

사용자 css의 다음 패턴은 jogak chrome에도 영향을 줄 수 있습니다 (전역 import이므로):

- `body { ... }` — jogak SPA의 body에도 적용
- `* { ... }` 또는 `*, *::before { ... }` — 모든 요소
- 글로벌 reset (`button { all: unset }`, `* { border: 1px solid var(--border) }` 등)

이를 사용자 콘텐츠 영역(preview)으로만 한정하려면 셀렉터를 `[data-jogak-content] *` scope로 작성하세요:

```css
/* 권장: preview 영역으로만 한정 */
[data-jogak-content] *,
[data-jogak-content] *::before,
[data-jogak-content] *::after {
  box-sizing: border-box;
}

[data-jogak-content] button {
  /* 사용자 디자인 시스템 button reset */
  all: unset;
}
```

또는 jogak chrome과 preview 모두에 일관된 사용자 디자인 시스템을 적용하려는 의도라면 그대로 두면 됩니다 — jogak chrome도 사용자 토큰/타이포를 함께 체험하게 됩니다.

##### selector hint

- `[data-jogak-shell]` — `JogakApp` 최상위 wrapper (chrome + preview 모두 포함)
- `[data-jogak-content]` — Preview의 사용자 콘텐츠 영역 (사용자 컴포넌트가 렌더되는 div)

#### 알려진 한계

- 본 옵션은 **opt-in**입니다 (default `false`). 알파.5까지의 동작은 동일합니다.
- `globalCss: true` 자동 감지는 dev 시작 시점에 한 번만 수행됩니다. 후보 css 파일이 dev 시작 후에 새로 추가되면 dev 서버를 재시작해야 합니다. 명시 경로(`globalCss: './src/index.css'`)는 파일이 나중에 생성되어도 정상 hot reload됩니다.
- preview 영역만 사용자 css로 한정하려면 알파.7+의 `previewIsolation: 'shadow'` 옵션을 기다려 주세요.
- CSS module(`.module.css`)을 자동 감지 후보에서 직접 import하지 않습니다 — 명시 경로로 넘기면 Vite가 module 처리합니다.

- Repository: https://github.com/devclib/jogak
- Issues: https://github.com/devclib/jogak/issues
- License: [MIT](./LICENSE)
