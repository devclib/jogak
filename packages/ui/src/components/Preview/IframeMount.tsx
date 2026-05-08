import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { RegistryEntry } from '@jogak/core'

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
  readonly className?: string
  readonly 'data-testid'?: string
}

/**
 * 알파.8: previewIsolation='iframe' 모드의 mount 컴포넌트.
 *
 * 통신:
 * - 사용자 vite spawn URL이 주어지면(`userViteUrl !== ''`) iframe src를
 *   `${userViteUrl}/__jogak_preview__/index.html` (cross-origin)로 설정.
 * - 동일 origin fallback 시 `/preview-frame.html` (jogak SPA Vite scope).
 *
 * 양쪽 모두 postMessage로 통신:
 * - 부모 → iframe: `{ type: 'jogak:setProps', entryId, args }` | `{ type: 'jogak:unmount' }`
 * - iframe → 부모: `{ type: 'jogak:ready' }` | `{ type: 'jogak:rendered', entryId }`
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
  className,
  'data-testid': dataTestId,
}: IframeMountProps): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [ready, setReady] = useState(false)

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
    }
    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
    }
  }, [])

  // iframe ready 또는 entry/args 변경 시 setProps.
  useEffect(() => {
    if (!ready) return
    const iframe = iframeRef.current
    if (iframe === null) return
    iframe.contentWindow?.postMessage(
      { type: 'jogak:setProps', entryId: entry.id, args },
      '*',
    )
  }, [ready, entry, args])

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
    <iframe
      ref={iframeRef}
      src={src}
      title="Preview"
      className={className}
      data-testid={dataTestId}
    />
  )
}
