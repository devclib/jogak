# Jogak × Web Components

Preact 기반 컴포넌트를 Custom Element로 등록해 **모든 호스트 환경(Vanilla HTML, React, Vue, Svelte…)에서 일반 HTML 태그처럼** 사용할 수 있는 예제입니다.

## Quick Start

```bash
pnpm install
pnpm jogak:dev   # http://localhost:5173 — Jogak 쇼케이스
```

## 포함된 컴포넌트

| 컴포넌트 | jogak 케이스 | 시연 포인트 |
|--------|------------|-----------|
| `Pill` | 4개 (Info/Success/Danger/Neutral) | enum + boolean Props |
| `Counter` | 3개 (Default/StartFromTen/StepFive) | Preact `useState` |

## 핵심 설정

```ts
// jogak.config.ts
export default defineJogakConfig({
  framework: 'web-components',
})
```

```ts
// Pill.jogak.tsx
const meta = {
  title: 'WC/Pill',
  component: Pill,
  framework: 'web-components',   // ← 어댑터가 Pill을 Custom Element로 마운트
  argTypes: { /* ... */ },
} satisfies JogakMeta
```

## 외부에서 Custom Element로 사용하기

Jogak이 빌드한 컴포넌트는 `defineJogakElement`로 Custom Element를 등록해 임의의 HTML 페이지에서 쓸 수 있습니다:

```ts
// main.ts (호스트 페이지)
import { defineJogakElement } from '@jogak/core/renderers/web-components'
import { entries } from './.jogak/registry'

for (const entry of entries) {
  const last = entry.title.split('/').pop()
  if (last !== undefined) defineJogakElement(`jogak-${last.toLowerCase()}`, entry)
}
```

```html
<!-- index.html -->
<jogak-pill label="New" tone="info"></jogak-pill>
<jogak-counter initial="10" step="5" label="pages"></jogak-counter>
```

- Shadow DOM 격리, 호스트 페이지 스타일 누수 없음
- 런타임 ~3KB (Preact만 번들)
- React/Vue/Svelte/Angular 어디서나 동일 태그로 동작

## 명령어

- `pnpm jogak:dev` — Jogak 쇼케이스
- `pnpm jogak:build` — 정적 쇼케이스 빌드
- `pnpm dev` / `pnpm build` — Vite 앱 자체 (선택, 호스트 페이지 데모)

## 다음 단계

- 컴포넌트는 Preact로 작성하지만, Jogak 어댑터가 Custom Element 래핑을 책임집니다.
- 외부 호스트(React, Vue…)에서는 `defineJogakElement`로 한 번 등록한 뒤 일반 태그처럼 사용하면 됩니다.
- 다른 프레임워크 예제: `../react-vite`, `../nextjs`, `../vue`, `../svelte`
