/**
 * @jogak/codemod transform 회귀 가드.
 */
import { describe, expect, test } from 'vitest'
import { transformSource } from './transform.js'

describe('transformSource', () => {
  test('CSF3 → jogak entry (기본 케이스)', () => {
    const input = `import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { label: 'Click me' },
}

export const Disabled: Story = {
  args: { label: 'Click me', disabled: true },
}
`
    const { source, changes } = transformSource(input)
    expect(source).toContain("from '@jogak/core'")
    expect(source).toContain('JogakMeta')
    expect(source).toContain('type Story = Jogak')
    // name 필드 자동 추가
    expect(source).toContain("name: \"Primary\"")
    expect(source).toContain("name: \"Disabled\"")
    expect(changes.importsRewritten).toBe(1)
    expect(changes.metaTypeReplaced).toBeGreaterThanOrEqual(1)
    expect(changes.storyObjReplaced).toBeGreaterThanOrEqual(1)
    expect(changes.nameFieldsAdded).toBe(2)
  })

  test('vue3 subpath 도 처리한다', () => {
    const input = `import type { Meta } from '@storybook/vue3'
const meta: Meta = { title: 'X', component: null }
export default meta
`
    const { source, changes } = transformSource(input)
    expect(source).toContain("from '@jogak/core'")
    expect(changes.importsRewritten).toBe(1)
    expect(changes.metaTypeReplaced).toBeGreaterThanOrEqual(1)
  })

  test('이미 name 있는 story는 재추가하지 않는다', () => {
    const input = `import type { StoryObj } from '@storybook/react'
type Story = StoryObj
export const X: Story = { name: 'CustomX', args: {} }
`
    const { changes } = transformSource(input)
    expect(changes.nameFieldsAdded).toBe(0)
  })

  test('Storybook import 아니면 그대로 둔다', () => {
    const input = `import { Meta } from 'not-storybook'
const x: Meta = null
`
    const { source, changes } = transformSource(input)
    expect(source).toContain("from 'not-storybook'")
    expect(changes.importsRewritten).toBe(0)
  })
})
