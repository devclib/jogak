/**
 * 알파.9: `@jogak/next-adapter` — Next.js 14+ App Router 어댑터.
 *
 * `@jogak/cli`가 사용자 cwd에서 Next.js를 감지하면 본 패키지를 dynamic import.
 * `<userRoot>/app/jogak-preview/page.tsx`를 scaffold 후 `next dev` child process spawn.
 *
 * 라우트 명명 주의: leading underscore (`_folder`)는 Next App Router의 private folder
 * convention이라 라우팅에서 제외됨. 따라서 `__jogak_preview__`가 아닌 `jogak-preview` 사용.
 *
 * 한계:
 * - App Router 14+ 우선. Pages Router는 알파.10 검토.
 * - Next.js 자체가 `app/` 또는 `src/app/` 디렉토리 필요. 미존재 시 scaffold 실패.
 * - RSC 사용자 컴포넌트는 page.tsx의 'use client'에서 import — `dynamic({ ssr: false })` 권장.
 */

import type { BuilderAdapter, BuildOptions, BuildResult, PreviewEntryMeta } from '../../index.js'
import { spawnNextDev } from './spawn-dev.js'

const PREVIEW_ENTRY_META: PreviewEntryMeta = {
  devEntryPath: '/jogak-preview',
  buildEntryName: 'jogak-preview/index.html',
  previewEntryVirtualId: 'virtual:jogak/preview-entry',
}

const nextAdapter: BuilderAdapter = {
  name: 'next',
  spawnDev: spawnNextDev,
  async build(opts: BuildOptions): Promise<BuildResult> {
    void opts
    throw new Error(
      '[jogak/next-adapter] build is not implemented yet (alpha.9 v1). Use `jogak dev` for now.',
    )
  },
  previewEntryMeta: PREVIEW_ENTRY_META,
}

export default nextAdapter

export { scaffoldPreviewPage } from './scaffold.js'
export type { ScaffoldOptions, ScaffoldHandle } from './scaffold.js'
