/**
 * 알파.14.1: Svelte 5 (`.svelte`) props 추출 단위 테스트.
 *
 * `let { ... }: TypeRef = $props()` 패턴을 ts-morph로 분석.
 * compiler 의존 없이 정규식 + in-memory ts-morph project로 동작.
 */
import { describe, expect, it } from 'vitest'
import {
  extractScriptBlock,
  extractSveltePropsFromSource,
} from '../extract-svelte.js'

describe('extractScriptBlock', () => {
  it('<script lang="ts">의 본문을 추출한다', () => {
    const out = extractScriptBlock(`<script lang="ts">let x = 1</script>\n<div>x</div>`)
    expect(out).toBe('let x = 1')
  })

  it('script 블록이 없으면 null', () => {
    expect(extractScriptBlock('<div>x</div>')).toBeNull()
  })

  it('multi-line script 본문을 그대로 보존한다', () => {
    const out = extractScriptBlock(`<script lang="ts">\n  let x = 1\n  let y = 2\n</script>`)
    expect(out).toContain('let x = 1')
    expect(out).toContain('let y = 2')
  })
})

describe('extractSveltePropsFromSource — Svelte 5 $props() 추출 (알파.14.1)', () => {
  it('let { ... }: TypeRef = $props()에서 string prop을 추출한다', () => {
    const source = `
<script lang="ts">
  interface Props {
    label: string
  }
  let { label }: Props = $props()
</script>

<span>{label}</span>
`.trim()
    const result = extractSveltePropsFromSource({ source })
    expect(result['label']).toMatchObject({
      type: 'string',
      control: 'text',
      required: true,
    })
  })

  it('optional prop은 required:false', () => {
    const source = `
<script lang="ts">
  interface Props {
    label?: string
    count?: number
  }
  let { label, count }: Props = $props()
</script>

<span>x</span>
`.trim()
    const result = extractSveltePropsFromSource({ source })
    expect(result['label']).toMatchObject({ type: 'string', required: false })
    expect(result['count']).toMatchObject({ type: 'number', required: false })
  })

  it('inline type literal에서도 props 추출이 동작한다', () => {
    const source = `
<script lang="ts">
  let { foo = 'bar', onClick }: { foo?: string; onClick: () => void } = $props()
</script>

<button onclick={onClick}>{foo}</button>
`.trim()
    const result = extractSveltePropsFromSource({ source })
    expect(result['foo']).toMatchObject({ type: 'string', required: false })
    expect(result['onClick']).toMatchObject({ type: 'function', action: true })
  })

  it('string literal union을 enum으로 매핑한다', () => {
    const source = `
<script lang="ts">
  let { variant }: { variant: 'a' | 'b' | 'c' } = $props()
</script>

<span>x</span>
`.trim()
    const result = extractSveltePropsFromSource({ source })
    expect(result['variant']).toMatchObject({
      type: 'enum',
      control: 'select',
    })
    expect((result['variant']?.options ?? []) as readonly unknown[]).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('script 블록이 없거나 $props() 미사용 시 빈 객체', () => {
    expect(extractSveltePropsFromSource({ source: '<div>x</div>' })).toEqual({})
    expect(
      extractSveltePropsFromSource({
        source: '<script lang="ts">let x = 1</script><div>x</div>',
      }),
    ).toEqual({})
  })

  it('$props<TypeRef>() generic 형태도 지원한다', () => {
    const source = `
<script lang="ts">
  interface Props { name: string }
  let p = $props<Props>()
</script>

<span>x</span>
`.trim()
    const result = extractSveltePropsFromSource({ source })
    expect(result['name']).toMatchObject({ type: 'string', required: true })
  })
})
