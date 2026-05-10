import { describe, expect, it } from 'vitest'
import type { RegistryEntry } from '@jogak/core'
import { formatUsageCode } from './format-usage.js'

function makeEntry(componentName: string, title = 'UI/Demo'): RegistryEntry {
  function Demo(): null {
    return null
  }
  Object.defineProperty(Demo, 'name', { value: componentName })
  return {
    id: title,
    title,
    jogaks: [],
    meta: { title, component: Demo, argTypes: {} },
    source: '',
    filePath: '',
  }
}

describe('formatUsageCode', () => {
  it('children 문자열 → 단일 라인', () => {
    const entry = makeEntry('Badge')
    expect(formatUsageCode(entry, { children: 'New', variant: 'default' })).toBe(
      '<Badge variant="default">New</Badge>',
    )
  })

  it('children 없음 → self-closing', () => {
    const entry = makeEntry('Card')
    expect(formatUsageCode(entry, { title: 'Hello' })).toBe(
      '<Card title="Hello" />',
    )
  })

  it('boolean true → key only, false → key={false}', () => {
    const entry = makeEntry('Toggle')
    expect(formatUsageCode(entry, { disabled: true, checked: false })).toBe(
      '<Toggle disabled checked={false} />',
    )
  })

  it('number → 중괄호 표현', () => {
    const entry = makeEntry('Counter')
    expect(formatUsageCode(entry, { count: 42 })).toBe('<Counter count={42} />')
  })

  it('function → key={fn}', () => {
    const entry = makeEntry('Button')
    expect(
      formatUsageCode(entry, { onClick: () => undefined, label: 'Go' }),
    ).toBe('<Button onClick={fn} label="Go" />')
  })

  it('객체/배열 → JSON 표현', () => {
    const entry = makeEntry('List')
    expect(formatUsageCode(entry, { items: [1, 2, 3] })).toBe(
      '<List items={[1,2,3]} />',
    )
  })

  it('children에 number → JSX 표현', () => {
    const entry = makeEntry('Counter')
    expect(formatUsageCode(entry, { children: 7 })).toBe(
      '<Counter>{7}</Counter>',
    )
  })

  it('component name 없으면 title의 마지막 segment 사용', () => {
    const entry: RegistryEntry = {
      id: 'UI/Anonymous',
      title: 'UI/Anonymous',
      jogaks: [],
      meta: {
        title: 'UI/Anonymous',
        component: undefined,
        argTypes: {},
      },
      source: '',
      filePath: '',
    }
    expect(formatUsageCode(entry, { children: 'X' })).toBe(
      '<Anonymous>X</Anonymous>',
    )
  })

  it('많은 props → multi-line 포맷', () => {
    const entry = makeEntry('Form')
    const out = formatUsageCode(entry, {
      title: 'Long descriptive title',
      description: 'Another lengthy text value',
      disabled: false,
      autoFocus: true,
    })
    expect(out).toContain('\n')
    expect(out.startsWith('<Form\n  ')).toBe(true)
    expect(out.endsWith('/>')).toBe(true)
  })

  it('따옴표 escape', () => {
    const entry = makeEntry('Label')
    expect(formatUsageCode(entry, { text: 'He said "hi"' })).toBe(
      '<Label text="He said &quot;hi&quot;" />',
    )
  })

  it('children + props 모두 multi-line으로 ', () => {
    const entry = makeEntry('Card')
    const out = formatUsageCode(entry, {
      title: 'A long title',
      description: 'A long description',
      children: 'Body content',
    })
    expect(out).toMatch(/^<Card\n {2}title="A long title"\n {2}description="A long description"\n>\n {2}Body content\n<\/Card>$/u)
  })
})
