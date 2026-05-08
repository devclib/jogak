# @jogak/ui

Showcase viewer UI for [Jogak](https://github.com/devclib/jogak) — `Sidebar` / `Preview` / `Controls` / `Actions` and the `JogakApp` shell.

## Install

```bash
pnpm add @jogak/ui @jogak/core @jogak/react react react-dom
```

`react` / `react-dom` are peer dependencies (>=18). `vite` and `@vitejs/plugin-react` are optional peers (only when using the Vite plugin).

## Usage

### `jogak.config.ts` 사용 (권장)

알파.7부터 `jogak` CLI는 사용자 프로젝트 root의 `jogak.config.{ts,mts,mjs,js,json}`을
자동 발견해 옵션을 읽습니다. shadcn/ui 사용자가 자주 만지는 옵션은 한 곳에 선언하세요:

```ts
// jogak.config.ts (사용자 프로젝트 root)
import { defineJogakConfig } from '@jogak/core'

export default defineJogakConfig({
  globalCss: true,              // 사용자 globalCss 자동 감지 + import
  // previewIsolation: 'iframe',  // 'iframe' (default, 알파.8) | 'shadow' (deprecated) | 'none' (deprecated)
  // userVite: { port: 5174 },    // 사용자 vite spawn 옵션 (자동 탐지 시 미명시)
  codeTheme: 'vsDark',
  port: 5173,                  // dev server (CLI --port로 override)
})
```

CLI는 본 config의 옵션을 읽어 jogak SPA 빌드/dev에 전달합니다. CLI 플래그가
명시되면 config 값을 override합니다 (Vite 패턴).

### `jogak.config.ts` 미사용 (CLI flag만)

```bash
jogak dev --global-css --preview-isolation=none
jogak build --global-css --preview-isolation=shadow
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

### legacy: `vite.config.ts`에 `jogak()` plugin 직접 사용

> 알파.6까지의 README는 사용자 `vite.config.ts`에 `jogak({ globalCss: true })`를
> 작성하라 안내했지만, 이는 사용자 일반 vite 빌드용에만 적용되고 jogak SPA에는
> 무효였습니다 (`runHost`가 `configFile: false`로 사용자 vite config 무시).
> 알파.7부터는 위 `jogak.config.ts` 패턴을 사용하세요.

`@jogak/core/vite`의 `jogak()` plugin은 사용자가 vite로 직접 jogak 카탈로그를
embed하는 고급 시나리오(예: Next.js page 안에서 `<JogakApp entries={...} />`로
정적 entries를 전달할 때 빌드 타임 generate)에서만 사용합니다.

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
| alpha.4 | ✅ 완료 | jogak UI 빌드에 Tailwind v4 + `jogak:` prefix 도입 |
| alpha.5 | ✅ 완료 | jogak UI 컴포넌트를 Tailwind class로 마이그레이션 (4 PR) |
| alpha.6 | ✅ 완료 | `JogakPluginOptions.globalCss` 옵션 + chrome 보호 rule (단, 통로 부재로 사용자 환경에서 무효 — 알파.7에서 정정) |
| alpha.7 | ✅ 완료 | `jogak.config.ts` 통로 + `previewIsolation` 옵션 + `JogakHostOptionsBase` 확장 (단, isolation 통로 결함으로 격리 무효 — 알파.7.1에서 정정) |
| alpha.7.1 | ✅ 완료 | isolation 통로 hotfix + default `previewIsolation: 'shadow'` (단, 사용자 utility 미컴파일 한계 — 알파.8에서 사용자 vite 통합으로 해결) |
| **alpha.8** | ✅ **본 릴리즈** | **사용자 vite 자동 spawn + 사용자 Tailwind utility 정상 컴파일 + default `previewIsolation: 'iframe'`** |
| alpha.9+ | 예정 | shadow 모드 사용자 utility inject 부활, iframe sandbox 옵션, multi-baseline VR |

### 사용자 globalCss 적용

`runHost`는 vite root를 `@jogak/ui` 패키지로 두고 사용자 `vite.config.ts` / `main.tsx`를 무시하므로(`configFile: false`), 사용자 `index.css`(Tailwind/shadcn 디자인 토큰)가 jogak SPA에 자동 적용되지 않습니다. `globalCss` 옵션은 이를 opt-in으로 해결합니다.

#### 사용법

```ts
// jogak.config.ts (사용자 프로젝트 root)
import { defineJogakConfig } from '@jogak/core'

export default defineJogakConfig({
  globalCss: true,
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
defineJogakConfig({ globalCss: './src/index.css' })

// 다중 import (디자인 토큰 + reset 분리)
defineJogakConfig({ globalCss: ['./src/tokens.css', './src/reset.css'] })
```

#### 격리 보장 (default `previewIsolation: 'iframe'`, 알파.8)

- **Tailwind utility class**: jogak UI는 `prefix=jogak`로 빌드되어 사용자 utility와 충돌 zero (예: 사용자 `bg-primary` ≠ jogak `jogak:bg-...`).
- **CSS variable**: jogak은 `--jogak-*` prefix로 namespace 격리 → 사용자 `:root { --primary }` 같은 디자인 토큰은 영향 없음.
- **Form element 보호**: `[data-jogak-shell]` 안의 button/input/select/textarea는 사용자 reset의 `border` / `background` / `color` 침범을 받지 않도록 `:where()` 보호 rule 적용. specificity 0이라 사용자가 명시적으로 `[data-jogak-shell] button { ... }`를 작성하면 정상 override됩니다.

### previewIsolation 사용 가이드 (알파.8)

jogak chrome ↔ 사용자 영역의 **양방향 격리** + 사용자 컴포넌트는 사용자 디자인 시스템 그대로 표시. 알파.8부터 default가 `'iframe'`로 변경되어 사용자 vite 인스턴스가 자동 spawn되고, iframe document가 사용자 vite의 정상 client로 작동합니다.

#### 모드 비교

| 모드 | mount | 사용자 utility 컴파일 | chrome 침범 | Radix portal | cold start |
|------|-------|---------------------|-----------|--------------|-----------|
| `'iframe'` (default) | iframe document (사용자 vite scope) | **정상** ✅ | zero | iframe document (정상) | ★★ |
| `'shadow'` (deprecated) | ShadowRoot | **미컴파일** | zero | document.body (shadow 외부) | ★★★ |
| `'none'` (deprecated) | 같은 document | 미컴파일 | **있음** | document.body | ★★★ |

#### `'iframe'` 모드 (default, 알파.8)

jogak CLI가 사용자 cwd의 `vite.config.{ts,mts,js,mjs,cjs}`를 자동 탐지해 별도 vite dev server를 spawn합니다. iframe `src`가 그 사용자 vite를 가리키므로 사용자 plugins(@tailwindcss/vite, custom alias 등)이 정상 작동 → **사용자 컴포넌트가 사용자 디자인 그대로 표시**.

```ts
// jogak.config.ts (사용자 프로젝트 root)
import { defineJogakConfig } from '@jogak/core'

export default defineJogakConfig({
  globalCss: true,
  // previewIsolation: 'iframe',  // default
  // userVite: { port: 5174 },    // 명시 시
})
```

**자동 동작:**
- 사용자 `vite.config.ts` 자동 탐지 → `loadConfigFromFile` + `mergeConfig`로 jogak plugins 자동 inject (사용자 액션 zero)
- 사용자 vite default port 5174 (jogak SPA가 default 5173 차지). 사용자 명시 가능
- cross-origin postMessage로 entry/args 전달 (`entry.id`만, iframe 안에서 `defaultRegistry.requestEntry(id)` dynamic import)
- HMR: 사용자 vite의 React Fast Refresh + Tailwind utility 재생성 정상 작동

**Fallback:**
- `vite.config.ts` 미발견 또는 평가 실패 → spawn skip + warning. jogak SPA만 시작 (`'none'` 모드 동등 동작).

**주의:**
- jogak ↔ 사용자 vite 두 인스턴스 (vs 알파.7.1까지의 single vite). dev cold start +100ms, RSS +50~80MB.
- iframe sandbox 미적용 (사용자 컴포넌트의 fetch/clipboard/storage 자유 사용).

#### `'shadow'` 모드 (deprecated)

ShadowRoot 격리는 정상 작동하나 사용자 utility가 shadow scope에 inject되지 않아 사용자 컴포넌트가 raw 형태로 표시됩니다. 알파.9에서 사용자 vite의 `transformRequest` API로 shadow inject 부활 검토.

#### `'none'` 모드 (deprecated)

사용자 globalCss를 outer document에 inject. 사용자 reset이 jogak chrome 침범. back-compat 시나리오만 사용:

```ts
defineJogakConfig({ globalCss: true, previewIsolation: 'none' })
```

### scope 가이드 — 알려진 영향 영역 (`'none'` 모드 기준)

사용자 css의 다음 패턴은 jogak chrome에도 영향을 줄 수 있습니다 (전역 import이므로):

- `body { ... }` — jogak SPA의 body에도 적용
- `* { ... }` 또는 `*, *::before { ... }` — 모든 요소
- 글로벌 reset (`button { all: unset }`, `* { border: 1px solid var(--border) }` 등)

이를 사용자 콘텐츠 영역(preview)으로만 한정하려면 셀렉터를 `[data-jogak-content] *` scope로 작성하거나, `previewIsolation: 'shadow' | 'iframe'`을 사용하세요.

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

#### selector hint

- `[data-jogak-shell]` — `JogakApp` 최상위 wrapper (chrome + preview 모두 포함)
- `[data-jogak-content]` — Preview의 사용자 콘텐츠 영역 (사용자 컴포넌트가 렌더되는 div)

### 알파.6 → 알파.7 마이그레이션

알파.6 README는 다음 가이드를 안내했습니다:

```ts
// alpha.6 README (무효)
// vite.config.ts
import { jogak } from '@jogak/core/vite'
export default defineConfig({
  plugins: [react(), jogak({ globalCss: true })],
})
```

이 설정은 사용자 일반 vite 빌드용에만 적용되고 jogak SPA에는 전달되지 않았습니다.
알파.7부터 `jogak.config.ts`로 옮기세요:

```ts
// alpha.7+ — jogak.config.ts (사용자 프로젝트 root)
import { defineJogakConfig } from '@jogak/core'

export default defineJogakConfig({
  globalCss: true,
})
```

`vite.config.ts`에 `jogak()` plugin이 그대로 있어도 jogak SPA에는 영향 없으므로
당장 제거할 필요는 없습니다 (alpha.6 동작 유지). 하지만 jogak.config.ts로 옮긴 후
중복 제거를 권장합니다.

### 알려진 한계

- `globalCss` 옵션은 **opt-in**입니다 (default `false`). 알파.5까지의 동작은 동일합니다.
- `globalCss: true` 자동 감지는 dev 시작 시점에 한 번만 수행됩니다. 후보 css 파일이 dev 시작 후에 새로 추가되면 dev 서버를 재시작해야 합니다. 명시 경로(`globalCss: './src/index.css'`)는 파일이 나중에 생성되어도 정상 hot reload됩니다.
- CSS module(`.module.css`)을 자동 감지 후보에서 직접 import하지 않습니다 — 명시 경로로 넘기면 Vite가 module 처리합니다.

- Repository: https://github.com/devclib/jogak
- Issues: https://github.com/devclib/jogak/issues
- License: [MIT](./LICENSE)
