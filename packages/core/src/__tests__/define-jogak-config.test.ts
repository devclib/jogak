import { describe, expect, it } from 'vitest'
import { defineJogakConfig, type JogakConfig } from '../config.js'

/**
 * 알파.7: `defineJogakConfig` identity helper 단위 테스트.
 *
 * spec: `_workspace/01_arch/api-contracts.md` §3.2 — identity 함수.
 *
 * 정책: 런타임은 trust. 입력 객체를 그대로 반환하고 TS 타입 추론용으로만 존재.
 */
describe('defineJogakConfig — identity helper', () => {
  it('Case 1: 빈 객체를 그대로 반환', () => {
    const empty = {} as const
    expect(defineJogakConfig(empty)).toBe(empty)
  })

  it('Case 2: plugin + dev 옵션 mix를 그대로 반환', () => {
    const cfg = {
      globalCss: true,
      previewIsolation: 'shadow',
      port: 4000,
      host: 'localhost',
    } as const satisfies JogakConfig
    expect(defineJogakConfig(cfg)).toBe(cfg)
  })

  it('Case 3: previewIsolation literal 타입 보존', () => {
    const cfg = defineJogakConfig({ previewIsolation: 'iframe' })
    expect(cfg.previewIsolation).toBe('iframe')
  })

  it('Case 4: build 옵션도 그대로 통과', () => {
    const cfg: JogakConfig = {
      outDir: 'public/jogak',
      base: '/jogak/',
      minify: 'terser',
      sourcemap: true,
    }
    expect(defineJogakConfig(cfg)).toEqual({
      outDir: 'public/jogak',
      base: '/jogak/',
      minify: 'terser',
      sourcemap: true,
    })
  })

  it('Case 5: globalCss 모든 형태(boolean / string / string[]) 통과', () => {
    expect(defineJogakConfig({ globalCss: false }).globalCss).toBe(false)
    expect(defineJogakConfig({ globalCss: true }).globalCss).toBe(true)
    expect(defineJogakConfig({ globalCss: './src/index.css' }).globalCss).toBe(
      './src/index.css',
    )
    const arr = ['./a.css', './b.css'] as const
    expect(defineJogakConfig({ globalCss: arr }).globalCss).toBe(arr)
  })
})
