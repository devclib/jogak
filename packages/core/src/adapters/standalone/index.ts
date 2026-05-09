/**
 * 알파.9: `@jogak/standalone-adapter` — 빌더 미감지 fallback.
 *
 * 사용자가 빌더를 안 쓰거나 jogak이 감지 못한 경우. v1에서는 정적 server 없이
 * 사용자가 명시한 사전 빌드 css만 jogak SPA에 import하는 방식 — `previewIsolation: 'none'`
 * 동등 동작 (jogak SPA가 사용자 컴포넌트를 자체 vite scope에서 동적 import).
 *
 * 한계:
 * - 사용자 utility는 사용자가 사전 빌드한 css에 한정
 * - dev 중 utility 추가 시 사용자 별도 watch 필요
 * - HMR 없음
 *
 * 알파.10에서 정적 server + iframe 격리 통로 추가 검토.
 */

import type { BuilderAdapter, PreviewEntryMeta } from '../../index.js'

const PREVIEW_ENTRY_META: PreviewEntryMeta = {
  devEntryPath: '/preview-frame.html',
  buildEntryName: 'preview-frame.html',
  previewEntryVirtualId: 'virtual:jogak/preview-entry',
}

const standaloneAdapter: BuilderAdapter = {
  name: 'standalone',
  async spawnDev(opts) {
    void opts
    // standalone 모드는 사용자 vite를 spawn하지 않음.
    // jogak SPA가 자체 scope에서 사용자 컴포넌트를 import (알파.7.1 동등 fallback).
    // DevHandle URL을 빈 문자열로 반환하면 ui측 IframeMount가 fallback path 사용.
    throw new Error(
      '[jogak/standalone-adapter] no separate dev server. ' +
        'CLI dispatch should detect this adapter and skip user vite spawn — ' +
        'use fallback (jogak SPA scope) for preview iframe.',
    )
  },
  async build(opts) {
    void opts
    throw new Error(
      '[jogak/standalone-adapter] build is not supported in alpha.9 v1.',
    )
  },
  previewEntryMeta: PREVIEW_ENTRY_META,
}

export default standaloneAdapter
