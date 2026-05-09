/**
 * 알파.9: vite-adapter의 build 구현 (stub).
 *
 * 알파.9 v1에서는 build 통합 미구현. 사용자 vite build를 별도 호출하여 산출물을
 * jogak SPA outDir의 preview/로 복사하는 작업은 알파.10에서 우선순위 처리.
 */

import type { BuildOptions, BuildResult } from '../../index.js'

export async function buildVite(opts: BuildOptions): Promise<BuildResult> {
  // 알파.9 v1: build 미구현. 빈 stub 반환 — jogak CLI build 명령은 알파.10에서.
  void opts
  throw new Error(
    '[jogak/vite-adapter] build is not implemented yet (alpha.9 v1). Use `jogak dev` for now.',
  )
}
