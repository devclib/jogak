import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadJogakConfig } from '../config-loader.js'

/**
 * 알파.7: `loadJogakConfig` 단위 테스트.
 *
 * spec: `_workspace/01_arch/api-contracts.md` §4.3 — 9 케이스.
 *
 * 정책 요약:
 * - 우선순위: explicitPath > .ts > .mts > .mjs > .js > .json
 * - 미발견 → `{ path: undefined, config: {} }`
 * - explicitPath 미존재 → throw
 * - default export non-object → throw
 */

let tmpRoot: string

function touch(rel: string, content: string): string {
  const abs = resolve(tmpRoot, rel)
  mkdirSync(resolve(abs, '..'), { recursive: true })
  writeFileSync(abs, content, 'utf8')
  return abs
}

beforeEach(() => {
  tmpRoot = mkdtempSync(resolve(tmpdir(), 'jogak-config-test-'))
})

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true })
})

describe('loadJogakConfig — 자동 발견', () => {
  it('Case 1: 빈 디렉토리 → { path: undefined, config: {} }', async () => {
    const result = await loadJogakConfig(tmpRoot, undefined)
    expect(result.path).toBeUndefined()
    expect(result.config).toEqual({})
  })

  it('Case 2: jogak.config.ts 1개 → 정상 로드', async () => {
    const abs = touch(
      'jogak.config.ts',
      `export default { globalCss: true, port: 4000 }`,
    )
    const result = await loadJogakConfig(tmpRoot, undefined)
    expect(result.path).toBe(abs)
    expect(result.config.globalCss).toBe(true)
    expect(result.config.port).toBe(4000)
  })

  it('Case 3: ts와 js 둘 다 → ts가 우선', async () => {
    const tsAbs = touch(
      'jogak.config.ts',
      `export default { globalCss: 'ts.css' }`,
    )
    touch(
      'jogak.config.js',
      `export default { globalCss: 'js.css' }`,
    )
    const result = await loadJogakConfig(tmpRoot, undefined)
    expect(result.path).toBe(tsAbs)
    expect(result.config.globalCss).toBe('ts.css')
  })

  it('Case 4: jogak.config.json도 정상 로드', async () => {
    const abs = touch(
      'jogak.config.json',
      JSON.stringify({ codeTheme: 'github', port: 9000 }),
    )
    const result = await loadJogakConfig(tmpRoot, undefined)
    expect(result.path).toBe(abs)
    expect(result.config.codeTheme).toBe('github')
    expect(result.config.port).toBe(9000)
  })
})

describe('loadJogakConfig — explicit path', () => {
  it('Case 5: --config 명시 + 미존재 → throw', async () => {
    await expect(
      loadJogakConfig(tmpRoot, './does-not-exist.ts'),
    ).rejects.toThrow(/--config path not found/)
  })

  it('Case 6: --config 명시 + 다른 디렉토리 절대 경로', async () => {
    // 다른 tmp 디렉토리에 config 작성, cwd는 빈 곳.
    const otherTmp = mkdtempSync(resolve(tmpdir(), 'jogak-config-other-'))
    try {
      const abs = resolve(otherTmp, 'custom.config.ts')
      writeFileSync(abs, `export default { previewIsolation: 'shadow' }`, 'utf8')
      const result = await loadJogakConfig(tmpRoot, abs)
      expect(result.path).toBe(abs)
      expect(result.config.previewIsolation).toBe('shadow')
    } finally {
      rmSync(otherTmp, { recursive: true, force: true })
    }
  })
})

describe('loadJogakConfig — 에러 처리', () => {
  it('Case 7: config 파일 syntax error → throw', async () => {
    touch('jogak.config.ts', `export default { not-json `)
    await expect(loadJogakConfig(tmpRoot, undefined)).rejects.toThrow()
  })

  it('Case 8: default export가 object가 아니면 throw', async () => {
    touch('jogak.config.ts', `export default 42`)
    // vite가 1차로 "config must export or return an object" 메시지로 throw하면
    // loader가 [jogak] prefix로 감싸 다시 throw. JSON path만 직접 처리.
    await expect(loadJogakConfig(tmpRoot, undefined)).rejects.toThrow(
      /\[jogak\]/,
    )
  })

  it('Case 9: defineJogakConfig wrap 정상 로드 (identity)', async () => {
    // config 파일이 dynamic import로 @jogak/core를 import해도 동작하도록 검증.
    // tmp 디렉토리에서 @jogak/core 해석이 어렵다 — 그래서 inline identity로 시뮬:
    // user 입장에서 defineJogakConfig는 identity라 결과는 동일.
    const abs = touch(
      'jogak.config.ts',
      `const defineJogakConfig = (c) => c
export default defineJogakConfig({ globalCss: true, previewIsolation: 'iframe' })`,
    )
    const result = await loadJogakConfig(tmpRoot, undefined)
    expect(result.path).toBe(abs)
    expect(result.config.globalCss).toBe(true)
    expect(result.config.previewIsolation).toBe('iframe')
  })
})
