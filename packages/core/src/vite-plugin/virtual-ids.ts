/**
 * 가상모듈 식별자 — 단일 정의 소스.
 *
 * - 인덱스 모듈(`virtual:jogak`): 모든 entry의 meta. user 모듈 import 0개.
 * - Entry 모듈(`virtual:jogak/entry/<slug>`): 단 하나의 user jogak 파일을 import해
 *   `defaultRegistry.hydrateEntry`로 register하는 side-effect 모듈.
 *
 * id ↔ slug 변환:
 * - 사용자 title이 `Form/Button` 같은 슬래시를 포함하므로 URL/모듈 경로에 직접 못 씀.
 * - base64url은 모듈 식별자에 안전 (영숫자 + `-_`).
 */

/** 인덱스 모듈 — 모든 entry의 meta. */
export const VIRTUAL_INDEX_ID = 'virtual:jogak'
export const RESOLVED_VIRTUAL_INDEX_ID = '\0' + VIRTUAL_INDEX_ID

/** Entry 모듈 prefix — 뒤에 base64url(id)이 붙는다. */
export const VIRTUAL_ENTRY_PREFIX = 'virtual:jogak/entry/'
export const RESOLVED_VIRTUAL_ENTRY_PREFIX = '\0' + VIRTUAL_ENTRY_PREFIX

/** Global css 모듈 — 사용자 globalCss를 import한다 (알파.6, opt-in). */
export const VIRTUAL_GLOBAL_CSS_ID = 'virtual:jogak/global-css'
export const RESOLVED_VIRTUAL_GLOBAL_CSS_ID = '\0' + VIRTUAL_GLOBAL_CSS_ID

/**
 * Preview frame entry (알파.8) — 사용자 vite scope의 iframe entry.
 * jogakPreviewFramePlugin이 emit. 사용자 vite의 module graph에 포함되어
 * 사용자 plugins(@tailwindcss/vite 등)가 정상 처리.
 */
export const VIRTUAL_PREVIEW_ENTRY_ID = 'virtual:jogak/preview-entry'
export const RESOLVED_VIRTUAL_PREVIEW_ENTRY_ID = '\0' + VIRTUAL_PREVIEW_ENTRY_ID

/**
 * Preview-scope의 사용자 globalCss (알파.8) — 알파.6의 `virtual:jogak/global-css`는
 * jogak SPA scope. 본 모듈은 사용자 vite scope의 preview-frame entry용.
 * jogakPreviewFramePlugin이 emit.
 */
export const VIRTUAL_PREVIEW_GLOBAL_CSS_ID = 'virtual:jogak/preview-global-css'
export const RESOLVED_VIRTUAL_PREVIEW_GLOBAL_CSS_ID = '\0' + VIRTUAL_PREVIEW_GLOBAL_CSS_ID

export function idToSlug(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url')
}

export function slugToId(slug: string): string {
  return Buffer.from(slug, 'base64url').toString('utf8')
}
