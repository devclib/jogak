/// <reference types="vite/client" />

declare module 'virtual:jogak' {
  /** 플러그인 설정에서 지정한 prism-react-renderer 테마 이름 */
  export const _jogakCodeTheme: string
  /**
   * 알파.8: Preview 영역 격리 모드 ('none' | 'shadow' | 'iframe').
   * `JogakPluginOptions.previewIsolation` (default 'iframe')의 literal emit.
   */
  export const _jogakPreviewIsolation: 'none' | 'shadow' | 'iframe'
  /**
   * 알파.9: 어댑터 dev URL. iframe `src` base로 사용 (예: `http://localhost:5174`).
   * 빈 문자열 시 fallback (jogak SPA Vite scope의 preview-frame.tsx).
   */
  export const _jogakUserPreviewUrl: string
  /**
   * 알파.9: iframe entry path (`BuilderAdapter.previewEntryMeta.devEntryPath`).
   * 어댑터별 routing (vite: `/__jogak_preview__/index.html`).
   */
  export const _jogakPreviewEntryPath: string
  /**
   * @deprecated 알파.10 제거 예정. `_jogakUserPreviewUrl` 사용.
   * 알파.8 호환 alias.
   */
  export const _jogakUserViteUrl: string
}

declare module 'virtual:jogak/global-css' {
  // empty — side-effect only
}
