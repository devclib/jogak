/**
 * 사용자 globalCss 자동 감지 + 옵션 정규화 (알파.6, opt-in).
 *
 * 본 모듈은 `JogakPluginOptions.globalCss` 옵션 값을 절대 경로 배열로 변환한다.
 * 자동 감지(`true`)는 첫 발견 1개만 반환 — 다중 import는 명시 배열로 사용자가 선언.
 *
 * 자동 감지 후보(우선순위 순)는 spec `_workspace/01_arch/api-contracts.md` §4.1을 따른다.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 자동 감지 후보(우선순위 순). 변경 시 README/JSDoc 동시 갱신.
 *
 * - shadcn/ui 공식 가이드(Vite + Next.js) 표준 경로 우선
 * - 일반적 명명(index/main) → 카테고리별 명명(styles/globals/global/app) 순
 * - src 직속 → 하위 디렉토리(styles/, app/) 순
 *
 * 비-`src/` 경로는 의도적으로 제외 (monorepo에서 다른 패키지 css 혼동 회피).
 */
const GLOBAL_CSS_CANDIDATES: readonly string[] = [
  'src/index.css',
  'src/main.css',
  'src/styles.css',
  'src/styles/globals.css',
  'src/styles/index.css',
  'src/app/globals.css',
  'src/global.css',
  'src/app.css',
]

/**
 * 사용자 globalCss 자동 감지.
 *
 * `<userRoot>/src/...` 후보를 우선순위 순으로 검사해 **첫 발견 1개**만 반환.
 * 미발견 시 빈 배열.
 *
 * 첫 발견 stop 정책:
 * - 사용자가 다중 import를 원하면 명시 배열(`globalCss: ['...', '...']`)을 쓰게 한다.
 * - 자동 감지에서 모든 후보를 import하면 의도치 않은 css 중복(예: index.css와
 *   styles.css 둘 다 존재 시)이 발생할 수 있다.
 */
export function detectUserGlobalCss(userRoot: string): readonly string[] {
  for (const rel of GLOBAL_CSS_CANDIDATES) {
    const abs = resolve(userRoot, rel)
    if (existsSync(abs)) return [abs]
  }
  return []
}

/**
 * 옵션 값 → 절대 경로 배열로 정규화.
 *
 * - `false`/`undefined`: `[]`
 * - `true`: `detectUserGlobalCss(userRoot)`
 * - `string`: `[resolve(userRoot, string)]`. 빈 문자열은 `[]`.
 * - `string[]`: 각 요소 resolve, 빈 요소 무시 (배열 순서 보존)
 *
 * `existsSync` 검증은 명시 경로(string/string[])에서는 하지 않는다 — 사용자가
 * 의도적으로 빈 파일 또는 동적 css generator를 쓸 수 있고, 미존재 시 Vite가
 * 자체 에러로 알려주는 게 더 명확하다 (silent skip은 디버깅 어려움).
 */
export function resolveGlobalCssPaths(
  option: boolean | string | readonly string[] | undefined,
  userRoot: string,
): readonly string[] {
  if (option === undefined || option === false) return []
  if (option === true) return detectUserGlobalCss(userRoot)
  if (typeof option === 'string') {
    return option.length > 0 ? [resolve(userRoot, option)] : []
  }
  // readonly string[]
  const result: string[] = []
  for (const p of option) {
    if (typeof p === 'string' && p.length > 0) {
      result.push(resolve(userRoot, p))
    }
  }
  return result
}
