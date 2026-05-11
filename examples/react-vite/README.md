# Jogak × React + Vite

React 19 + Vite 6 환경에서 Jogak으로 컴포넌트 쇼케이스를 띄우는 최소 예제입니다.

## Quick Start

```bash
pnpm install   # 또는 npm install / yarn
pnpm jogak:dev # http://localhost:5173
```

처음 실행 시 `.jogak/` 디렉토리가 자동 생성됩니다.

## 포함된 컴포넌트

| 컴포넌트 | jogak 케이스 | 시연 포인트 |
|--------|------------|-----------|
| `Button` | 8개 (Primary/Secondary/Destructive/Outline/Ghost/Small/Large/Disabled) | enum + boolean Props 컨트롤러 |
| `Card` | 3개 (Default/WithoutDescription/TitleOnly) | optional Props 처리 |
| `Counter` | 3개 (Default/StartFromTen/StepFive) | useState 기반 인터랙션 |

## 프로젝트 구조

```
react-vite/
├── jogak.config.ts          # globalCss 옵션
├── vite.config.ts           # @vitejs/plugin-react + tailwindcss
├── src/
│   ├── styles/globals.css   # Tailwind v4
│   └── components/ui/
│       ├── Button.tsx
│       ├── Button.jogak.tsx
│       ├── Card.tsx
│       ├── Card.jogak.tsx
│       ├── Counter.tsx
│       └── Counter.jogak.tsx
```

## 명령어

- `pnpm jogak:dev` — 쇼케이스 개발 서버 (HMR)
- `pnpm jogak:build` — 정적 빌드 산출물 생성
- `pnpm dev` / `pnpm build` — 사용자 앱 자체 (별도)

## 다음 단계

- `.jogak.tsx` 파일에서 `argTypes`를 추가하면 Props 컨트롤러가 자동 생성됩니다.
- `jogak.config.ts`의 `previewIsolation` 옵션을 `'iframe'`(기본) / `'shadow'` / `'none'`으로 바꿔보세요.
- 다른 프레임워크 예제: `../nextjs`, `../vue`, `../svelte`, `../web-components`
