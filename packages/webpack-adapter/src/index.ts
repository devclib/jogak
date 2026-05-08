/**
 * 알파.9: `@jogak/webpack-adapter` — Webpack 5 어댑터.
 *
 * `@jogak/cli`가 사용자 cwd에서 webpack을 감지하면 dynamic import.
 * `.jogak/webpack-preview/preview-entry.tsx`를 scaffold 후 `webpack-dev-server` programmatic API로 시작.
 *
 * 한계:
 * - webpack 5 + 사용자 webpack.config.{ts,js,...} 직접 환경 한정.
 * - CRA(react-scripts 직접): webpack config 노출 안 됨 → CLI가 detect 단계에서 standalone fallback.
 * - craco 사용자: craco.config 자체를 webpack.config로 인식 → 정상 작동.
 */

import type { BuilderAdapter, BuildOptions, BuildResult, PreviewEntryMeta } from '@jogak/core'
import { spawnWebpackDev } from './spawn-dev.js'

const PREVIEW_ENTRY_META: PreviewEntryMeta = {
  devEntryPath: '/__jogak_preview__/index.html',
  buildEntryName: '__jogak_preview__/index.html',
  previewEntryVirtualId: 'virtual:jogak/preview-entry',
}

const webpackAdapter: BuilderAdapter = {
  name: 'webpack',
  spawnDev: spawnWebpackDev,
  async build(opts: BuildOptions): Promise<BuildResult> {
    void opts
    throw new Error(
      '[jogak/webpack-adapter] build is not implemented yet (alpha.9 v1). Use `jogak dev` for now.',
    )
  },
  previewEntryMeta: PREVIEW_ENTRY_META,
}

export default webpackAdapter

export { scaffoldPreviewEntry } from './scaffold.js'
export type { ScaffoldOptions, ScaffoldHandle } from './scaffold.js'
