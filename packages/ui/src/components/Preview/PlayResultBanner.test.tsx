/**
 * 1.2.0 post-1.2 회귀 가드 — PlayResultBanner 상태별 렌더링.
 *
 * Play 함수 실행 결과를 사용자에게 노출하는 배너의 3가지 상태(ok/error/no-play)와
 * dismiss 버튼 동작을 검증.
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PlayResultBanner } from './PlayResultBanner.js'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface MountResult {
  readonly container: HTMLElement
  readonly root: Root
}

const mounts: MountResult[] = []

function mount(node: ReturnType<typeof createElement>): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => { root.render(node) })
  mounts.push({ container, root })
  return container
}

afterEach(() => {
  for (const m of mounts) {
    act(() => { m.root.unmount() })
    m.container.remove()
  }
  mounts.length = 0
})

describe('PlayResultBanner', () => {
  test('no-play: 아무것도 렌더하지 않는다', () => {
    const container = mount(
      createElement(PlayResultBanner, { result: { status: 'no-play' }, onDismiss: () => undefined }),
    )
    expect(container.querySelector('[data-testid="play-result-banner"]')).toBeNull()
  })

  test('ok: 초록 배지 "Play passed"만 표시, message 영역 없음', () => {
    const container = mount(
      createElement(PlayResultBanner, { result: { status: 'ok' }, onDismiss: () => undefined }),
    )
    const banner = container.querySelector('[data-testid="play-result-banner"]')
    expect(banner).not.toBeNull()
    expect(banner?.getAttribute('data-status')).toBe('ok')
    expect(banner?.textContent).toContain('Play passed')
    // 성공 시 message 렌더 안 함
    expect(container.querySelector('[data-testid="play-result-message"]')).toBeNull()
  })

  test('error: 빨강 배경 + assertion trace(message) 원문 노출', () => {
    const trace = 'TestingLibraryElementError: Unable to find role="button" with name /save/i'
    const container = mount(
      createElement(PlayResultBanner, {
        result: { status: 'error', message: trace },
        onDismiss: () => undefined,
      }),
    )
    const banner = container.querySelector('[data-testid="play-result-banner"]')
    expect(banner?.getAttribute('data-status')).toBe('error')
    expect(banner?.textContent).toContain('Play failed')
    const message = container.querySelector('[data-testid="play-result-message"]')
    expect(message?.textContent).toBe(trace)
  })

  test('error + message 없음: message 영역 렌더 안 함', () => {
    const container = mount(
      createElement(PlayResultBanner, {
        result: { status: 'error' },
        onDismiss: () => undefined,
      }),
    )
    expect(container.querySelector('[data-testid="play-result-message"]')).toBeNull()
  })

  test('dismiss 버튼 클릭 시 onDismiss 콜백 호출', () => {
    const onDismiss = vi.fn()
    const container = mount(
      createElement(PlayResultBanner, { result: { status: 'ok' }, onDismiss }),
    )
    const dismissBtn = container.querySelector('[aria-label="Dismiss play result"]')
    expect(dismissBtn).not.toBeNull()
    act(() => { (dismissBtn as HTMLButtonElement).click() })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
