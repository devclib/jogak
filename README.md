# Jogak

가볍고 빠른 컴포넌트 쇼케이스 도구. Storybook을 대체하면서 같은 워크플로우(`dev` / `build` / 정적 배포)를 그대로 제공한다.

> 상태: `0.1.0-alpha.0` — API가 안정화되지 않았습니다.

## Storybook 대비 수치

같은 React 카탈로그(컴포넌트 N개, 각 3 entries)를 Storybook 8(Vite builder)과 Jogak에 각각 셋업해 측정.

| 지표 | size 100 | size 500 | 비고 |
|---|---|---|---|
| dev cold start | **1.7s** vs 3.3s (**2.0×**) | **2.9s** vs 3.6s (1.3×) | "HTTP 200 응답"까지 |
| build time | **2.0s** vs 2.9s (1.4×) | **4.1s** vs 7.6s (**1.8×**) | 카탈로그 클수록 격차 ↑ |
| bundle (gzip) | **108 KB** vs 716 KB (**6.6×**) | **156 KB** vs 1.09 MB (**7.0×**) | manager 번들 없음 |
| dist 합계 | **340 KB** vs 3 MB (**8.9×**) | - | 정적 호스팅 전송량 |

재현: `pnpm bench:scale:full`. 측정 코드: `benchmarks/run-scale.mjs`. 보고서: `_workspace/03_test-report/step-d-scale.md`.

## 왜 가벼운가

- **단일 Vite 인스턴스** — Storybook의 manager UI(별도 React 앱) + preview iframe + addon 로더가 없다.
- **빌드 타임 props 추출** — `react-docgen` 런타임 분석이 아니라 ts-morph로 **빌드 시점**에 한 번 추출하고 끝.
- **virtual module 기반 HMR** — `*.jogak.tsx` 변경 시 가상 모듈만 무효화. 컴포넌트 자체는 React Fast Refresh.
- **의존성 최소** — `vite` + `@vitejs/plugin-react` + `react`. addon 시스템 없음.

## 빠른 시작

```bash
pnpm add -D @jogak/cli @jogak/react

# 컴포넌트 옆에 *.jogak.tsx 작성 (아래 예시 참조)

npx jogak dev          # dev server (기본 5173)
npx jogak build        # 정적 빌드 → ./jogak-static/
```

빌드 결과(`jogak-static/`)는 `index.html` + 단일 JS 청크로, GitHub Pages · Vercel · Netlify · S3 어디든 그대로 업로드하면 끝. base path는 `--base /repo-name/`로 조정.

### 컴포넌트 정의

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

`Button` props 타입에서 `variant: 'primary' | 'secondary'`, `disabled?: boolean`, `onClick?: (e) => void`가 자동 추출돼 select/checkbox/Action 컨트롤이 자동 생성된다.

## CLI

```
jogak dev [options]
  --patterns <glob[,glob...]>   '*.jogak.tsx' 글롭 (기본: src/**/*.jogak.{ts,tsx})
  --port <number>               기본 5173
  --host <string>               'true'/'false'/host string
  --open [path]                 시작 시 브라우저 오픈
  --no-generate                 .jogak/registry.ts 안전망 생성 끄기

jogak build [options]
  --out-dir <path>              기본 'jogak-static'
  --base <string>               public path. 기본 './' (어디든 작동)
  --minify <boolean|esbuild|terser>  기본 'esbuild'
  --sourcemap                   기본 false

jogak generate [options]        # 호스트 번들러 임베드용 codegen
  --out <path>                  기본 '.jogak/registry.ts'
```

## 핵심 기능

- **`*.jogak.tsx` 컨벤션** — 메타 + named export로 컴포넌트 변형 정의
- **Props 자동 추출** — TypeScript 타입에서 text/number/boolean/select 컨트롤 자동 생성
- **Actions** — 함수 prop은 spy로 자동 채워지고 호출 로그가 패널에 표시
- **URL 딥링크** — `?entry=...&jogak=...` 으로 공유 가능
- **소스 코드 뷰어** — prism-react-renderer 기반 (테마 옵션)
- **Viewport / 배경 토글** — Mobile / Tablet / Desktop · White / Dark / Transparent

## 호스트 임베드 (선택)

`jogak dev` SPA를 쓰지 않고 기존 호스트(Next.js / Vite SPA / WC) 번들에 직접 카탈로그를 임베드할 수도 있다. 호스트의 라우팅 · 디자인 시스템에 통합하고 싶을 때 유용.

### Vite SPA에 임베드

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
import { defaultRegistry } from '@jogak/core'
import { JogakApp } from '@jogak/ui'

createRoot(rootEl).render(
  <JogakApp entries={defaultRegistry.getAll()} codeTheme={_jogakCodeTheme} />,
)
```

### Next.js App Router에 임베드

`*.jogak.tsx`를 호스트 번들러 무관 codegen으로 일반 TS로 변환한다.

```bash
pnpm jogak generate --patterns 'src/**/*.jogak.tsx'
# → .jogak/registry.ts 생성
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

Shadow DOM으로 스타일 격리, Preact 런타임만 포함돼 ~3 KB.

## 패키지

```
packages/
├── core              # 레지스트리, 타입, Vite 플러그인, ts-morph 추출기, ActionChannel
├── react             # React 어댑터 + JogakProvider
├── ui                # Sidebar / Preview / Controls / Actions, JogakApp + host
├── cli               # jogak dev / build / generate CLI
├── next              # Next.js App Router 임베드용 Client Shell
└── web-components    # Preact + Shadow DOM Custom Element
```

## 개발

```bash
pnpm install
pnpm --filter @jogak/core build       # 다른 패키지가 의존하므로 먼저
pnpm --filter @jogak/ui dev           # SPA 본체 데모 (5173)
pnpm --filter next-demo dev           # Next 임베드 데모
pnpm --filter wc-demo dev             # WC 임베드 데모
```

### 테스트

```bash
pnpm test                             # 단위 테스트
pnpm test:e2e                         # Playwright e2e
```

### 벤치마크

```bash
pnpm bench                            # 자체 측정 (bundle / extract / cold-start)
pnpm bench:baseline                   # Jogak vs Storybook (size 5)
pnpm bench:scale                      # size 5/50/100
pnpm bench:scale:full                 # size 5/50/100/500
```

## 기술 스택

TypeScript · React · pnpm workspaces · Vite · ts-morph · Preact · prism-react-renderer · Vitest · Playwright

## 라이선스

[MIT](./LICENSE)
