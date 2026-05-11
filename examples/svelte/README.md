# Jogak × Svelte

Svelte 5 runes(`$props()`, `$state()`)를 사용하는 컴포넌트를 Jogak 쇼케이스에 띄우는 예제입니다.

## Quick Start

```bash
pnpm install
pnpm jogak:dev   # http://localhost:5173
```

## 포함된 컴포넌트

| 컴포넌트 | jogak 케이스 | 시연 포인트 |
|--------|------------|-----------|
| `Button.svelte` | 5개 (Primary/Secondary/Destructive/Large/Disabled) | enum + boolean Props |
| `Card.svelte` | 2개 (Default/TitleOnly) | optional prop |
| `Counter.svelte` | 3개 (Default/StartFromTen/StepFive) | `$state()` 리액티브 |

## 핵심 설정

```ts
// jogak.config.ts
export default defineJogakConfig({
  framework: 'svelte',
})
```

```ts
// vite.config.ts
import { svelte } from '@sveltejs/vite-plugin-svelte'
export default defineConfig({ plugins: [svelte()] })
```

```svelte
<!-- Hello.svelte -->
<script lang="ts">
  let { name = 'world' }: { name?: string } = $props()
</script>
```

## 명령어

- `pnpm jogak:dev` — Jogak 쇼케이스
- `pnpm jogak:build` — 정적 빌드
- `pnpm dev` / `pnpm build` — Vite 앱 자체 (선택)

## 다음 단계

- `$state()` 기반 Counter는 `+`/`−` 클릭이 즉시 반응합니다.
- `framework: 'svelte'`는 jogak meta와 jogak.config 양쪽 모두에 지정해야 합니다.
- Svelte 5 runes 모드 (`runes: true`)는 jogak 내부에서 자동으로 켜집니다.
- 다른 프레임워크 예제: `../react-vite`, `../nextjs`, `../vue`, `../web-components`
