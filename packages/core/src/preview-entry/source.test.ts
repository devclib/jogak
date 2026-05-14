import { describe, expect, it } from 'vitest'
import { renderPreviewEntrySource } from './source.js'

describe('renderPreviewEntrySource — TEMPLATE 회귀 보호', () => {
  it('extraImports가 emit 라인에 직렬화된다', () => {
    const out = renderPreviewEntrySource({
      extraImports: ['virtual:jogak/preview-global-css', '/abs/path/src/index.css'],
    })
    expect(out).toContain('import "virtual:jogak/preview-global-css"')
    expect(out).toContain('import "/abs/path/src/index.css"')
  })

  it('extraImports 미지정 시에도 정상 렌더', () => {
    const out = renderPreviewEntrySource()
    expect(out).toContain('defaultRegistry')
    expect(out).not.toContain('__EXTRA_IMPORTS__')
  })

  it('5개 framework 모두 dispatch 케이스를 emit', () => {
    const out = renderPreviewEntrySource()
    expect(out).toMatch(/case 'vue'/u)
    expect(out).toMatch(/case 'svelte'/u)
    expect(out).toMatch(/case 'web-components'/u)
    expect(out).toMatch(/case 'next'/u)
    expect(out).toMatch(/case 'react'/u)
  })

  it('web-components 어댑터 호출이 정확한 signature를 사용한다', () => {
    // defineJogakElement(tagName: string, entry: RegistryEntry): void
    // 회귀 가드: 알파.14.1에서 (component, entryId) 잘못된 순서로 호출했던 결함 재발 방지.
    const out = renderPreviewEntrySource()

    // ✅ 정상: defineJogakElement(tagName, entry) — tagName이 string 변수
    expect(out).toMatch(/m\.defineJogakElement\(tagName,\s*entry\)/u)

    // ❌ 금지: entry.meta.component를 첫 인자로 넘기는 패턴 (void return 사용도 차단)
    expect(out).not.toMatch(/defineJogakElement\(entry\.meta\.component/u)
    expect(out).not.toMatch(/=\s*m?\.?defineJogakElement\(/u)
  })

  it('web-components 어댑터가 tagName 생성 헬퍼를 인라인 정의', () => {
    const out = renderPreviewEntrySource()
    expect(out).toContain('entryToTagName')
    // jogak-{safe} prefix 패턴 — entryId 기반 deterministic tagName.
    expect(out).toMatch(/'jogak-'/u)
  })

  it('postMessage 프로토콜 전부 emit', () => {
    const out = renderPreviewEntrySource()
    expect(out).toContain("type: 'jogak:ready'")
    expect(out).toContain("type: 'jogak:rendered'")
    expect(out).toContain("type: 'jogak:error'")
    expect(out).toContain("'jogak:setProps'")
    expect(out).toContain("'jogak:unmount'")
  })
})
