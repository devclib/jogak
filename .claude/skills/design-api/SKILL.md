---
name: jogak-api-designer
description: "Jogak 라이브러리의 TypeScript API, 패키지 경계, 인터페이스를 설계할 때 사용. API 계약 작성, 타입 정의, 패키지 구조 결정, 어댑터 인터페이스 설계가 필요하면 반드시 이 스킬을 참조."
---

# Jogak API Designer

Jogak 라이브러리의 TypeScript API를 설계하는 원칙과 패턴을 담는다.

## 프로젝트 구조 (모노레포)

```
jogak/
├── packages/
│   ├── core/              # 프레임워크 중립 핵심 엔진
│   ├── react/             # React SPA 어댑터
│   ├── next/              # Next.js SSR + Server Components 어댑터
│   ├── web-components/    # Vanilla JS / Web Components 어댑터
│   └── ui/                # 쇼케이스 뷰어 앱 (React)
├── examples/
│   ├── react-app/
│   ├── nextjs-app/
│   └── vanilla/
├── e2e/                   # Playwright 테스트
├── benchmarks/            # 성능 기준선
├── pnpm-workspace.yaml
└── package.json
```

## Core 패키지 핵심 타입

```typescript
// 스토리 파일에서 내보내는 기본 단위
export interface Story {
  name: string
  component: ComponentType | string  // React 컴포넌트 또는 Web Component 태그명
  args?: Record<string, unknown>     // 기본 props
  argTypes?: Record<string, ArgType> // props 메타데이터 (자동 추출 또는 수동 정의)
  parameters?: StoryParameters
}

// 스토리 파일 전체 (named export 방식)
export interface StoryFile {
  default: StoryMeta   // 컴포넌트 레벨 메타
  [storyName: string]: Story | StoryMeta
}

// 컴포넌트 레지스트리 엔트리
export interface RegistryEntry {
  id: string           // 고유 식별자 (파일 경로 기반)
  title: string        // 표시 이름 (/ 구분자로 카테고리 표현: "Form/Button")
  stories: Story[]
  meta: ComponentMeta
}

// Props 메타데이터 (빌드 타임에 TypeScript AST로 추출)
export interface ArgType {
  type: string
  description?: string
  defaultValue?: unknown
  control?: 'text' | 'number' | 'boolean' | 'select' | 'radio' | 'color'
  options?: unknown[]  // select / radio 용
}
```

## API 계약 작성 패턴

계약 파일(`_workspace/01_arch/api-contracts.md`)에 반드시 포함할 항목:

```markdown
## {기능명} API 계약

### 패키지 영향
- core: [영향 있는 경우]
- ui: [영향 있는 경우]
- adapters: [영향 있는 경우]

### 새 타입 / 변경된 타입
\`\`\`typescript
// 인터페이스 코드
\`\`\`

### 설계 이유
- [결정 1]: [이유]
- [결정 2]: [이유]

### 제약 사항
- [프레임워크별 제약이나 주의사항]
```

## 설계 원칙

**1. 코어는 프레임워크 중립**
core 패키지가 React를 import하면 Web Components 어댑터를 만들 수 없다.
React 타입이 필요하면 `ComponentType` 대신 `unknown`을 사용하고 어댑터에서 타입 좁히기.

**2. 스토리 포맷은 기존 생태계와 호환**
`.story.tsx` 파일이 CSF(Component Story Format)와 유사하면 기존 Storybook 사용자가 마이그레이션하기 쉽다.
완전히 다른 포맷을 선택할 이유가 없다면 CSF 3.0을 기준으로 설계한다.

**3. public API 최소화**
`packages/*/src/index.ts`에서 export하는 심볼 수를 최소화한다.
내부 구현은 `internal/` 폴더에 두고 외부에서 import하지 못하도록 경로 별칭으로 제한한다.

**4. 버저닝 친화적 설계**
optional 필드로 시작하여 나중에 required로 올린다. 그 반대는 breaking change.
새 기능은 새 export로 추가, 기존 export를 변경하지 않는다.

## Vite 플러그인 인터페이스

```typescript
// packages/core/src/vite/plugin.ts
import type { Plugin } from 'vite'

export interface JogakPluginOptions {
  stories?: string[]          // glob 패턴: ['src/**/*.story.tsx']
  outDir?: string             // 빌드 출력 경로
  framework?: 'react' | 'next' | 'web-components'
}

export function jogak(options?: JogakPluginOptions): Plugin {
  // ...
}
```

## 어댑터 공통 인터페이스

각 어댑터가 core에서 받아 구현해야 할 인터페이스:

```typescript
// packages/core/src/adapter.ts
export interface JogakAdapter {
  framework: 'react' | 'next' | 'web-components'
  // 컴포넌트를 렌더링하는 방법
  render(entry: RegistryEntry, args: Record<string, unknown>, container: HTMLElement): void | Promise<void>
  // 정리 (언마운트)
  unmount(container: HTMLElement): void
}
```
