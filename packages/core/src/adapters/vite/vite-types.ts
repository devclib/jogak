/**
 * 알파.11: vite types를 dynamic import 결과 typing 위해 re-declare.
 *
 * `vite`가 optional peer라 직접 type import가 fragile. 최소한의 shape만 직접 정의해
 * vite 미설치 환경에서도 type-check 통과.
 */

export type Plugin = {
  readonly name: string
  readonly [key: string]: unknown
}

export interface RollupOutput {
  readonly output: ReadonlyArray<
    | { readonly type: 'asset'; readonly source: string | Uint8Array; readonly fileName: string }
    | { readonly type: 'chunk'; readonly code: string; readonly fileName: string }
  >
}

export interface RollupWatcher {
  close(): Promise<void>
}
