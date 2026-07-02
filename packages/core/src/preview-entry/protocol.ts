/**
 * 알파.9: jogak chrome ↔ preview iframe 간 postMessage 통신 프로토콜.
 *
 * 모든 어댑터(vite/next/webpack/standalone)가 동일 프로토콜 사용. iframe 안 entry source는
 * cross-origin 환경에서도 작동하도록 `targetOrigin: '*'`. preview는 사용자 본인 컴포넌트만
 * mount하는 신뢰 환경이므로 origin 검증은 README 명시 후 생략.
 */

/**
 * 부모(jogak SPA) → iframe (preview entry).
 */
export type JogakMessageToFrame =
  | {
      readonly type: 'jogak:setProps'
      readonly entryId: string
      readonly args: Readonly<Record<string, unknown>>
    }
  | { readonly type: 'jogak:unmount' }
  | {
      /**
       * 1.0.0 post-1.0: Themes addon. chrome 툴바에서 theme 변경 시 iframe에 전송.
       * iframe scope handler가 `document.documentElement.setAttribute('data-theme', theme)`
       * 실행. Storybook `addon-themes` 대응.
       */
      readonly type: 'jogak:setTheme'
      readonly theme: string
    }
  | { readonly type: 'jogak:runA11y' }
  | {
      /**
       * 1.0.0 post-1.0: MDX docs addon. Preview docs tab 선택 시 iframe에 전송.
       * iframe scope handler가 사용자 vite로 `docsPath`를 dynamic import → React 컴포넌트로
       * 렌더. MDX 컴파일러(@mdx-js/rollup 등)는 사용자 vite scope에서 사전 설치.
       *
       * `docsPath`: 사용자 프로젝트 root 기준 상대 경로.
       */
      readonly type: 'jogak:renderDocs'
      readonly docsPath: string
    }
  | { readonly type: 'jogak:renderComponent' }

/**
 * 1.0.0-beta.3: A11y (axe-core) violation. iframe scope에서 실행 후 부모에 전송.
 * axe-core의 Result 타입 대신 필요한 필드만 최소로 정의 — chrome scope가 axe-core를
 * dep로 갖지 않기 위해.
 */
export interface JogakA11yViolationNode {
  readonly target: readonly string[]
  readonly html: string
  readonly failureSummary: string
}

export interface JogakA11yViolation {
  readonly id: string
  readonly impact: 'minor' | 'moderate' | 'serious' | 'critical' | null
  readonly description: string
  readonly help: string
  readonly helpUrl: string
  readonly nodes: readonly JogakA11yViolationNode[]
}

/**
 * iframe (preview entry) → 부모(jogak SPA).
 */
export type JogakMessageFromFrame =
  | { readonly type: 'jogak:ready' }
  | { readonly type: 'jogak:rendered'; readonly entryId: string }
  | { readonly type: 'jogak:error'; readonly message: string }
  | { readonly type: 'jogak:height'; readonly height: number }
  | {
      readonly type: 'jogak:a11y'
      readonly violations: readonly JogakA11yViolation[]
      /** axe-core 미설치 시 true — chrome UI가 install 안내 표시 */
      readonly notInstalled?: boolean
    }
