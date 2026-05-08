import type { JogakPluginOptions } from './types.js'

/**
 * `jogak.config.{ts,mts,mjs,js,json}`의 default export 타입.
 *
 * `JogakPluginOptions`의 모든 필드 + 사용자가 자주 변경하는 dev/build 옵션을
 * 통합한다. 모든 필드 optional — 미지정 시 jogak 기본값 또는 CLI 플래그가 적용.
 *
 * **CLI 플래그 우선순위**: CLI 플래그가 본 config의 값을 override한다 (Vite 패턴).
 * 예: `jogak.config.ts`에 `port: 3000`, CLI에 `--port 4000` → 4000 적용.
 *
 * 미노출 필드(예: `cwd`, `framework`, `disableCacheValidation`, `noGenerate`,
 * `emitRegistry`)는 CLI 플래그 전용 또는 자동 감지로만 처리 — 사용자가 config
 * 파일에서 자주 만지지 않는 옵션이라 표면을 줄였다.
 */
export interface JogakConfig extends JogakPluginOptions {
  // ── Dev server 옵션 ────────────────────────────────────────
  /** dev server 포트. 기본 5173. CLI `--port`로 override. */
  readonly port?: number
  /** dev server bind host. 기본 'localhost'. CLI `--host`로 override. */
  readonly host?: string | boolean
  /** dev 시작 시 브라우저 자동 오픈. 기본 false. CLI `--open`로 override. */
  readonly open?: boolean | string

  // ── Build 옵션 ────────────────────────────────────────────
  /** 정적 빌드 출력 디렉토리. 기본 'jogak-static'. CLI `--out-dir`로 override. */
  readonly outDir?: string
  /** 정적 빌드 base public path. 기본 './'. CLI `--base`로 override. */
  readonly base?: string
  /** 빌드 minify 모드. 기본 'esbuild'. CLI `--minify`로 override. */
  readonly minify?: boolean | 'esbuild' | 'terser'
  /** 빌드 소스맵. 기본 false. CLI `--sourcemap`로 override. */
  readonly sourcemap?: boolean
}

/**
 * `jogak.config.ts`에서 사용자가 호출하는 identity helper.
 *
 * TypeScript 타입 추론을 위해서만 존재 — 런타임에는 입력 그대로 반환.
 *
 * @example
 * import { defineJogakConfig } from '@jogak/core'
 *
 * export default defineJogakConfig({
 *   globalCss: true,
 *   previewIsolation: 'none',
 *   port: 3000,
 * })
 */
export function defineJogakConfig<T extends JogakConfig>(config: T): T {
  return config
}
