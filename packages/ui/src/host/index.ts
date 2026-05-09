/**
 * @jogak/ui/host — Node.js 전용 entry.
 *
 * `@jogak/cli`(또는 사용자가 직접) 이 모듈의 `runHost()`를 호출하여
 * 쇼케이스 SPA를 dev server 또는 정적 빌드 결과물로 실행한다.
 *
 * 주의:
 * - 이 파일은 Node.js 환경에서만 import되어야 한다.
 * - `vite`, `@vitejs/plugin-react`, `@jogak/core/vite-plugin`은 모두 dynamic import로
 *   로드한다 — `@jogak/ui` 메인 entry(브라우저 SPA)에서 우연히 host를 import
 *   하더라도 vite가 브라우저 번들에 포함되지 않게 하기 위함.
 */

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)

/**
 * `@jogak/ui` 패키지의 디렉토리 절대경로.
 *
 * 이 파일의 위치는 monorepo·published 양쪽에서 모두
 * `<pkg>/src/host/index.ts`이므로, 두 단계 위가 패키지 root다.
 * (`packages/ui/src/host/index.ts` → `packages/ui/`)
 */
const UI_PKG_ROOT = resolve(dirname(__filename), '..', '..')

/** UI SPA의 entry HTML 절대경로. Vite의 `root`로 사용된다. */
export const UI_HTML_ENTRY: string = resolve(UI_PKG_ROOT, 'index.html')

/** UI SPA의 entry main.tsx 절대경로 (참고용). */
export const UI_MAIN_ENTRY: string = resolve(UI_PKG_ROOT, 'src/app/main.tsx')

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface HostLogger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
}

/**
 * dev/build 양쪽이 공유하는 사용자 입력.
 */
export interface JogakHostOptionsBase {
  /** 사용자 프로젝트 루트 (절대경로). */
  readonly userRoot: string
  /** 쇼케이스 파일 패턴. cwd는 `userRoot` 기준. */
  readonly patterns: readonly string[]
  /** ts-morph용 tsconfig 절대 경로. 미지정 시 jogak plugin이 자동 감지. */
  readonly tsConfigFilePath?: string
  /** prism-react-renderer 테마. 기본 'vsDark'. */
  readonly codeTheme?: string
  /**
   * 호스트가 추가로 적용할 Vite 사용자 플러그인.
   * Phase 2에서 jogak.config.ts에 plugins 옵션을 노출할 때 사용.
   */
  readonly extraPlugins?: readonly unknown[]
  /** stdout/stderr 출력 stream (테스트 시 주입). */
  readonly logger?: HostLogger
  /**
   * 알파.7: 사용자 globalCss를 jogak SPA에 import한다 (algfa.6 옵션의 host 통로).
   *
   * `false`/`undefined` (default): 미주입.
   * `true`: `<userRoot>/src/{...}.css` 자동 감지 후 첫 발견 1개 import.
   * `string` / `readonly string[]`: 명시 경로.
   *
   * 본 옵션은 jogak() Vite plugin의 `globalCss` 옵션으로 그대로 전달된다.
   */
  readonly globalCss?: boolean | string | readonly string[]
  /**
   * 알파.8: Preview 영역 격리 모드.
   *
   * `'iframe'` (default, 알파.8), `'shadow'` (deprecated), `'none'` (deprecated) 중 하나.
   * jogak() Vite plugin의 `previewIsolation` 옵션으로 그대로 전달된다.
   *
   * 자세한 모드 설명은 `JogakPluginOptions.previewIsolation` JSDoc 참조.
   */
  readonly previewIsolation?: 'none' | 'shadow' | 'iframe'
  /**
   * 알파.9: 어댑터 dev URL (예: `http://localhost:5174`).
   * jogak SPA가 iframe `src` base로 사용한다.
   *
   * 미지정/빈 문자열 시 fallback (jogak SPA Vite scope의 preview-frame.tsx).
   *
   * jogak CLI의 어댑터 dispatch 결과 자동 전달 — 사용자가 직접 설정하지 않는다.
   */
  readonly userPreviewUrl?: string
  /**
   * 알파.9: iframe entry path (예: `/__jogak_preview__/index.html`).
   * `BuilderAdapter.previewEntryMeta.devEntryPath` 값. CLI 자동 전달.
   */
  readonly previewEntryPath?: string
  /**
   * @deprecated 알파.10 제거 예정. `userPreviewUrl` 사용.
   */
  readonly userViteUrl?: string
}

export interface JogakDevOptions extends JogakHostOptionsBase {
  readonly mode: 'dev'
  readonly port?: number
  readonly host?: string | boolean
  readonly open?: boolean | string
}

export interface JogakBuildOptions extends JogakHostOptionsBase {
  readonly mode: 'build'
  /** 절대경로. */
  readonly outDir: string
  readonly base?: string
  readonly minify?: boolean | 'esbuild' | 'terser'
  readonly sourcemap?: boolean
}

export type JogakHostOptions = JogakDevOptions | JogakBuildOptions

export interface DevHandle {
  /** ex) 'http://localhost:5173/' */
  readonly url: string
  readonly port: number
  /** 멱등 보장 — 여러 번 호출되어도 안전. */
  close(): Promise<void>
  printUrls(): void
}

export interface BuildResult {
  readonly outDir: string
  readonly elapsedMs: number
  readonly assetCount: number
  readonly totalBytes: number
}

// ---------------------------------------------------------------------------
// runHost
// ---------------------------------------------------------------------------

export function runHost(opts: JogakDevOptions): Promise<DevHandle>
export function runHost(opts: JogakBuildOptions): Promise<BuildResult>
export function runHost(opts: JogakHostOptions): Promise<DevHandle | BuildResult>
export async function runHost(
  opts: JogakHostOptions,
): Promise<DevHandle | BuildResult> {
  // Dynamic import — host를 브라우저가 import해도 vite가 번들에 포함되지 않게.
  const vite = await import('vite')
  const reactPluginMod = await import('@vitejs/plugin-react')
  const coreViteMod = await import('@jogak/core/vite-plugin')
  const tailwindMod = await import('@tailwindcss/vite')

  const { createServer, build: viteBuild } = vite
  const reactPlugin = reactPluginMod.default
  const tailwindPlugin = tailwindMod.default
  const { jogak } = coreViteMod

  const codeTheme = opts.codeTheme ?? 'vsDark'

  // jogak plugin 옵션. exactOptionalPropertyTypes 호환을 위해
  // 선택적 필드는 정의된 경우에만 추가한다.
  const jogakOptions: {
    patterns: readonly string[]
    codeTheme: string
    cwd: string
    tsConfigFilePath?: string
    globalCss?: boolean | string | readonly string[]
    previewIsolation?: 'none' | 'shadow' | 'iframe'
    userPreviewUrl?: string
    previewEntryPath?: string
    userViteUrl?: string
  } = {
    patterns: opts.patterns,
    codeTheme,
    cwd: opts.userRoot,
  }
  if (opts.tsConfigFilePath !== undefined) {
    jogakOptions.tsConfigFilePath = opts.tsConfigFilePath
  }
  // ── 알파.7 ──────────────────────────────────────────
  if (opts.globalCss !== undefined) {
    jogakOptions.globalCss = opts.globalCss
  }
  if (opts.previewIsolation !== undefined) {
    jogakOptions.previewIsolation = opts.previewIsolation
  }
  // ── 알파.9 ──────────────────────────────────────────
  if (opts.userPreviewUrl !== undefined) {
    jogakOptions.userPreviewUrl = opts.userPreviewUrl
  }
  if (opts.previewEntryPath !== undefined) {
    jogakOptions.previewEntryPath = opts.previewEntryPath
  }
  // ── 알파.8 alias (deprecated) ───────────────────────
  if (opts.userViteUrl !== undefined && opts.userPreviewUrl === undefined) {
    jogakOptions.userViteUrl = opts.userViteUrl
  }

  const extraPlugins = (opts.extraPlugins ?? []) as ReadonlyArray<
    import('vite').PluginOption
  >

  const baseConfig: import('vite').InlineConfig = {
    root: UI_PKG_ROOT,
    configFile: false, // ui/vite.config.ts 무시
    plugins: [reactPlugin(), tailwindPlugin(), jogak(jogakOptions), ...extraPlugins],
    optimizeDeps: {
      include: ['react', 'react-dom/client', '@jogak/core', '@jogak/core/renderers/react'],
    },
  }

  if (opts.mode === 'dev') {
    const serverConfig: import('vite').InlineConfig['server'] = {
      port: opts.port ?? 5173,
      host: opts.host ?? 'localhost',
      open: opts.open ?? false,
      fs: { allow: [UI_PKG_ROOT, opts.userRoot] },
    }

    const devConfig: import('vite').InlineConfig = {
      ...baseConfig,
      server: serverConfig,
    }

    const server = await createServer(devConfig)
    await server.listen()

    const resolvedPort = server.config.server.port ?? opts.port ?? 5173
    const resolvedHostRaw = opts.host ?? 'localhost'
    const resolvedHost =
      typeof resolvedHostRaw === 'boolean'
        ? resolvedHostRaw
          ? '0.0.0.0'
          : 'localhost'
        : resolvedHostRaw

    const url = `http://${resolvedHost}:${resolvedPort.toString()}/`

    let closed = false
    const close = async (): Promise<void> => {
      if (closed) return
      closed = true
      await server.close()
    }

    return {
      url,
      port: resolvedPort,
      close,
      printUrls: () => {
        server.printUrls()
      },
    }
  }

  // build mode
  // 알파.7: previewIsolation='iframe' 모드를 위해 preview-frame.html을 별도 entry로 emit.
  // 'none'/'shadow' 모드에서도 이 chunk는 unused이지만, build 시점에 isolation 모드를
  // 알 수 없는 경우(또는 모드 변경 시 재빌드 회피)를 위해 항상 포함한다.
  const buildConfig: import('vite').InlineConfig = {
    ...baseConfig,
    base: opts.base ?? './',
    build: {
      outDir: opts.outDir,
      emptyOutDir: true,
      sourcemap: opts.sourcemap ?? false,
      minify: opts.minify ?? 'esbuild',
      rollupOptions: {
        input: {
          main: resolve(UI_PKG_ROOT, 'index.html'),
          preview: resolve(UI_PKG_ROOT, 'preview-frame.html'),
        },
      },
    },
  }

  const start = Date.now()
  const buildOutput = await viteBuild(buildConfig)
  const elapsedMs = Date.now() - start

  // RollupOutput 통계 계산.
  // viteBuild는 RollupOutput | RollupOutput[] | RollupWatcher 중 하나를 반환.
  // watch 모드는 사용하지 않으므로 RollupWatcher는 무시.
  const { assetCount, totalBytes } = collectBuildStats(buildOutput)

  return {
    outDir: opts.outDir,
    elapsedMs,
    assetCount,
    totalBytes,
  }
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

interface BuildStats {
  readonly assetCount: number
  readonly totalBytes: number
}

/**
 * Vite `build()`가 반환하는 값에서 자산 개수·총 바이트를 계산.
 *
 * - 단일 RollupOutput: `output[]` 그대로 집계.
 * - RollupOutput[] (multi-input 등): 모두 평탄화하여 집계.
 * - RollupWatcher (watch 모드): 통계 산출 불가 → 0/0.
 */
function collectBuildStats(value: unknown): BuildStats {
  const outputs = normalizeRollupOutputs(value)
  if (outputs === undefined) {
    return { assetCount: 0, totalBytes: 0 }
  }

  let count = 0
  let bytes = 0
  for (const item of outputs) {
    count += 1
    bytes += sizeOfOutputItem(item)
  }
  return { assetCount: count, totalBytes: bytes }
}

interface RollupOutputLike {
  readonly output: ReadonlyArray<unknown>
}

function isRollupOutputLike(value: unknown): value is RollupOutputLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { output?: unknown }).output)
  )
}

/**
 * `viteBuild` 반환값을 `output` 항목들의 평탄화된 배열로 정규화.
 * watch 모드(RollupWatcher)면 undefined 반환.
 */
function normalizeRollupOutputs(value: unknown): ReadonlyArray<unknown> | undefined {
  if (Array.isArray(value)) {
    const merged: unknown[] = []
    for (const entry of value) {
      if (isRollupOutputLike(entry)) {
        merged.push(...entry.output)
      }
    }
    return merged
  }
  if (isRollupOutputLike(value)) {
    return value.output
  }
  return undefined
}

/**
 * RollupOutput의 개별 항목(chunk 또는 asset)에서 바이트 크기를 산출.
 * - chunk: `code` 문자열 길이를 byte length로 환산.
 * - asset: `source`가 string이면 byte length, Uint8Array면 byteLength.
 */
function sizeOfOutputItem(item: unknown): number {
  if (typeof item !== 'object' || item === null) return 0
  const obj = item as { type?: unknown; code?: unknown; source?: unknown }

  if (obj.type === 'chunk' && typeof obj.code === 'string') {
    return Buffer.byteLength(obj.code, 'utf8')
  }
  if (obj.type === 'asset') {
    const source = obj.source
    if (typeof source === 'string') return Buffer.byteLength(source, 'utf8')
    if (source instanceof Uint8Array) return source.byteLength
  }
  return 0
}
