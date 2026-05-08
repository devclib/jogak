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

/**
 * iframe (preview entry) → 부모(jogak SPA).
 */
export type JogakMessageFromFrame =
  | { readonly type: 'jogak:ready' }
  | { readonly type: 'jogak:rendered'; readonly entryId: string }
  | { readonly type: 'jogak:error'; readonly message: string }
