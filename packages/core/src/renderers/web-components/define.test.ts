import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { h, type VNode } from 'preact'
import { defaultActionChannel, type RegistryEntry } from '../../index.js'
import { defineJogakElement } from './define.js'

interface DummyProps {
  readonly label: string
  readonly count?: number
  readonly disabled?: boolean
  readonly onClick?: () => void
}

function DummyButton(props: DummyProps): VNode {
  return h(
    'button',
    {
      class: 'dummy',
      disabled: props.disabled === true,
      onClick: props.onClick,
      'data-count': props.count,
    } as Record<string, unknown>,
    props.label,
  )
}

function makeEntry(): RegistryEntry {
  return {
    id: 'Test/Dummy',
    title: 'Test/Dummy',
    jogaks: [],
    meta: {
      title: 'Test/Dummy',
      component: DummyButton,
      argTypes: {
        label: { type: 'string', control: 'text', required: true },
        count: { type: 'number', control: 'number' },
        disabled: { type: 'boolean', control: 'boolean' },
        onClick: { type: 'function', action: true },
      },
    },
  }
}

let tagCounter = 0
function uniqueTag(): string {
  tagCounter += 1
  return `jogak-test-${tagCounter.toString()}`
}

describe('defineJogakElement', () => {
  beforeEach(() => {
    defaultActionChannel.clear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('등록 후 connect되면 컴포넌트가 shadow DOM에 렌더된다', () => {
    const tag = uniqueTag()
    defineJogakElement(tag, makeEntry())

    const el = document.createElement(tag)
    el.setAttribute('label', 'Hello')
    document.body.appendChild(el)

    const button = el.shadowRoot?.querySelector('button.dummy')
    expect(button).not.toBeNull()
    expect(button?.textContent).toBe('Hello')
  })

  test('attribute 변경 시 props가 갱신되어 다시 렌더된다', () => {
    const tag = uniqueTag()
    defineJogakElement(tag, makeEntry())

    const el = document.createElement(tag)
    el.setAttribute('label', 'A')
    document.body.appendChild(el)
    el.setAttribute('label', 'B')
    el.setAttribute('count', '42')
    el.setAttribute('disabled', 'true')

    const button = el.shadowRoot?.querySelector('button.dummy')
    expect(button?.textContent).toBe('B')
    expect(button?.getAttribute('data-count')).toBe('42')
    expect((button as HTMLButtonElement | null)?.disabled).toBe(true)
  })

  test('함수 prop은 자동 spy로 채워져 호출 시 ActionChannel에 로그된다', () => {
    const tag = uniqueTag()
    defineJogakElement(tag, makeEntry())

    const el = document.createElement(tag)
    el.setAttribute('label', 'Click')
    document.body.appendChild(el)

    const button = el.shadowRoot?.querySelector('button.dummy') as HTMLButtonElement | null
    expect(button).not.toBeNull()
    button?.click()

    const logs = defaultActionChannel.getLogs()
    expect(logs.length).toBe(1)
    expect(logs[0]?.name).toBe('onClick')
  })

  test('disconnect 시 shadow DOM이 정리된다', () => {
    const tag = uniqueTag()
    defineJogakElement(tag, makeEntry())

    const el = document.createElement(tag)
    el.setAttribute('label', 'X')
    document.body.appendChild(el)
    expect(el.shadowRoot?.querySelector('button.dummy')).not.toBeNull()

    el.remove()
    expect(el.shadowRoot?.querySelector('button.dummy')).toBeNull()
  })

  test('동일 tagName으로 다시 등록하면 무시된다 (예외 없음)', () => {
    const tag = uniqueTag()
    defineJogakElement(tag, makeEntry())
    expect(() => { defineJogakElement(tag, makeEntry()) }).not.toThrow()
  })
})
