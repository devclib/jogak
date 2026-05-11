# Jogak × Next.js

Next.js 15 App Router 환경에서 Server Component / Client Component를 함께 쇼케이스합니다.

## Quick Start

```bash
pnpm install
pnpm jogak:dev   # http://localhost:5173 — Jogak 쇼케이스
pnpm dev         # http://localhost:3000 — Next.js 앱 (별도)
```

## 포함된 컴포넌트

| 컴포넌트 | 타입 | jogak 케이스 |
|--------|------|------------|
| `Badge` | Server Component | Default / Secondary / Outline / Destructive |
| `Button` | Client Component (`'use client'`) | Primary / Secondary / Destructive / Large / Disabled |

`Badge`는 서버에서 렌더된 정적 컴포넌트이고, `Button`은 `useState`를 사용하는 클라이언트 컴포넌트입니다. Jogak은 두 형태 모두 동일한 `.jogak.tsx` 파일로 쇼케이스할 수 있습니다.

## 프로젝트 구조

```
nextjs/
├── jogak.config.ts
├── next.config.ts
├── postcss.config.mjs
├── src/app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
└── src/components/ui/
    ├── Badge.tsx              # Server Component
    ├── Badge.jogak.tsx
    ├── Button.tsx             # 'use client'
    └── Button.jogak.tsx
```

## 명령어

- `pnpm jogak:dev` — Jogak 쇼케이스 (포트 5173, 사용자 앱과 분리)
- `pnpm jogak:build` — 정적 쇼케이스 빌드
- `pnpm dev` / `pnpm build` — Next.js 앱 자체

## 다음 단계

- `Badge`/`Button`에 `argTypes`를 추가해 Props 컨트롤러를 풍부하게 만들 수 있습니다.
- Server Component만 모은 폴더(`app/`)와 라이브러리 컴포넌트(`components/ui/`)를 분리해 보세요.
- 다른 프레임워크 예제: `../react-vite`, `../vue`, `../svelte`, `../web-components`
