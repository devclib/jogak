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
   * 알파.8: 사용자 vite spawn URL. iframe `src` base로 사용 (예: `http://localhost:5174`).
   * 빈 문자열 시 fallback (jogak SPA Vite scope의 preview-frame.tsx).
   */
  export const _jogakUserViteUrl: string
}

declare module 'virtual:jogak/global-css' {
  // empty — side-effect only
}
