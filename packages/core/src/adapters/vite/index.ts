/**
 * 알파.9: `@jogak/vite-adapter` — Vite 빌더 어댑터.
 *
 * `@jogak/cli`가 사용자 cwd에서 vite를 감지하면 본 패키지를 dynamic import.
 * 사용자 vite.config.ts를 자동 탐지 → jogak plugins inject → 별도 vite dev server 시작.
 *
 * @example jogak.config.ts
 * import { defineJogakConfig } from '../../index.js'
 *
 * export default defineJogakConfig({
 *   globalCss: true,
 *   builder: 'vite',  // 또는 자동 감지 (vite.config.ts 존재 시)
 * })
 */

import type { BuilderAdapter, PreviewEntryMeta } from '../../index.js'
import { spawnViteDev } from './spawn-dev.js'
import { buildVite } from './build.js'

const PREVIEW_ENTRY_META: PreviewEntryMeta = {
  devEntryPath: '/__jogak_preview__/index.html',
  buildEntryName: 'index.html',
  previewEntryVirtualId: 'virtual:jogak/preview-entry',
}

const viteAdapter: BuilderAdapter = {
  name: 'vite',
  spawnDev: spawnViteDev,
  build: buildVite,
  previewEntryMeta: PREVIEW_ENTRY_META,
}

export default viteAdapter

export { jogakPreviewFramePlugin } from './preview-frame-plugin.js'
export type { JogakPreviewFramePluginOptions } from './preview-frame-plugin.js'
