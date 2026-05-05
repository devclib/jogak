---
name: jogak-adapter-implementer
description: "Jogak 프레임워크 어댑터 구현 패턴을 제공한다. React SPA, Next.js SSR/Server Components, Web Components(Vanilla JS) 어댑터 개발 시 반드시 이 스킬을 참조. 어댑터 패키지 구조, 프레임워크별 제약 사항, 번들 설정 포함."
---

# Jogak Adapter Implementer

세 가지 프레임워크 어댑터의 구현 패턴을 담는다.

## 어댑터 공통 원칙

- `@jogak/core`만 의존한다. 어댑터 간 상호 의존 금지
- 각 어댑터는 독립적으로 `npm publish` 가능
- peerDependencies로 프레임워크 버전 범위 지정

```json
// packages/react/package.json
{
  "name": "@jogak/react",
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "dependencies": {
    "@jogak/core": "workspace:*"
  }
}
```

---

## React SPA 어댑터

가장 단순한 어댑터. React가 이미 있으므로 런타임 비용이 추가 없다.

```typescript
// packages/react/src/adapter.ts
import { createRoot } from 'react-dom/client'
import type { JogakAdapter, RegistryEntry } from '@jogak/core'

export const reactAdapter: JogakAdapter = {
  framework: 'react',

  render(entry, args, container) {
    const Component = entry.meta.component as React.ComponentType
    const root = createRoot(container)
    root.render(<Component {...args} />)
    // container에 root를 저장해 unmount 시 사용
    ;(container as any).__jogakRoot = root
  },

  unmount(container) {
    ;(container as any).__jogakRoot?.unmount()
  }
}
```

```typescript
// packages/react/src/JogakProvider.tsx
// 쇼케이스 앱의 최상위 Provider — 레지스트리를 Context로 제공
export function JogakProvider({ children }: { children: React.ReactNode }) {
  return (
    <RegistryContext.Provider value={registry}>
      {children}
    </RegistryContext.Provider>
  )
}
```

**Vite 설정 (React SPA):**
```typescript
// examples/react-app/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { jogak } from '@jogak/core/vite'

export default defineConfig({
  plugins: [react(), jogak({ stories: ['src/**/*.story.tsx'] })]
})
```

---

## Next.js 어댑터

Server Component 환경에서 쇼케이스를 실행하는 것이 핵심 도전 과제.

**컴포넌트 경계 설계:**
```
packages/next/src/
├── server/
│   ├── JogakLayout.tsx      # Server Component — 레이아웃, 메타데이터
│   └── StoryLoader.tsx      # Server Component — 스토리 파일 목록 로드
└── client/
    ├── Preview.tsx          # "use client" — 인터랙티브 프리뷰
    ├── Controls.tsx         # "use client" — Props 컨트롤러
    └── JogakProvider.tsx    # "use client" — 클라이언트 레지스트리
```

Server Component에서 props를 Client Component로 전달하는 패턴:
```typescript
// packages/next/src/server/StoryLoader.tsx
// React import 없이 async 함수형 Server Component
export default async function StoryLoader({ storyId }: { storyId: string }) {
  // 서버에서 스토리 메타데이터 로드 (파일 시스템 접근 가능)
  const stories = await loadStoriesFromFs()
  
  return (
    // Client Component에 직렬화 가능한 데이터만 전달
    <ClientPreview storyId={storyId} initialMeta={stories[storyId].meta} />
  )
}
```

**Server Component 제약:**
- `useState`, `useEffect`, `useContext` 사용 불가 → Client Component로 분리
- 직렬화 불가능한 값 (함수, 클래스 인스턴스) Props 전달 불가
- 컴포넌트 레퍼런스는 서버에서 클라이언트로 전달 불가 — `storyId` (string)로 전달하고 클라이언트에서 레지스트리 조회

**Next.js 라우팅 설정:**
```typescript
// App Router 기반: app/jogak/[...path]/page.tsx
export default function JogakPage({ params }: { params: { path: string[] } }) {
  const storyId = params.path.join('/')
  return <JogakLayout storyId={storyId} />
}
```

---

## Web Components 어댑터

React 없이 Vanilla JS에서 쇼케이스를 실행한다.

**핵심 설계 결정:**
React 컴포넌트를 Web Component로 래핑할 때 두 가지 접근이 있다:
1. **React 내부 번들링**: 번들에 React 포함 (~150KB) — 단순하지만 크다
2. **Preact 사용**: Preact는 React 호환 API로 ~3KB — 작지만 완전 호환은 아님

기본값으로 Preact를 사용하되, 옵션으로 React 번들을 선택 가능하게 설계한다.

```typescript
// packages/web-components/src/define.ts
import { h, render } from 'preact'  // 또는 React (옵션)

export function defineJogakElement(tagName: string, entry: RegistryEntry) {
  class JogakPreview extends HTMLElement {
    private _args: Record<string, unknown> = {}
    private _shadow: ShadowRoot

    constructor() {
      super()
      // Shadow DOM으로 스타일 격리
      this._shadow = this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
      this._render()
    }

    // Observed attributes로 props 변경 감지
    static get observedAttributes() {
      return Object.keys(entry.meta.argTypes ?? {})
    }

    attributeChangedCallback(name: string, _old: string, value: string) {
      this._args = { ...this._args, [name]: parseAttrValue(value, entry.meta.argTypes?.[name]) }
      this._render()
    }

    private _render() {
      const Component = entry.meta.component
      render(h(Component as any, this._args), this._shadow)
    }

    disconnectedCallback() {
      render(null, this._shadow)
    }
  }

  customElements.define(tagName, JogakPreview)
}
```

**번들 설정 (Web Components는 self-contained):**
```typescript
// packages/web-components/vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'iife'],  // iife: script 태그로 직접 로드 지원
      name: 'JogakWC',
    },
    rollupOptions: {
      // preact를 번들에 포함 (external 하지 않음)
      external: [],
    },
  },
})
```

**Vanilla JS 사용 예시:**
```html
<script type="module" src="jogak-wc.js"></script>
<jogak-preview story-id="Form/Button" label="Submit" disabled="false"></jogak-preview>
```

---

## 어댑터 타입 안전성 확보

```typescript
// packages/core/src/adapter.ts — 각 어댑터가 구현해야 할 인터페이스
export interface JogakAdapter {
  framework: 'react' | 'next' | 'web-components'
  render(entry: RegistryEntry, args: Record<string, unknown>, container: HTMLElement): void | Promise<void>
  unmount(container: HTMLElement): void
}

// 타입 체크: 각 어댑터 파일에서
import type { JogakAdapter } from '@jogak/core'
const _typeCheck: JogakAdapter = reactAdapter  // 타입 불일치 시 컴파일 에러
```
