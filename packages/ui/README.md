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
  globalCss: true,             // 사용자 globalCss 자동 감지 + import
  previewIsolation: 'none',    // 'none' | 'shadow' | 'iframe' (default 'none')
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
| **alpha.7** | ✅ **본 릴리즈** | **`jogak.config.ts` 통로 + `previewIsolation` 옵션 + `JogakHostOptionsBase` 확장** |
| alpha.8+ | 예정 | `globalCss: { layer, scope }` 객체 union, multi-baseline VR |

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

#### 격리 보장 (default `previewIsolation: 'none'`)

- **Tailwind utility class**: jogak UI는 `prefix=jogak`로 빌드되어 사용자 utility와 충돌 zero (예: 사용자 `bg-primary` ≠ jogak `jogak:bg-...`).
- **CSS variable**: jogak은 `--jogak-*` prefix로 namespace 격리 → 사용자 `:root { --primary }` 같은 디자인 토큰은 영향 없음.
- **Form element 보호**: `[data-jogak-shell]` 안의 button/input/select/textarea는 사용자 reset의 `border` / `background` / `color` 침범을 받지 않도록 `:where()` 보호 rule 적용. specificity 0이라 사용자가 명시적으로 `[data-jogak-shell] button { ... }`를 작성하면 정상 override됩니다.

### previewIsolation 사용 가이드 (알파.7)

Preview 콘텐츠를 chrome으로부터 격리하는 모드를 선택합니다. 대부분 default `'none'` + 알파.6 chrome 보호 rule로 충분하며, 사용자 reset이 chrome을 침범하는 강한 시나리오에서만 `'shadow'` / `'iframe'`을 사용합니다.

#### 모드 비교

| 모드 | mount | jogak.css | 사용자 globalCss | Radix portal | HMR | cold start |
|------|-------|-----------|------------------|--------------|-----|-----------|
| `'none'` | 같은 document | 외부 document | 외부 document | document.body (정상) | Vite 표준 | ★★★ |
| `'shadow'` | ShadowRoot | adoptedStyleSheets | adoptedStyleSheets | 외부 document.body (utility 적용 OK, 단 z-index/focus 분리) | Vite 표준 + MutationObserver sync | ★★★ |
| `'iframe'` | iframe document | (제외 — chrome 전용) | iframe document에 import | iframe document (정상) | iframe도 Vite dev module | ★★ (iframe load 추가) |

#### `'shadow'` 모드 한계

1. **Radix UI portal**: Radix(shadcn)의 Dialog/Popover/Tooltip은 기본 `document.body`로 portal합니다. utility class는 외부 document에 정의되어 적용에는 문제 없지만, focus 관리 / scroll lock / aria 검증에 알려진 이슈가 있습니다 (Radix issues #3674, #3483, #3814). 명시적으로 portal target을 ShadowRoot 안 element로 지정하면 회피 가능:

   ```tsx
   <Dialog.Portal container={shadowRootEl}>
     <Dialog.Content>...</Dialog.Content>
   </Dialog.Portal>
   ```

2. **외부 stylesheet sync 비용**: `adoptedStyleSheets`로 외부 document의 모든 stylesheet를 ShadowRoot에 share합니다. Vite dev에서 `<style>` HMR이 발생하면 MutationObserver가 ShadowRoot도 갱신 — 약간의 latency가 생길 수 있습니다.

3. **CSS variable**: 외부 `:root`의 변수는 ShadowRoot 내부에서도 inherit. 즉 사용자 `:root { --primary: ... }` 토큰은 ShadowRoot 안에서도 작동합니다.

#### `'iframe'` 모드 주의

> ⚠️ jogak의 핵심 차별점은 "single Vite, no iframe" — Storybook 대비 빠른 cold start와 단순 디버깅이 강점입니다. `previewIsolation: 'iframe'`을 활성화하면 이 강점이 일부 상실됩니다 (iframe load + 별도 module graph). 사용자 reset CSS를 chrome에서 완전히 격리해야만 하는 시나리오에서만 사용하세요.

iframe은 `<iframe src="/preview-frame.html">`로 로드되며, 부모-자식 동일 origin이라 부모가 `iframe.contentWindow.__jogak_setProps__({ entry, args })`를 직접 호출하는 방식으로 props를 전달합니다 (postMessage 미사용).

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
