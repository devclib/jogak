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
 * 컴포넌트가 어떤 framework로 렌더링되어야 하는지 식별하는 union.
 *
 * 사이드바 entry의 dispatch 시 어떤 renderer adapter를 사용할지 결정한다.
 * `JogakMeta.framework` (파일 단위 명시) > `JogakPluginOptions.framework` (전역)
 * > `'react'` (기본) 순으로 결정된다.
 */
export type JogakFramework = 'react' | 'next' | 'web-components' | 'vue' | 'svelte'

/**
 * *.jogak.(ts|tsx) 파일의 default export — 컴포넌트 수준 메타데이터
 */
export interface JogakMeta {
  readonly title: string
  readonly component?: unknown
  readonly argTypes?: Readonly<Record<string, ArgType>>
  readonly tags?: readonly string[]
  readonly parameters?: Readonly<Record<string, unknown>>
  /**
   * 알파.14.1: 이 jogak 파일이 어떤 framework의 컴포넌트를 등록하는지 명시.
   *
   * 미지정 시 `JogakPluginOptions.framework` 전역값을 사용하며, 그것도 없으면
   * `'react'` fallback. lazy 모드의 사이드바에서도 dispatch 가능하도록
   * `RegistryEntryMeta.framework`로 그대로 전파된다.
   */
  readonly framework?: JogakFramework
  /**
   * 1.0.0 post-1.0: MDX docs addon (Storybook Docs 대응).
   *
   * 값은 `.jogak.(ts|tsx)` 파일 기준 상대 경로 (예: `'./Button.mdx'`) 또는 확장 없는 slug.
   * Preview에 docs tab이 노출되고, iframe scope의 사용자 vite가 dynamic import로 MDX
   * 파일을 로드해 React 컴포넌트로 렌더한다.
   *
   * 사용자가 `rollup-plugin-mdx` 또는 `@mdx-js/rollup` 등을 사용자 vite.config에 등록해야
   * .mdx가 컴파일된다 (jogak은 MDX 컴파일러를 번들 안 함 — 사용자 vite scope 재사용).
   *
   * @example
   * ```tsx
   * // Button.jogak.tsx
   * const meta = {
   *   title: 'Components/Button',
   *   component: Button,
   *   docs: './Button.mdx',
   * } satisfies JogakMeta
   * ```
   */
  readonly docs?: string
}

/**
 * 1.1.0 post-1.0: Play 함수 인자 (Storybook `PlayFunctionContext` 대응).
 *
 * jogak은 최소 필드만 노출 — `canvasElement`는 컴포넌트가 mount된 root 요소.
 * `@testing-library/user-event` 등 라이브러리는 사용자가 별도 install.
 */
export interface JogakPlayContext {
  readonly canvasElement: HTMLElement
  readonly args: Readonly<Record<string, unknown>>
}

/**
 * *.jogak.(ts|tsx) 파일의 named export — 컴포넌트의 개별 사용 예시
 */
export interface Jogak {
  readonly name: string
  readonly args?: Readonly<Record<string, unknown>>
  readonly argTypes?: Readonly<Record<string, ArgType>>
  readonly parameters?: Readonly<Record<string, unknown>>
  /**
   * 1.1.0 post-1.0: Play 함수 (Storybook `addon-interactions` 대응).
   *
   * mount 완료 후 iframe scope에서 async로 실행된다. `canvasElement`(root 요소)를
   * 인자로 받아 사용자 상호작용(click, type 등)을 시뮬레이션. `@testing-library/user-event`
   * 를 사용자가 install해서 활용한다 (jogak은 미번들).
   *
   * Chrome 툴바의 ▶ 버튼 클릭 시 실행. 완료/에러는 postMessage로 chrome에 전송.
   *
   * @example
   * ```ts
   * import { userEvent, within } from '@testing-library/react'
   *
   * export const Primary: Jogak = {
   *   name: 'Primary',
   *   args: { label: 'Click me' },
   *   play: async ({ canvasElement }) => {
   *     await userEvent.click(within(canvasElement).getByRole('button'))
   *   },
   * }
   * ```
   */
  readonly play?: (ctx: JogakPlayContext) => void | Promise<void>
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
  /**
   * 알파.14.1: 각 jogak variant의 default args.
   *
   * 동기: iframe isolation 모드에서는 chrome scope가 user .jogak.* 모듈을 평가하지
   * 않으므로(skipHydrate), `export const Default: Jogak = { args: { ... } }`의 args를
   * 알 수 없다. parser가 정적으로 추출하여 chrome → iframe postMessage에 동봉한다.
   *
   * 키는 jogak.name, 값은 그 variant의 args(직렬화 가능 literal만; 함수/심볼은 제외).
   * args 자체가 없는 variant는 키 자체가 없음 (빈 객체 대신).
   */
  readonly jogakDefaultArgs: Readonly<Record<string, Readonly<Record<string, unknown>>>>
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
  /**
   * 알파.14.1: lazy 모드에서도 어떤 renderer adapter로 dispatch할지 결정 가능하도록
   * 사이드바 메타에 framework를 그대로 전파.
   *
   * 결정 우선순위:
   * 1. 파일의 `meta.framework`
   * 2. `JogakPluginOptions.framework` 전역
   * 3. `'react'` fallback (이미 registry parser에서 적용됨)
   */
  readonly framework?: JogakFramework
  /**
   * 1.0.0 post-1.0: MDX docs path (JogakMeta.docs를 그대로 전파).
   * `.jogak.tsx` 파일 기준 상대 경로. Preview docs tab이 활성화되는 조건.
   */
  readonly docs?: string
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
 * 각 어댑터(React, Next.js, Web Components, Vue, Svelte)가 구현해야 하는 공통 인터페이스
 */
export interface JogakAdapter {
  readonly framework: JogakFramework
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
  /**
   * 알파.14.1: 사용자 프로젝트 전역의 기본 framework. 각 jogak 파일에 `meta.framework`가
   * 명시되지 않은 경우 이 값을 사용한다. 둘 다 없으면 `'react'` fallback.
   *
   * 단일 framework 전용 프로젝트에서는 본 옵션을 한 번 설정해 모든 entry의 framework를
   * 일괄 결정한다. 멀티 framework 환경(예: react + vue 혼합)에서는 `meta.framework`를
   * 파일 단위로 명시한다.
   */
  readonly framework?: JogakFramework
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
   * Preview 영역의 격리 모드 (알파.7 도입, 알파.8에서 default `'iframe'`로 변경).
   *
   * 알파.8의 default `'iframe'`은 사용자 vite 인스턴스를 spawn하여 그 vite의 정상 client에
   * iframe document를 마운트한다. 사용자 plugins(@tailwindcss/vite 등)이 그대로 작동하므로
   * **사용자 컴포넌트가 사용자 디자인 시스템 그대로 보인다**. 동시에 outer document의
   * jogak chrome은 iframe 외부라 사용자 css 영향 zero (양방향 격리).
   *
   * 모드:
   * - `'iframe'` (default, 알파.8): Preview를 사용자 vite의 정상 client(iframe)에 마운트.
   *   사용자 utility 정상 컴파일 + 사용자 globalCss 적용 + Radix Portal 정상 (iframe document.body).
   *   chrome 침범 zero. cross-origin postMessage로 entry/args 전달.
   *   `userVite` 옵션으로 spawn 동작 제어.
   * - `'shadow'` (deprecated, 알파.9 부활 검토): Preview를 ShadowRoot에 마운트. 알파.8 v1에서는
   *   사용자 vite 산출물을 shadow에 inject하는 통로가 미구현 — 사용자 utility 미적용 한계.
   *   chrome 침범은 zero지만 사용자 컴포넌트 시각이 raw에 가까움.
   * - `'none'` (deprecated, 알파.10 제거 검토): 사용자 globalCss를 outer document에 inject.
   *   jogak chrome이 사용자 reset/preflight 영향을 받음 (back-compat).
   *
   * @default 'iframe'
   *
   * @example 사용자 vite 자동 spawn + iframe 모드 (default — 미지정 시 적용)
   * jogak({ globalCss: true })  // previewIsolation 'iframe', 사용자 vite 자동 탐지
   *
   * @example 사용자 vite 스폰 비활성 + 사용자 reset이 chrome에도 영향 (back-compat)
   * jogak({ globalCss: true, previewIsolation: 'none' })
   */
  readonly previewIsolation?: 'none' | 'shadow' | 'iframe'
  /**
   * 알파.8 internal: 본 jogak() plugin이 사용자 vite scope의 preview-frame entry용으로
   * 동작하는지. CLI의 spawnUserVite가 사용자 vite에 jogak()을 mergeConfig로 inject할 때
   * `previewFrame: true`를 함께 설정한다.
   *
   * `previewFrame: true`일 때:
   * - jogak SPA chrome 가상 모듈(`_jogakCodeTheme`/`_jogakPreviewIsolation`/`_jogakUserViteUrl`/
   *   `_jogakMetas`) emit 비활성화
   * - entry 가상 모듈(`virtual:jogak/entry/<slug>`)은 그대로 emit (preview-entry가 사용)
   * - 사용자 측 vite plugins(@tailwindcss/vite 등)와 공존
   *
   * 사용자가 직접 설정하는 옵션이 아니다.
   */
  readonly previewFrame?: boolean
  /**
   * @deprecated 알파.10 제거 예정. `userPreviewUrl` 사용.
   *
   * 알파.8 internal: jogak SPA가 iframe src로 사용할 사용자 vite의 base URL.
   */
  readonly userViteUrl?: string
  /**
   * 알파.9 internal: jogak SPA가 iframe src로 사용할 어댑터 dev URL
   * (예: `http://localhost:5174`). CLI의 어댑터 dispatch 결과가 host 통해 plugin에 전달.
   *
   * 빈 문자열 시 fallback (jogak SPA Vite scope의 preview-frame).
   *
   * 사용자가 직접 설정하는 옵션이 아니다.
   */
  readonly userPreviewUrl?: string
  /**
   * 알파.9 internal: iframe src의 path (예: `/__jogak_preview__/index.html`).
   * `BuilderAdapter.previewEntryMeta.devEntryPath` 값. 어댑터별 routing.
   *
   * 사용자가 직접 설정하는 옵션이 아니다.
   */
  readonly previewEntryPath?: string
  /**
   * 1.0.0-beta.6 internal: 로드된 `jogak.config.{ts,mts,mjs,js,json}` 절대 경로.
   * CLI의 `loadJogakConfig` 결과가 host 통해 plugin에 전달된다.
   *
   * plugin이 `configureServer` 훅에서 이 파일을 `server.watcher.add`로 등록해
   * 변경 시 자동으로 `server.restart()`한다. beta.5까지는 사용자가 수동 restart 필요.
   *
   * 사용자가 직접 설정하는 옵션이 아니다.
   */
  readonly configPath?: string
  /**
   * 1.0.0 post-1.0: Themes addon. Preview 툴바에 theme selector 노출.
   *
   * 사용자가 CSS에서 `[data-theme="dark"] { --bg: black }` 등을 정의하면
   * 툴바에서 theme 선택 시 iframe의 `document.documentElement`에 `data-theme` attribute가
   * 설정되어 CSS가 그에 반응한다. Storybook `addon-themes` 대응.
   *
   * 값은 theme 이름 배열 (예: `['light', 'dark']`). 첫 요소가 default.
   * 미지정/빈 배열이면 툴바에 theme selector 미표시.
   *
   * @example
   * ```ts
   * // jogak.config.ts
   * export default defineJogakConfig({ themes: ['light', 'dark'] })
   * ```
   * ```css
   * // src/styles/globals.css
   * [data-theme='dark'] { --bg: #111; --fg: #eee }
   * [data-theme='light'] { --bg: #fff; --fg: #111 }
   * ```
   */
  readonly themes?: readonly string[]
}

/**
 * 알파.8: 사용자 vite 인스턴스 spawn 옵션.
 *
 * jogak CLI는 사용자 cwd의 `vite.config.{ts,mts,js,mjs,cjs}`를 자동 탐지해 별도
 * vite dev server를 spawn한다. iframe 모드의 src로 사용되어 사용자 컴포넌트가
 * 사용자 vite plugins(@tailwindcss/vite, custom alias 등)의 정상 client에서
 * 평가된다.
 */
export interface UserViteOptions {
  /**
   * 사용자 vite.config.ts 절대/상대 경로. 미지정 시 cwd에서 자동 탐지
   * (`vite.config.ts` > `vite.config.mts` > `vite.config.js` > `vite.config.mjs` > `vite.config.cjs`).
   */
  readonly configFile?: string
  /**
   * 사용자 vite dev server 포트. 미지정 시 0(free port).
   */
  readonly port?: number
  /**
   * 사용자 vite dev server host. 미지정 시 'localhost'.
   */
  readonly host?: string | boolean
  /**
   * 사용자 vite spawn을 비활성화. 알파.7.1 동등 fallback 동작
   * (사용자 utility 미컴파일).
   */
  readonly disabled?: boolean
}
