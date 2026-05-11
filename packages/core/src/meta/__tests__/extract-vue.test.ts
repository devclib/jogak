/**
 * 알파.14.1: Vue SFC (`.vue`) props 추출 단위 테스트.
 *
 * `@vue/compiler-sfc` (또는 `vue/compiler-sfc`) sync 로딩 + ts-morph 분석.
 * SFC 소스 문자열을 직접 주입해 fs IO 없이 검증.
 */
import { describe, expect, it } from 'vitest'
import { extractVuePropsFromSource } from '../extract-vue.js'

describe('extractVuePropsFromSource — Vue SFC props 추출 (알파.14.1)', () => {
  it('script setup의 defineProps<Props>()에서 string prop을 추출한다', () => {
    const source = `
<script setup lang="ts">
interface Props {
  label: string
}
const props = defineProps<Props>()
</script>

<template>
  <span>{{ props.label }}</span>
</template>
`.trim()
    const result = extractVuePropsFromSource({ source })
    expect(result['label']).toMatchObject({
      type: 'string',
      control: 'text',
      required: true,
    })
  })

  it('optional prop은 required:false로 표시된다', () => {
    const source = `
<script setup lang="ts">
interface Props {
  label?: string
  count?: number
}
defineProps<Props>()
</script>

<template>
  <span>x</span>
</template>
`.trim()
    const result = extractVuePropsFromSource({ source })
    expect(result['label']).toMatchObject({ type: 'string', required: false })
    expect(result['count']).toMatchObject({ type: 'number', required: false })
  })

  it('string literal union을 enum + select로 매핑한다', () => {
    const source = `
<script setup lang="ts">
interface Props {
  variant: 'primary' | 'secondary' | 'ghost'
}
defineProps<Props>()
</script>

<template><span>x</span></template>
`.trim()
    const result = extractVuePropsFromSource({ source })
    expect(result['variant']).toMatchObject({
      type: 'enum',
      control: 'select',
    })
    expect((result['variant']?.options ?? []) as readonly unknown[]).toEqual([
      'primary',
      'secondary',
      'ghost',
    ])
  })

  it('boolean prop을 boolean control로 매핑한다', () => {
    const source = `
<script setup lang="ts">
interface Props {
  disabled: boolean
}
defineProps<Props>()
</script>

<template><span>x</span></template>
`.trim()
    const result = extractVuePropsFromSource({ source })
    expect(result['disabled']).toMatchObject({
      type: 'boolean',
      control: 'boolean',
    })
  })

  it('function prop은 action으로 표시된다', () => {
    const source = `
<script setup lang="ts">
interface Props {
  onClick: () => void
}
defineProps<Props>()
</script>

<template><button @click="onClick">x</button></template>
`.trim()
    const result = extractVuePropsFromSource({ source })
    expect(result['onClick']).toMatchObject({
      type: 'function',
      action: true,
    })
  })

  it('script setup이 없거나 defineProps가 없으면 빈 객체를 돌려준다', () => {
    const result1 = extractVuePropsFromSource({ source: '<template>hi</template>' })
    expect(result1).toEqual({})
    const result2 = extractVuePropsFromSource({
      source: '<script setup lang="ts">const x = 1</script><template>x</template>',
    })
    expect(result2).toEqual({})
  })
})
