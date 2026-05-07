# Jogak

> [English README](./README.md) · 한국어

가볍고 빠른 컴포넌트 쇼케이스 도구. Storybook을 대체하면서 같은 워크플로우(`dev` / `build` / 정적 배포)를 그대로 제공한다.

> 상태: `0.1.0-alpha.0` — API가 안정화되지 않았습니다.

## Storybook 대비 수치

같은 React 카탈로그(컴포넌트 N개, 각 3 entries)를 Storybook 8(Vite builder)과 Jogak에 각각 셋업해 측정.

| 지표 | size 100 | size 500 | 비고 |
|---|---|---|---|
| dev cold start | **1.7 s** vs 3.3 s (**2.0×**) | **2.9 s** vs 3.6 s (1.3×) | "HTTP 200 응답"까지 |
| build time | **2.0 s** vs 2.9 s (1.4×) | **4.1 s** vs 7.6 s (**1.8×**) | 카탈로그 클수록 격차 ↑ |
| bundle (gzip) | **108 KB** vs 716 KB (**6.6×**) | **156 KB** vs 1.09 MB (**7.0×**) | manager 번들 없음 |
| dist 합계 | **340 KB** vs 3 MB (**8.9×**) | **— vs —** | 정적 호스팅 전송량 |
| **idle RSS** (dev) | **321 MB** vs 403 MB (1.3×) | **345 MB** vs 489 MB (**1.4×**) | dev tree RSS median |
| **HMR** (warm median) | **153 ms** | **199 ms** | args 수정 → DOM, < 200 ms |

재현: `pnpm bench:scale:full` · `pnpm bench:rss` · `pnpm bench:hmr`. 측정 코드는 `benchmarks/`.

## 왜 가벼운가

- **단일 Vite 인스턴스** — Storybook의 manager UI(별도 React 앱) + preview iframe + addon 로더가 없다.
- **Lazy 가상모듈** — 인덱스 모듈은 모든 entry의 메타만, 각 entry의 컴포넌트는 사용자가 클릭한 시점에 dynamic import. dev 첫 페이지 로드 시 module graph에 user 모듈 0개 → idle RSS가 카탈로그 크기에 거의 비례하지 않음.
- **child_process 격리된 ts-morph** — props 추출은 별도 자식 프로세스에서. idle 5초 후 SIGTERM되어 OS가 메모리를 즉시 회수.
- **In-place HMR** — `*.jogak.tsx` 변경 시 인덱스 메타는 ws custom event로 즉시 patch, args/component 변경은 entry 가상모듈의 self-accept로 자동 재 hydrate. full-reload 회피.
- **빌드 타임 props 추출** — `react-docgen` 런타임 분석 없이 ts-morph로 빌드 시점 1회 추출.
- **의존성 최소** — `vite` + `@vitejs/plugin-react` + `react`. addon 시스템 없음.

## 필수 조건

- **Node** 20.18+ (또는 22+, 24+) — `fetch`/`AbortSignal.timeout`/`node:test` parity API 사용
- **React** 19.x — peer dependency
- **Vite** 6.x — peer dependency (호스트 임베드 시)
- **TypeScript** 5.5+ — props 자동 추출이 작동하려면 `tsconfig.json` 필요 (없으면 추출 skip, 수동 `meta.argTypes`로 fallback)

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

### tsconfig

`@jogak/cli`가 `<cwd>/tsconfig.json`을 자동 감지한다. 다른 위치를 쓰려면:

```bash
npx jogak dev --ts-config ./tsconfig.app.json
```

`tsconfig`가 없으면 props 자동 추출은 skip되고, 사용자가 직접 `meta.argTypes`로 컨트롤을 정의할 수 있다.

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
  --patterns <glob[,glob...]>   '*.jogak.tsx' 글롭 (기본: src/**/*.jogak.{ts,tsx})
  --port <number>               기본 5173
  --host <string>               'true'/'false'/host string
  --open [path]                 시작 시 브라우저 오픈
  --no-generate                 .jogak/registry.ts 안전망 생성 끄기
  --ts-config <path>            tsconfig 경로 (기본: <cwd>/tsconfig.json)
  --cwd <path>                  사용자 프로젝트 루트 (기본: process.cwd())
  --code-theme <name>           prism 테마 (기본: vsDark)

jogak build [options]
  --out-dir <path>              기본 'jogak-static'
  --base <string>               public path. 기본 './' (어디든 작동)
  --minify <boolean|esbuild|terser>  기본 'esbuild'
  --sourcemap                   기본 false
  --emit-registry               build 도중 .jogak/registry.ts도 생성

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
- **In-place HMR** — args 수정 시 entry 자동 재 hydrate, 사이드바 메타는 ws patch로 즉시 reflow

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
import { JogakApp } from '@jogak/ui'

createRoot(rootEl).render(<JogakApp codeTheme={_jogakCodeTheme} />)
```

`virtual:jogak` 인덱스 모듈이 평가되며 `defaultRegistry`에 메타가 자동 등록된다. `<JogakApp>`은 인자 없이 호출하면 `defaultRegistry`를 그대로 사용 — 정적 빌드 시점에 카탈로그가 결정된 entries를 직접 넘기려면 `<JogakApp entries={...} />` 형태도 지원.

### Vite plugin 옵션

```ts
jogak({
  patterns: ['src/**/*.jogak.tsx'],   // 기본: src/**/*.jogak.{ts,tsx}
  codeTheme: 'vsDark',                // prism 테마
  cwd: __dirname,                     // glob의 기준. 기본은 vite config.root
  tsConfigFilePath: './tsconfig.json',// 기본: <cwd>/tsconfig.json 자동 감지
  disableCacheValidation: false,      // dev 부팅 시 stale @jogak/* 캐시 자동 purge (기본 활성)
})
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

## 트러블슈팅

### 라이브러리 업데이트 후 "does not provide an export named X" 에러

`@jogak/core` / `@jogak/react`가 갱신될 때 Vite의 `node_modules/.vite/deps` pre-bundle cache가 stale일 수 있다. plugin이 dev 부팅 시 자동 감지해 cache를 purge하지만, 만약 갱신이 작동하지 않으면 직접:

```bash
rm -rf node_modules/.vite
```

### custom registry에서 HMR이 동작하지 않음

`<JogakProvider registry={customRegistry}>`로 별도 인스턴스를 주입하면 HMR `jogak:meta-update` 이벤트는 `defaultRegistry`만 갱신한다(plugin이 어떤 registry를 쓰는지 모름). custom registry 사용 시 jogak 파일 변경은 `--no-generate`가 아닌 한 full-reload로 동작.

### 부팅 직후 RSS spike

dev 첫 5초 동안 esbuild prebundle + ts-morph 자식 spawn으로 RSS가 일시적으로 700 MB+에 달할 수 있다. 5초 내 안정화되며 idle 시점엔 lazy 가상모듈 효과로 다시 떨어짐. 메모리가 매우 제한된 환경(<1 GB)에선 부팅 첫 부분이 위험할 수 있음.

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
pnpm bench:rss                        # idle RSS (jogak vs storybook)
pnpm bench:hmr                        # HMR latency (size 50, 10 runs)
```

## 기술 스택

TypeScript · React · pnpm workspaces · Vite · ts-morph · Preact · prism-react-renderer · Vitest · Playwright

## 라이선스

[MIT](./LICENSE)
