/**
 * 알파.9: server-only 유틸리티 (Node.js only).
 *
 * 본 subpath의 함수들은 `node:fs`/`node:path`를 사용하므로 브라우저 client 번들에
 * 포함되어서는 안 된다. CLI / 어댑터 / Vite plugin 등 Node 환경에서만 import.
 *
 * 사용처:
 * - `@jogak/cli`: detectBuilder
 * - `@jogak/vite-adapter` / `@jogak/next-adapter` / `@jogak/webpack-adapter`: resolveGlobalCssPaths
 */

export {
  detectBuilder,
  type DetectBuilderResult,
} from './builder-detect.js'

export {
  detectUserGlobalCss,
  resolveGlobalCssPaths,
} from './vite-plugin/detect-global-css.js'
