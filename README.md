# Jogak

스토리북을 대체하는 디자인 시스템 쇼케이스 라이브러리.
React SPA / Next.js App Router / Web Components 환경에서 동일한 컴포넌트 카탈로그를 제공한다.

> 상태: `0.1.0-alpha.0` — API가 안정화되지 않았습니다.

## 왜 Jogak인가

Storybook은 자체 dev server, 자체 manager UI, 자체 HMR 파이프라인을 띄운다.
이 비용은 프로젝트가 커질수록 cold start와 메모리에 그대로 반영된다.

Jogak은 **호스트 번들러에 직접 임베드되는 SPA**로 설계됐다.

| 항목 | Storybook | Jogak |
|------|-----------|-------|
| dev server | 별도 (storybook dev) | 호스트 그대로 (Next/Vite) |
| React 런타임 | manager + preview 듀얼 | 호스트 번들 1개 |
| HMR | 자체 파이프라인 | 호스트 HMR 그대로 |
| props 추출 | 런타임/CSF 분석 | 빌드 타임 ts-morph (런타임 부하 0) |
| Custom Element | addon 필요 | 1차 지원 (~3KB Preact + Shadow DOM) |

`apps/next-demo`에서 측정한 cold start: **Next.js Ready 2.1s, `/jogak` 컴파일 407ms (639 modules)**.

## 핵심 기능

- **`*.jogak.tsx` 파일 컨벤션** — 메타 + named export(jogak)로 컴포넌트 변형 정의
- **props 자동 추출** — TypeScript 타입에서 `argTypes`(text/number/boolean/select)를 빌드 타임에 추출
- **Actions 자동 처리** — 함수 prop은 자동으로 spy로 채워지고 호출 로그가 패널에 표시
- **URL 딥링크** — `?entry=...&jogak=...` 으로 공유 가능
- **소스 코드 뷰어** — prism-react-renderer 기반 syntax highlighting (테마 옵션)
- **Viewport · 배경 토글** — Mobile/Tablet/Desktop · White/Dark/Transparent
- **codegen** — 호스트 번들러 무관 (Next/Webpack/Turbopack/Rspack/Vite)

## 패키지

```
packages/
├── core              # 레지스트리, 타입, Vite 플러그인, ts-morph 추출기, ActionChannel
├── react             # React 어댑터 + JogakProvider
├── next              # Next.js App Router용 Client Shell
├── web-components    # Preact + Shadow DOM Custom Element
├── ui                # Sidebar / Preview / Controls / Actions, JogakApp
└── cli               # `jogak generate` codegen CLI
```

## 사용 예시

### 컴포넌트 정의

```tsx
// Button.jogak.tsx
import type { JogakMeta, Jogak } from '@jogak/core'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    label: { description: '버튼 라벨' },
  },
} satisfies JogakMeta

export default meta

export const Primary: Jogak = {
  name: 'Primary',
  args: { label: 'Click me', variant: 'primary' },
}
```

`Button`의 props 타입에서 `variant: 'primary' | 'secondary'`, `disabled?: boolean`,
`onClick?: (e) => void` 같은 정보가 자동 추출된다 — 사용자가 직접 적지 않아도 select/checkbox/Action이 채워진다.

### Vite SPA

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

### Next.js App Router

`*.jogak.tsx`를 일반 TS로 미리 변환한다 (호스트 번들러 무관 codegen).

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

Shadow DOM으로 스타일 격리, Preact 런타임만 포함되어 ~3KB.

## 개발

```bash
pnpm install
pnpm --filter @jogak/core build       # core 빌드 (다른 패키지가 의존)
pnpm --filter @jogak/ui dev           # SPA 데모 (port 5173)
pnpm --filter next-demo dev           # Next 데모 (port 3001)
pnpm --filter wc-demo dev             # WC 데모 (port 5174)
```

### 테스트

```bash
pnpm test                                              # 모든 단위 테스트
pnpm --filter @jogak/web-components exec vitest run    # WC 단위 테스트 (5건)
pnpm --filter @jogak/next exec vitest run              # Next 단위 테스트 (4건)
pnpm test:e2e                                          # Playwright e2e (4 시나리오)
```

### 빌드

```bash
pnpm build                            # 모든 패키지 빌드
pnpm --filter next-demo build         # Next 데모 production 빌드
```

## 기술 스택

- TypeScript + React + pnpm workspaces
- Vite (core/ui/web-components 빌드 + SPA dev server)
- ts-morph (TypeScript Compiler API 래퍼) — props 추출
- Preact — Web Components 런타임 최소화
- prism-react-renderer — syntax highlighting
- vitest + happy-dom — 단위 테스트
- Playwright — e2e

## 라이선스

[MIT](./LICENSE)
