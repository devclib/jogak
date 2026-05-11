# Jogak × Vue

Vue 3 SFC(`.vue`) 컴포넌트를 Jogak 쇼케이스에 띄우는 예제입니다.

## Quick Start

```bash
pnpm install
pnpm jogak:dev   # http://localhost:5173
```

## 포함된 컴포넌트

| 컴포넌트 | jogak 케이스 | 시연 포인트 |
|--------|------------|-----------|
| `Button.vue` | 5개 (Primary/Secondary/Destructive/Large/Disabled) | enum + boolean Props |
| `Card.vue` | 2개 (Default/TitleOnly) | optional prop |
| `Counter.vue` | 3개 (Default/StartFromTen/StepFive) | `ref()` 상태 반응성 |

## 핵심 설정

```ts
// jogak.config.ts
export default defineJogakConfig({
  framework: 'vue',
})
```

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
export default defineConfig({ plugins: [vue()] })
```

```ts
// Hello.vue.jogak.ts
const meta = {
  title: 'Vue/Hello',
  component: Hello,
  framework: 'vue',   // ← 프레임워크별 식별
  argTypes: { name: { control: 'text' } },
} satisfies JogakMeta
```

## 명령어

- `pnpm jogak:dev` — Jogak 쇼케이스
- `pnpm jogak:build` — 정적 빌드
- `pnpm dev` / `pnpm build` — Vite 앱 자체 (선택)

## 다음 단계

- Props 컨트롤러에서 `initial`을 바꾸면 `Counter`가 reactive하게 다시 렌더됩니다 (alpha.14.1에서 수정).
- `framework: 'vue'`는 jogak meta와 jogak.config 양쪽 모두에 지정해야 합니다.
- 다른 프레임워크 예제: `../react-vite`, `../nextjs`, `../svelte`, `../web-components`
