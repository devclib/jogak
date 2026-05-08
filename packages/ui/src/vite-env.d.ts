/// <reference types="vite/client" />

declare module 'virtual:jogak' {
  /** 플러그인 설정에서 지정한 prism-react-renderer 테마 이름 */
  export const _jogakCodeTheme: string
  /**
   * 알파.7: Preview 영역 격리 모드 ('none' | 'shadow' | 'iframe').
   * `JogakPluginOptions.previewIsolation` (default 'none')의 literal emit.
   */
  export const _jogakPreviewIsolation: 'none' | 'shadow' | 'iframe'
}

declare module 'virtual:jogak/global-css' {
  // empty — side-effect only
}
