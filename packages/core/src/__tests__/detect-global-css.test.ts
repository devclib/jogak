import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  detectUserGlobalCss,
  resolveGlobalCssPaths,
} from '../vite-plugin/detect-global-css.js'

/**
 * 알파.6 globalCss opt-in 단위 테스트.
 *
 * spec: `_workspace/01_arch/api-contracts.md` §4.3 — 9 케이스.
 *
 * 정책 요약:
 * - 자동 감지(`true`): 후보 8개를 우선순위 순으로 검사해 첫 발견 1개만 반환
 * - 명시 경로(string/string[]): existsSync 검증 안 함 (Vite가 처리)
 * - false/undefined: 빈 배열
 */

let tmpRoot: string

function touch(rel: string, content = ''): string {
  const abs = resolve(tmpRoot, rel)
  mkdirSync(resolve(abs, '..'), { recursive: true })
  writeFileSync(abs, content, 'utf8')
  return abs
}

beforeEach(() => {
  tmpRoot = mkdtempSync(resolve(tmpdir(), 'jogak-global-css-test-'))
})

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true })
})

describe('detectUserGlobalCss — 자동 감지', () => {
  it('Case 1: 자동 감지 hit — src/index.css 단독 존재 시 절대 경로 반환', () => {
    const abs = touch('src/index.css', '/* user css */')
    expect(detectUserGlobalCss(tmpRoot)).toEqual([abs])
  })

  it('Case 2: 자동 감지 miss — 빈 디렉토리는 빈 배열', () => {
    expect(detectUserGlobalCss(tmpRoot)).toEqual([])
  })

  it('Case 3: 자동 감지 우선순위 — src/index.css가 src/main.css보다 우선', () => {
    const indexCss = touch('src/index.css')
    touch('src/main.css')
    expect(detectUserGlobalCss(tmpRoot)).toEqual([indexCss])
  })

  it('Case 4: shadcn Next 표준 — src/app/globals.css만 있어도 발견', () => {
    const abs = touch('src/app/globals.css')
    expect(detectUserGlobalCss(tmpRoot)).toEqual([abs])
  })
})

describe('resolveGlobalCssPaths — 옵션 정규화', () => {
  it('Case 5: 명시 string — userRoot 기준 절대 경로 1개 (실재 검증 없음)', () => {
    // 일부러 실재하지 않는 파일 — Vite가 처리하므로 plugin은 import만 emit.
    const result = resolveGlobalCssPaths('./src/foo.css', tmpRoot)
    expect(result).toEqual([resolve(tmpRoot, 'src/foo.css')])
  })

  it('Case 6: 명시 string[] — 배열 순서 보존', () => {
    const result = resolveGlobalCssPaths(['a.css', 'b.css'], tmpRoot)
    expect(result).toEqual([
      resolve(tmpRoot, 'a.css'),
      resolve(tmpRoot, 'b.css'),
    ])
  })

  it('Case 7: 빈 string 무시 — [\'\', \'a.css\']는 a.css만', () => {
    const result = resolveGlobalCssPaths(['', 'a.css'], tmpRoot)
    expect(result).toEqual([resolve(tmpRoot, 'a.css')])
  })

  it('Case 8: false / undefined → 빈 배열', () => {
    expect(resolveGlobalCssPaths(false, tmpRoot)).toEqual([])
    expect(resolveGlobalCssPaths(undefined, tmpRoot)).toEqual([])
  })

  it('Case 9: 명시 옵션은 자동 감지 비활성화 — src/index.css가 있어도 string 우선', () => {
    // 자동 감지였다면 src/index.css가 잡혔을 환경에서 명시 string을 사용.
    touch('src/index.css', '/* should be ignored */')
    const result = resolveGlobalCssPaths('./src/foo.css', tmpRoot)
    expect(result).toEqual([resolve(tmpRoot, 'src/foo.css')])
    // src/index.css는 결과에 등장하지 않음
    expect(result).not.toContain(resolve(tmpRoot, 'src/index.css'))
  })
})
