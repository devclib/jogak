/**
 * Props 메타데이터 — TypeScript AST에서 빌드 타임에 추출되거나 수동으로 정의된다.
 */
export interface ArgType {
  readonly type?: string
  readonly description?: string
  readonly defaultValue?: unknown
  readonly control?: 'text' | 'number' | 'boolean' | 'select' | 'radio' | 'color' | 'range'
  readonly options?: readonly unknown[]
  readonly required?: boolean
  /**
   * 함수 prop을 자동으로 Action으로 처리한다.
   * - `true`: 어댑터가 prop 이름으로 spy를 주입
   * - `string`: 지정한 이름으로 spy를 주입
   */
  readonly action?: boolean | string
}

/**
 * *.jogak.(ts|tsx) 파일의 default export — 컴포넌트 수준 메타데이터
 */
export interface JogakMeta {
  readonly title: string
  readonly component?: unknown
  readonly argTypes?: Readonly<Record<string, ArgType>>
  readonly tags?: readonly string[]
  readonly parameters?: Readonly<Record<string, unknown>>
}

/**
 * *.jogak.(ts|tsx) 파일의 named export — 컴포넌트의 개별 사용 예시
 */
export interface Jogak {
  readonly name: string
  readonly args?: Readonly<Record<string, unknown>>
  readonly argTypes?: Readonly<Record<string, ArgType>>
  readonly parameters?: Readonly<Record<string, unknown>>
}

/**
 * 컴포넌트 레지스트리에 등록된 엔트리
 */
export interface RegistryEntry {
  readonly id: string
  readonly title: string
  readonly jogaks: readonly Jogak[]
  readonly meta: JogakMeta
  readonly filePath?: string
  readonly source?: string
}

/**
 * 인덱스 가상모듈에 들어가는 "껍데기" 메타.
 *
 * - user 컴포넌트(`meta.component`)와 jogak 객체(`render`/`args`/...)를 포함하지 않는다.
 * - 사이드바 렌더링·검색·트리 구성에 필요한 최소 정보만 담는다.
 * - hydrate 시점에 이 meta로부터 완전한 RegistryEntry를 합성한다.
 */
export interface RegistryEntryMeta {
  readonly id: string
  readonly title: string
  /** 이 entry의 jogak 객체 이름 목록 — 사이드바에서 sub-item 표시용. */
  readonly jogakNames: readonly string[]
  /** ts-morph로 추출한 자동 argTypes (소스 변경 없으면 정적). */
  readonly autoArgTypes: Readonly<Record<string, ArgType>>
  /** *.jogak 파일에서 사용자가 직접 작성한 argTypes (meta.argTypes). */
  readonly userArgTypes: Readonly<Record<string, ArgType>>
  /** *.jogak 파일의 원본 텍스트 — Source 패널이 즉시 표시 가능해야 하므로 인덱스에 포함. */
  readonly source: string
  /** 절대경로 — HMR/디버깅용. */
  readonly filePath: string
  /**
   * 사용자 meta의 직렬화 가능한 잔여 필드만 보관 (tags, parameters).
   * `component`는 함수라 직렬화 불가 → 제외. `argTypes`는 위에서 분리.
   */
  readonly metaExtras: {
    readonly tags?: readonly string[]
    readonly parameters?: Readonly<Record<string, unknown>>
  }
}

/**
 * 사이드바 렌더링용 카테고리 트리.
 * title의 '/' 구분자로 계층 구성 (예: "Form/Button" → { Form: { Button: RegistryEntry } })
 *
 * interface로 선언해야 한다 — type alias는 자기 참조 순환 타입을 지원하지 않는다.
 */
export interface CategoryTree {
  [key: string]: RegistryEntry | CategoryTree
}

/**
 * Sidebar용 메타 트리 — `RegistryEntry` 자리에 `RegistryEntryMeta`.
 * lazy 모드에서 hydrate 전에도 사이드바를 그릴 수 있도록 별도 트리 구조.
 */
export interface CategoryMetaTree {
  [key: string]: RegistryEntryMeta | CategoryMetaTree
}

/**
 * 각 어댑터(React, Next.js, Web Components)가 구현해야 하는 공통 인터페이스
 */
export interface JogakAdapter {
  readonly framework: 'react' | 'next' | 'web-components'
  render(
    entry: RegistryEntry,
    args: Readonly<Record<string, unknown>>,
    container: HTMLElement,
  ): void | Promise<void>
  unmount(container: HTMLElement): void
}

/**
 * Vite 플러그인 설정
 */
export interface JogakPluginOptions {
  readonly patterns?: readonly string[]
  readonly framework?: 'react' | 'next' | 'web-components'
  /**
   * prism-react-renderer 테마 이름.
   * 사용 가능한 값: dracula | duotoneDark | duotoneLight | github | jettwaveDark |
   * jettwaveLight | nightOwl | nightOwlLight | oceanicNext | okaidia | oneDark |
   * oneLight | palenight | shadesOfPurple | solarizedlight | synthwave84 |
   * ultramin | vsDark (기본값) | vsLight
   */
  readonly codeTheme?: string
  /**
   * glob의 cwd. 미지정 시 Vite `config.root`를 사용한다.
   *
   * `runHost` 같은 외부 호스트가 Vite root를 다른 패키지 디렉토리로 잡고
   * 사용자 프로젝트의 jogak 파일을 가상 모듈로 주입하고 싶을 때 사용.
   * 미지정 시 기존 동작과 동일하다 (back-compat).
   */
  readonly cwd?: string
  /**
   * ts-morph용 tsconfig 절대 경로.
   * 미지정 시 `<resolvedCwd>/tsconfig.json`을 자동 감지하며,
   * 파일이 없으면 tsconfig 없이 PropsExtractor를 생성한다.
   */
  readonly tsConfigFilePath?: string
  /**
   * F1: dev 부팅 시 jogak 의존 패키지(`@jogak/core`, `@jogak/react`, ...)의
   * dist 변경을 감지해 Vite optimizeDeps cache(`node_modules/.vite/deps`)를
   * 자동 삭제한다. 기본값 false (검증 활성화).
   *
   * workspace로 링크된 어댑터를 자주 빌드하는 환경에서는 그대로 두면
   * `SyntaxError: ... does not provide an export named ...` 류의
   * stale prebundle 에러를 자동으로 회피한다.
   *
   * true로 설정하면 검증을 끈다 — 사용자가 직접 `rm -rf node_modules/.vite/deps`
   * 또는 `--force`를 관리해야 한다.
   */
  readonly disableCacheValidation?: boolean
  /**
   * 사용자 명시 path alias. 미지정 시 사용자 tsconfig의 `compilerOptions.paths`를
   * 자동으로 읽어 vite `resolve.alias`로 등록한다 (shadcn/ui 같이 `@/`를 쓰는
   * 일반적 환경 대응).
   *
   * 자동 추출은 단순 prefix 매핑(`"@/*": ["./src/*"]`)만 처리하므로,
   * `extends` 체인이나 복합 glob 패턴을 쓰는 경우 본 옵션으로 명시 전달한다.
   * 본 옵션이 자동 추출 결과를 덮어쓴다.
   *
   * 값은 alias prefix → 절대 경로(또는 cwd 기준 상대 경로) 맵이다.
   *
   * @example
   * jogak({ resolveAlias: { '@': './src', '@components': './src/components' } })
   */
  readonly resolveAlias?: Readonly<Record<string, string>>
  /**
   * 사용자 globalCss를 jogak SPA에 import한다 (알파.6 opt-in).
   *
   * 동기:
   * - `runHost`는 vite root를 `@jogak/ui` 패키지로 두고 사용자 `vite.config.ts`/
   *   `main.tsx`를 무시하므로(`configFile: false`), 사용자 `index.css`(Tailwind/
   *   shadcn 디자인 토큰)가 jogak SPA에 자동 적용되지 않는다.
   * - 본 옵션이 `true`이거나 명시 경로면 plugin이 사용자 css를 가상 모듈로
   *   주입해 jogak SPA가 import한다.
   *
   * 의미:
   * - `false` (default): 미주입. jogak chrome 기본 스타일만 사용 (알파.4~5 동작 그대로).
   * - `true`: `<userRoot>/src/{index,main,styles,global,app,globals}.css` 후보를
   *   순차 검사해 **첫 발견 1개**만 import. 미발견 시 빈 모듈 (no-op).
   * - `string`: 사용자 root 기준 상대 경로 또는 절대 경로 1개. 자동 감지 비활성화.
   * - `string[]`: 명시 경로 N개를 배열 순서대로 모두 import. 자동 감지 비활성화.
   *
   * 자동 감지 후보 (우선순위 순):
   * 1. `src/index.css` (shadcn/ui Vite)
   * 2. `src/main.css`
   * 3. `src/styles.css`
   * 4. `src/styles/globals.css` (Next.js shadcn)
   * 5. `src/styles/index.css`
   * 6. `src/app/globals.css` (Next.js App Router shadcn)
   * 7. `src/global.css`
   * 8. `src/app.css`
   *
   * 격리:
   * - jogak UI는 알파.4~5에서 Tailwind v4 + `prefix=jogak`로 마이그레이션되어
   *   사용자 utility class와 충돌 zero (예: 사용자 `.bg-primary` ≠ jogak `.jogak\:bg-...`).
   * - jogak CSS variable은 `--jogak-*` prefix → 사용자 `:root { --primary }` 같은
   *   토큰과 namespace 충돌 zero.
   * - 단, 사용자 css의 `*` selector / `body` selector / reset 류는 jogak chrome에
   *   영향 가능. README의 "scope 가이드" 패턴 참조.
   *
   * 한계 (알파.7+ 로드맵):
   * - 사용자 css를 preview 영역으로만 한정하는 Shadow DOM/iframe 격리는 미지원.
   * - `previewIsolation` 옵션은 알파.7+에서 별도 도입.
   * - `globalCss: true` 자동 감지는 dev 시작 시점에 한 번만 수행 — 후보 css 파일이
   *   dev 시작 후에 새로 추가되면 dev 서버 재시작이 필요하다. 명시 경로
   *   (`globalCss: './src/index.css'`)는 파일이 나중에 생성되어도 정상 hot reload된다.
   *
   * @default false
   *
   * @example 자동 감지
   * jogak({ globalCss: true })
   *
   * @example 명시 경로
   * jogak({ globalCss: './src/index.css' })
   *
   * @example 다중 import (디자인 토큰 + reset 분리)
   * jogak({ globalCss: ['./src/tokens.css', './src/index.css'] })
   */
  readonly globalCss?: boolean | string | readonly string[]
  /**
   * Preview 영역의 격리 모드 (알파.7 도입, 알파.7.1에서 default 변경).
   *
   * 사용자 globalCss와 jogak chrome의 양방향 격리를 제공한다. 알파.7까지는
   * 사용자 globalCss를 outer document에 inject하면서 jogak chrome utility를
   * 무력화하는 결함이 있었으나 알파.7.1에서 main.tsx + ShadowMount가 모드별
   * scope을 분리하도록 정정됨.
   *
   * 모드:
   * - `'shadow'` (default, 알파.7.1): Preview의 `[data-jogak-content]` 영역만
   *   ShadowRoot에 마운트하고 사용자 globalCss를 ShadowRoot scope에만 inject.
   *   outer document의 jogak chrome은 사용자 reset/preflight 침범을 받지 않는다.
   *   **한계**: Radix UI(shadcn dialog/popover/tooltip 등)는 default Portal target이
   *   `document.body` (shadow 외부) — portal 내용은 사용자 css 미적용. 회피:
   *   사용자가 명시적으로 `<Portal container={shadowRootEl}>` 전달.
   * - `'iframe'`: Preview를 별도 `<iframe>`에 로드. 완벽 격리. **한계**: jogak의
   *   "single Vite, no iframe" 차별점과 상충하므로 명시적 opt-in 한정. HMR은
   *   iframe도 Vite dev server module이라 작동하지만, args/이벤트 전달이
   *   `contentWindow` 직접 접근 한 단계 추가됨.
   * - `'none'` (back-compat opt-in): Preview는 jogak SPA와 동일 document에 마운트하고
   *   사용자 globalCss를 outer document에 inject. 사용자 reset/preflight가 jogak
   *   chrome에 침범 가능. 사용자가 침범을 의도적으로 허용하는 경우만 사용.
   *
   * @default 'shadow'
   *
   * @example 양방향 격리 (default — 미지정 시 적용)
   * jogak({ globalCss: true })  // previewIsolation 'shadow' 자동 적용
   *
   * @example 사용자 reset이 chrome에도 영향을 주길 원하는 경우
   * jogak({ globalCss: true, previewIsolation: 'none' })
   *
   * @example Radix portal까지 완벽 격리
   * jogak({ globalCss: true, previewIsolation: 'iframe' })
   */
  readonly previewIsolation?: 'none' | 'shadow' | 'iframe'
}
