/**
 * 알파.9: 빌더-agnostic 어댑터 ABI.
 *
 * jogak이 사용자 빌더(Vite / Next.js / Webpack / Vanilla)에 무관하게 사용자 컴포넌트를
 * 사용자 빌더의 정상 client에서 평가하도록 하는 공통 인터페이스. core는 어떤 빌더도
 * 직접 import하지 않고 어댑터 dispatch만 책임진다.
 *
 * 어댑터 구현체는 별도 패키지로 분리:
 * - `@jogak/vite-adapter`
 * - `@jogak/next-adapter`
 * - `@jogak/webpack-adapter`
 * - `@jogak/standalone-adapter`
 *
 * `@jogak/cli`가 사용자 cwd 시그널로 builder를 자동 감지하고 해당 adapter를 dynamic import.
 */

export type BuilderName = 'vite' | 'next' | 'webpack' | 'standalone' | 'custom'

export type GlobalCssSpec = boolean | string | readonly string[]

/**
 * 모든 빌더 어댑터가 구현해야 하는 공통 ABI.
 */
export interface BuilderAdapter {
  readonly name: BuilderName
  /** dev server를 spawn. 사용자 빌더의 정상 client + jogak preview entry 주입. */
  spawnDev(opts: SpawnDevOptions): Promise<DevHandle>
  /** 정적 산출물 빌드. iframe entry를 사용자 빌더로 빌드 + jogak SPA outDir에 통합. */
  build(opts: BuildOptions): Promise<BuildResult>
  /** preview entry 통신/주입에 필요한 metadata. */
  readonly previewEntryMeta: PreviewEntryMeta
}

export interface SpawnDevOptions {
  readonly cwd: string
  readonly globalCss?: GlobalCssSpec
  readonly port?: number
  readonly host?: string | boolean
  /** 로그 출력 — 미지정 시 console 사용. */
  readonly logger?: HostLogger
  /** adapter별 추가 옵션 (vite: configFile, next: appDir 등). */
  readonly extra?: Readonly<Record<string, unknown>>
}

export interface DevHandle {
  /** dev server URL (jogak SPA가 iframe src base로 사용). */
  readonly url: string
  readonly port: number
  /** SIGINT/SIGTERM 시 jogak CLI가 호출. 멱등 보장. */
  close(): Promise<void>
}

export interface BuildOptions {
  readonly cwd: string
  readonly globalCss?: GlobalCssSpec
  /** 사용자 빌더 산출물의 출력 디렉토리. jogak이 outDir/preview/로 복사. */
  readonly previewOutDir: string
  readonly logger?: HostLogger
  readonly extra?: Readonly<Record<string, unknown>>
}

export interface BuildResult {
  /** 사용자 빌더가 생성한 산출물 절대 경로 디렉토리 (= previewOutDir). */
  readonly outDir: string
  /** 사용자 빌더가 emit한 entry HTML의 path-relative URL (예: 'index.html'). */
  readonly entryHtml: string
  readonly assetCount: number
  readonly totalBytes: number
  readonly elapsedMs: number
}

export interface PreviewEntryMeta {
  /** dev URL의 entry path (예: '/__jogak_preview__/index.html'). adapter별 routing. */
  readonly devEntryPath: string
  /** build 산출물의 entry HTML basename (예: 'index.html'). */
  readonly buildEntryName: string
  /** preview entry 가상 모듈 ID (모든 adapter 공통: 'virtual:jogak/preview-entry'). */
  readonly previewEntryVirtualId: string
}

/**
 * 어댑터에 전달하는 logger 인터페이스. core가 ui/host에 의존하지 않도록 별도 정의.
 * 미지정 시 console fallback.
 */
export interface HostLogger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}
