import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import type { MouseEvent, ReactElement } from 'react'
import { defaultActionChannel, type RegistryEntry } from '../../../index.js'
import { JogakClientShell } from './Preview.js'

interface DemoProps {
  readonly label: string
  readonly disabled?: boolean
  readonly onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}

function Demo(props: DemoProps): ReactElement {
  return createElement(
    'button',
    {
      type: 'button',
      'data-testid': 'demo-button',
      disabled: props.disabled === true,
      onClick: props.onClick,
    },
    props.label,
  )
}

const entry: RegistryEntry = {
  id: 'Demo',
  title: 'Demo',
  jogaks: [{ name: 'Default', args: { label: 'Hello' } }],
  meta: {
    title: 'Demo',
    component: undefined,
    argTypes: {
      label: { type: 'string', control: 'text', required: true },
      disabled: { type: 'boolean', control: 'boolean' },
      onClick: { type: 'function', action: true },
    },
  },
}

describe('JogakClientShell', () => {
  beforeEach(() => {
    defaultActionChannel.clear()
  })

  afterEach(() => {
    cleanup()
  })

  test('jogakId가 없으면 not-found 영역을 보여준다', () => {
    render(
      <JogakClientShell
        jogakId="missing"
        initialEntries={[entry]}
        component={Demo as never}
      />,
    )
    expect(screen.getByTestId('jogak-not-found').textContent).toContain('missing')
  })

  test('entry가 있으면 컴포넌트가 렌더된다', async () => {
    await act(async () => {
      render(
        <JogakClientShell
          jogakId="Demo"
          initialEntries={[entry]}
          component={Demo as never}
        />,
      )
    })

    expect(screen.getByTestId('jogak-title').textContent).toBe('Demo')
    expect(screen.getByTestId('demo-button').textContent).toBe('Hello')
  })

  test('함수 prop은 자동 spy로 채워져 호출 시 ActionChannel에 로그된다', async () => {
    await act(async () => {
      render(
        <JogakClientShell
          jogakId="Demo"
          initialEntries={[entry]}
          component={Demo as never}
        />,
      )
    })
    const button = screen.getByTestId('demo-button')
    await act(async () => {
      fireEvent.click(button)
    })

    const logs = defaultActionChannel.getLogs()
    expect(logs.length).toBe(1)
    expect(logs[0]?.name).toBe('onClick')
  })

  test('args prop으로 렌더 인자를 덮어쓸 수 있다', async () => {
    await act(async () => {
      render(
        <JogakClientShell
          jogakId="Demo"
          initialEntries={[entry]}
          component={Demo as never}
          args={{ label: 'World', disabled: true }}
        />,
      )
    })
    const button = screen.getByTestId('demo-button') as HTMLButtonElement
    expect(button.textContent).toBe('World')
    expect(button.disabled).toBe(true)
  })
})
