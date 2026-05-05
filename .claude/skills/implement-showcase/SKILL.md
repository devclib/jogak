---
name: jogak-showcase-implementer
description: "Jogak 코어 엔진과 쇼케이스 뷰어 UI 구현 패턴을 제공한다. 컴포넌트 레지스트리, Vite 플러그인, HMR, Props 메타데이터 추출, 쇼케이스 뷰어 React 컴포넌트 구현 시 반드시 참조."
---

# Jogak Showcase Implementer

core 패키지와 ui 패키지 구현 패턴을 담는다.

## 모노레포 초기 설정

```bash
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'examples/*'
```

```json
// packages/core/package.json (핵심 필드만)
{
  "name": "@jogak/core",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./vite": {
      "import": "./dist/vite/index.mjs",
      "types": "./dist/vite/index.d.ts"
    }
  },
  "sideEffects": false
}
```

## ComponentRegistry 구현 패턴

레지스트리는 싱글톤이 아니라 인스턴스로 만든다 — 테스트 격리와 SSR 안전성을 위해.

```typescript
// packages/core/src/registry.ts
export class ComponentRegistry {
  private entries = new Map<string, RegistryEntry>()

  register(entry: RegistryEntry): void {
    this.entries.set(entry.id, entry)
  }

  get(id: string): RegistryEntry | undefined {
    return this.entries.get(id)
  }

  getAll(): RegistryEntry[] {
    return Array.from(this.entries.values())
  }

  // 카테고리 트리 구조 반환 ("Form/Button" → { Form: { Button: ... } })
  getTree(): CategoryTree {
    // title의 '/' 구분자로 계층 구성
  }
}
```

## Vite 플러그인 구현 패턴

```typescript
// packages/core/src/vite/plugin.ts
import type { Plugin, ViteDevServer } from 'vite'
import { glob } from 'glob'

export function jogak(options: JogakPluginOptions = {}): Plugin {
  const { stories = ['src/**/*.story.tsx'] } = options
  let server: ViteDevServer

  return {
    name: 'vite-plugin-jogak',
    
    configureServer(s) {
      server = s
    },

    // 스토리 파일 변경 감지 → 레지스트리 갱신 → HMR 트리거
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.story.tsx') || file.endsWith('.story.ts')) {
        server.ws.send({ type: 'full-reload' })
      }
    },

    // 가상 모듈: import 'virtual:jogak-stories' 로 전체 스토리 접근
    resolveId(id) {
      if (id === 'virtual:jogak-stories') return '\0virtual:jogak-stories'
    },

    async load(id) {
      if (id === '\0virtual:jogak-stories') {
        const files = await glob(stories)
        // 각 파일을 dynamic import하는 코드 생성
        return generateStoryLoader(files)
      }
    }
  }
}
```

가상 모듈을 사용하는 이유: 빌드 타임에 스토리 파일 목록을 알 수 있으므로, 런타임에 디렉토리를 스캔하는 것보다 훨씬 빠르고 트리 쉐이킹이 가능하다.

## Props 메타데이터 추출 패턴

TypeScript Compiler API를 직접 쓰는 대신 `ts-morph`를 사용한다 — API가 훨씬 간결하다.

```typescript
// packages/core/src/meta/props-extractor.ts
import { Project } from 'ts-morph'

export function extractPropsMetadata(filePath: string): Record<string, ArgType> {
  const project = new Project({ skipAddingFilesFromTsConfig: true })
  const sourceFile = project.addSourceFileAtPath(filePath)

  // 컴포넌트의 Props 타입을 찾는다
  // export default function Button(props: ButtonProps) 형태 지원
  const argTypes: Record<string, ArgType> = {}

  // 인터페이스 프로퍼티를 순회하며 타입 정보 추출
  // JSDoc 주석에서 description 추출
  
  return argTypes
}
```

**런타임이 아닌 빌드 타임 실행:** Vite 플러그인의 `transform` 훅에서 `.story.tsx` 파일을 처리할 때 호출한다. 이렇게 해야 런타임 성능에 영향을 주지 않는다.

## 쇼케이스 뷰어 UI 구조

```
packages/ui/src/
├── app/
│   ├── App.tsx           # 최상위 레이아웃 (사이드바 + 콘텐츠)
│   └── main.tsx          # Vite 엔트리포인트
├── components/
│   ├── Sidebar/          # 컴포넌트 트리 탐색
│   ├── Preview/          # 컴포넌트 렌더러 (iframe)
│   ├── Controls/         # Props 컨트롤러
│   └── Docs/             # 문서 뷰어
└── hooks/
    ├── useRegistry.ts    # 레지스트리 데이터 구독
    └── useStory.ts       # 현재 선택된 스토리 상태
```

## 프리뷰 격리 패턴

컴포넌트 프리뷰를 iframe에서 렌더링하면 스타일이 완전히 격리된다.
iframe 내부는 별도 Vite 엔트리포인트(`preview.html`)로 빌드하고, postMessage로 parent와 통신한다.

```typescript
// 부모 → iframe: 어떤 스토리를 렌더링할지 전달
iframe.contentWindow?.postMessage({ type: 'RENDER_STORY', storyId, args }, '*')

// iframe → 부모: 높이, 에러 등 상태 전달
window.parent.postMessage({ type: 'STORY_READY', height }, '*')
```

iframe이 번거롭다면 Shadow DOM + CSS scope도 대안이지만, 스타일 격리 완전성은 iframe이 우월하다.

## 패키지 빌드 설정

```typescript
// packages/core/vite.config.ts
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'vite/index': 'src/vite/plugin.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vite', 'ts-morph', /^node:/],
    },
  },
  plugins: [dts({ rollupTypes: true })],
})
```

## 개발 서버 실행 흐름

1. `pnpm --filter @jogak/ui dev` 실행
2. Vite가 `vite-plugin-jogak`을 로드
3. 플러그인이 `src/**/*.story.tsx` glob 스캔
4. `virtual:jogak-stories` 가상 모듈 생성
5. 쇼케이스 앱이 가상 모듈 import → 레지스트리에 자동 등록
6. 파일 변경 시 HMR 트리거 → 레지스트리 갱신
