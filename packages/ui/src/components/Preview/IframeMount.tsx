import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { RegistryEntry, JogakA11yViolation } from '@jogak/core'

export interface A11yResult {
  readonly violations: readonly JogakA11yViolation[]
  readonly notInstalled: boolean
}

export interface IframeMountProps {
  readonly entry: RegistryEntry
  readonly args: Readonly<Record<string, unknown>>
  /**
   * 알파.9: 어댑터 dev URL (예: `http://localhost:5174`).
   * 빈 문자열 시 fallback (jogak SPA Vite scope의 `/preview-frame.html`).
   */
  readonly userPreviewUrl: string
  /**
   * 알파.9: iframe entry path (예: `/__jogak_preview__/index.html`).
   * 어댑터의 `previewEntryMeta.devEntryPath`.
   */
  readonly previewEntryPath: string
  /** 1.0.0-beta.3: A11y (axe-core) 결과 콜백 — iframe scope의 'jogak:a11y' 메시지 수신 시 호출 */
  readonly onA11yResult?: ((result: A11yResult) => void) | undefined
  /**
   * 1.0.0 post-1.0: Themes addon. 값이 non-null이면 iframe이 ready된 후
   * `jogak:setTheme` postMessage 전송 → iframe scope handler가
   * `document.documentElement.setAttribute('data-theme', theme)` 실행.
   */
  readonly activeTheme?: string | null | undefined
  readonly className?: string
  readonly 'data-testid'?: string
}

/**
 * 알파.8: previewIsolation='iframe' 모드의 mount 컴포넌트.
 * 1.0.0-beta: iframe → chrome `jogak:error` 메시지 표시 banner 추가.
 *
 * 통신:
 * - 사용자 vite spawn URL이 주어지면(`userViteUrl !== ''`) iframe src를
 *   `${userViteUrl}/__jogak_preview__/index.html` (cross-origin)로 설정.
 * - 동일 origin fallback 시 `/preview-frame.html` (jogak SPA Vite scope).
 *
 * 양쪽 모두 postMessage로 통신:
 * - 부모 → iframe: `{ type: 'jogak:setProps', entryId, args }` | `{ type: 'jogak:unmount' }`
 * - iframe → 부모: `{ type: 'jogak:ready' }` | `{ type: 'jogak:rendered', entryId }` |
 *   `{ type: 'jogak:error', message }`
 *
 * `entry`는 객체가 아닌 **id만 전달** — iframe 안에서 `defaultRegistry.requestEntry(id)`로
 * dynamic import. 사용자 vite scope의 entry 가상 모듈이 사용자 컴포넌트를 fetch하므로
 * 사용자 plugins(@tailwindcss/vite, custom alias 등)이 정상 작동.
 */
export function IframeMount({
  entry,
  args,
  userPreviewUrl,
  previewEntryPath,
  onA11yResult,
  activeTheme,
  className,
  'data-testid': dataTestId,
}: IframeMountProps): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [ready, setReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // 1.0.0-beta.2: iframe scope에서 보낸 'jogak:height' 메시지로 동기화.
  // 컴포넌트 자연 높이에 맞춰 iframe element height 조정 — 내부 scroll 회피.
  // null이면 fallback (min-height만 적용).
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  const src =
    userPreviewUrl !== ''
      ? `${userPreviewUrl}${previewEntryPath}`
      : '/preview-frame.html'

  // postMessage 리스너 — iframe contentWindow 일치성 검증 후 처리.
  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      const iframe = iframeRef.current
      if (iframe === null) return
      if (event.source !== iframe.contentWindow) return
      const data = event.data
      if (data == null || typeof data !== 'object') return
      if (data.type === 'jogak:ready') setReady(true)
      else if (data.type === 'jogak:rendered') setErrorMessage(null)
      else if (data.type === 'jogak:error' && typeof data.message === 'string') {
        setErrorMessage(data.message)
      } else if (data.type === 'jogak:height' && typeof data.height === 'number' && data.height > 0) {
        setContentHeight(data.height)
      } else if (data.type === 'jogak:a11y' && Array.isArray(data.violations)) {
        onA11yResult?.({
          violations: data.violations as readonly JogakA11yViolation[],
          notInstalled: data.notInstalled === true,
        })
      }
    }
    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
    }
  }, [])

  // iframe ready 또는 entry/args 변경 시 setProps. entry 변경마다 에러 상태 초기화.
  useEffect(() => {
    if (!ready) return
    setErrorMessage(null)
    const iframe = iframeRef.current
    if (iframe === null) return
    iframe.contentWindow?.postMessage(
      { type: 'jogak:setProps', entryId: entry.id, args },
      '*',
    )
  }, [ready, entry, args])

  // 1.0.0 post-1.0: Themes addon — ready + activeTheme 변경 시 setTheme 전송.
  useEffect(() => {
    if (!ready) return
    if (activeTheme === null || activeTheme === undefined) return
    const iframe = iframeRef.current
    if (iframe === null) return
    iframe.contentWindow?.postMessage(
      { type: 'jogak:setTheme', theme: activeTheme },
      '*',
    )
  }, [ready, activeTheme])

  // unmount 시 unmount 메시지 (race 회피 microtask defer).
  useEffect(() => {
    const iframe = iframeRef.current
    return () => {
      if (iframe === null) return
      queueMicrotask(() => {
        iframe.contentWindow?.postMessage({ type: 'jogak:unmount' }, '*')
      })
    }
  }, [])

  return (
    <div
      className={`jogak:relative ${className ?? ''}`}
      data-testid={dataTestId}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title="Preview"
        className="jogak:block jogak:w-full jogak:min-h-[256px] jogak:border-none"
        // 1.0.0-beta.2: contentHeight 받은 후 자연 높이로 갱신 (내부 scroll 회피).
        // 'jogak:height' postMessage 수신 시점에만 inline style — 다른 정적 속성은 className.
        // eslint-disable-next-line no-restricted-syntax -- jogak: dynamic height sync from iframe content
        style={contentHeight !== null ? { height: `${contentHeight}px` } : undefined}
      />
      {errorMessage !== null ? (
        <div
          data-testid="preview-iframe-error"
          role="alert"
          className="jogak:absolute jogak:bottom-2 jogak:left-2 jogak:right-2 jogak:rounded-[var(--jogak-radius-md)] jogak:bg-[var(--jogak-color-bg-error)] jogak:border jogak:border-[var(--jogak-color-error-border)] jogak:text-[var(--jogak-color-error-fg)] jogak:p-3 jogak:text-[12px] jogak:leading-snug"
        >
          <strong className="jogak:block jogak:mb-1">Preview error</strong>
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}
