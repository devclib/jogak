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
 * 사이드바 렌더링용 카테고리 트리.
 * title의 '/' 구분자로 계층 구성 (예: "Form/Button" → { Form: { Button: RegistryEntry } })
 *
 * interface로 선언해야 한다 — type alias는 자기 참조 순환 타입을 지원하지 않는다.
 */
export interface CategoryTree {
  [key: string]: RegistryEntry | CategoryTree
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
}
