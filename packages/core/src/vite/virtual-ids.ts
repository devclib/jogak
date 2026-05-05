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

export function idToSlug(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url')
}

export function slugToId(slug: string): string {
  return Buffer.from(slug, 'base64url').toString('utf8')
}
