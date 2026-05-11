# Jogak Examples

각 디렉토리는 **단독으로 실행되는 npm 프로젝트**입니다. 워크스페이스에 묶여 있지 않으므로 폴더만 복사해 가져가도 그대로 동작합니다.

> 모든 예제는 npm에 publish된 `@jogak/core` / `@jogak/cli` (alpha 채널)을 설치합니다.
> 최신 버전: `^0.1.0-alpha.14.2`

## 예제 목록

| 디렉토리 | 프레임워크 | 시연 포인트 |
|---------|----------|-----------|
| [`react-vite/`](./react-vite/) | React 19 + Vite 6 | Tailwind v4, Button(8) / Card(3) / Counter(3) |
| [`nextjs/`](./nextjs/) | Next.js 15 (App Router) | Server Component(Badge) + Client Component(Button) 혼합 |
| [`vue/`](./vue/) | Vue 3 SFC | `defineProps` + reactive props, Button/Card/Counter |
| [`svelte/`](./svelte/) | Svelte 5 runes | `$props()` / `$state()`, Button/Card/Counter |
| [`web-components/`](./web-components/) | Preact + Custom Elements | Shadow DOM 격리, 외부 호스트에서 일반 HTML 태그처럼 사용 |

## 실행

각 디렉토리에서 독립적으로 실행합니다:

```bash
cd examples/react-vite      # 원하는 디렉토리 선택
pnpm install                # 또는 npm install / yarn
pnpm jogak:dev              # http://localhost:5173
```

> ℹ️ `examples/`는 의도적으로 pnpm workspace에서 제외되어 있습니다 (`pnpm-workspace.yaml` 참조). 외부 개발자가 폴더만 복사해 가져갔을 때와 동일한 환경을 보장하기 위함입니다.

## 공통 구조

```
<framework>/
├── README.md              # 프레임워크별 가이드
├── package.json           # npm version 의존성 (workspace:* 아님)
├── .npmrc                 # link-workspace-packages=false
├── jogak.config.ts        # framework / globalCss / previewIsolation
├── vite.config.ts         # 프레임워크별 vite plugin
├── tsconfig.json
└── src/components/        # Component + .jogak.* 파일 쌍
```

## 필수 설정 패턴

### 1. `framework` 명시 (React/Next 외)

```ts
// jogak.config.ts
import { defineJogakConfig } from '@jogak/core'
export default defineJogakConfig({
  framework: 'vue', // 'react' | 'next' | 'vue' | 'svelte' | 'web-components'
})
```

```ts
// Component.jogak.ts
const meta = {
  title: 'Vue/Hello',
  component: Hello,
  framework: 'vue',   // jogak.config 외에 meta에도 같이 지정 권장
  argTypes: { /* ... */ },
} satisfies JogakMeta
```

### 2. Tailwind / globalCss (선택)

```ts
// jogak.config.ts
export default defineJogakConfig({
  globalCss: 'src/styles/globals.css',
})
```

### 3. Vite 플러그인 (프레임워크별)

| 프레임워크 | 플러그인 |
|----------|---------|
| React | `@vitejs/plugin-react` |
| Next.js | (Next 자체) |
| Vue | `@vitejs/plugin-vue` |
| Svelte | `@sveltejs/vite-plugin-svelte` |
| Web Components | `@preact/preset-vite` |

## 시작 가이드 (외부 개발자용)

가장 가까운 예제 디렉토리를 통째로 복사해 시작 템플릿으로 쓰는 것을 권장합니다:

```bash
# GitHub에서 클론 후
cp -r jogak/examples/react-vite my-design-system
cd my-design-system
pnpm install
pnpm jogak:dev
```

이후 `src/components/` 안에 컴포넌트를 추가하고, 같은 폴더에 `<Component>.jogak.tsx` 파일을 만들어 jogak 케이스를 정의하면 됩니다.

## 참고

- 라이브러리 소스: [`../packages/core`](../packages/core), [`../packages/ui`](../packages/ui), [`../packages/cli`](../packages/cli)
- 내부 e2e 픽스처(workspace 의존): [`../apps/`](../apps/) — 라이브러리 개발자용
