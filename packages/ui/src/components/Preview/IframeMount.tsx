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
  /** 1.0.0 post-1.0: MDX docs view mode. 'docs' 선택 시 renderDocs 전송. */
  readonly viewMode?: 'component' | 'docs' | undefined
  /** 1.0.0 post-1.0: MDX docs 파일 경로 (jogak.meta.docs). */
  readonly docsPath?: string | null | undefined
  /** 1.1.0 post-1.0: Play 함수 트리거 — 값이 증가하면 iframe에 runPlay 전송. */
  readonly playTrigger?: number | undefined
  /** 1.1.0 post-1.0: 현재 선택된 jogak variant name — setProps에 함께 전달. */
  readonly jogakName?: string | null | undefined
  /** 1.1.0 post-1.0: Play 결과 콜백. `durationMs`는 1.2.0 post-1.2. */
  readonly onPlayResult?: ((result: { status: 'ok' | 'error' | 'no-play'; message?: string; durationMs?: number }) => void) | undefined
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
  viewMode,
  docsPath,
  jogakName,
  playTrigger,
  onPlayResult,
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
  // 1.2.0 post-1.2: rAF debounce용 — 프레임 안에 도착한 height는 마지막 값만 반영.
  const pendingHeightRef = useRef<number | null>(null)

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
        // 1.2.0 post-1.2: rAF debounce — 짧은 시간 안에 여러 height 오면 한 frame당 1회만 setState.
        // large args 변경 시 ResizeObserver가 여러 번 fire → flicker 해소.
        if (pendingHeightRef.current !== null) return
        pendingHeightRef.current = data.height
        requestAnimationFrame(() => {
          const next = pendingHeightRef.current
          pendingHeightRef.current = null
          if (next !== null) setContentHeight(next)
        })
      } else if (data.type === 'jogak:a11y' && Array.isArray(data.violations)) {
        onA11yResult?.({
          violations: data.violations as readonly JogakA11yViolation[],
          notInstalled: data.notInstalled === true,
        })
      } else if (data.type === 'jogak:playResult' && typeof data.status === 'string') {
        onPlayResult?.({
          status: data.status as 'ok' | 'error' | 'no-play',
          message: typeof data.message === 'string' ? data.message : undefined,
          durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
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
      {
        type: 'jogak:setProps',
        entryId: entry.id,
        args,
        // 1.1.0 post-1.0: jogakName 전달 → iframe이 어느 variant의 play를 실행할지 판별.
        ...(typeof jogakName === 'string' ? { jogakName } : {}),
      },
      '*',
    )
  }, [ready, entry, args, jogakName])

  // 1.1.0 post-1.0: Play 함수 실행 — playTrigger가 증가할 때마다 runPlay 전송.
  useEffect(() => {
    if (!ready || playTrigger === undefined || playTrigger === 0) return
    const iframe = iframeRef.current
    if (iframe === null) return
    iframe.contentWindow?.postMessage({ type: 'jogak:runPlay' }, '*')
  }, [ready, playTrigger])

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
        // 1.2.0 post-1.2: transition으로 flicker 완화 — rAF debounce와 병행.
        // eslint-disable-next-line no-restricted-syntax -- jogak: dynamic height sync from iframe content
        style={
          contentHeight !== null
            ? { height: `${contentHeight}px`, transition: 'height 100ms ease-out' }
            : undefined
        }
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
