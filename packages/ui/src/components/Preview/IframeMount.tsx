import { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import type { RegistryEntry } from '@jogak/core'

export interface IframeMountProps {
  readonly entry: RegistryEntry
  readonly args: Readonly<Record<string, unknown>>
  readonly className?: string
  readonly 'data-testid'?: string
}

interface SetPropsArgs {
  readonly entry: RegistryEntry
  readonly args: Readonly<Record<string, unknown>>
}

declare global {
  interface Window {
    __jogak_setProps__?: (args: SetPropsArgs) => void
    __jogak_unmount__?: () => void
  }
}

/**
 * 알파.7: previewIsolation='iframe' 모드의 mount 컴포넌트.
 *
 * - `<iframe src="/preview-frame.html">`을 마운트.
 * - iframe load 후 `iframe.contentWindow.__jogak_setProps__({ entry, args })`를
 *   호출해 entry/args를 주입한다 (postMessage 미사용 — 동일 origin이므로
 *   contentWindow 직접 접근 가능).
 * - entry/args 변경 시 setProps 재호출 (load 완료 이후).
 *
 * HMR:
 * - iframe document 자체도 Vite dev server module을 import하므로 사용자 컴포넌트
 *   파일 변경 시 fast refresh가 iframe 안에서 작동.
 * - previewIsolation 모드 자체 변경은 가상 모듈 invalidate → full reload.
 *
 * sandbox 미설정:
 * - 사용자 컴포넌트가 fetch/clipboard/storage 등 자유롭게 사용해야 하므로 sandbox X.
 */
export function IframeMount({
  entry,
  args,
  className,
  'data-testid': dataTestId,
}: IframeMountProps): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const readyRef = useRef(false)

  // iframe load 후 첫 setProps
  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe === null) return
    const handleLoad = (): void => {
      readyRef.current = true
      iframe.contentWindow?.__jogak_setProps__?.({ entry, args })
    }
    iframe.addEventListener('load', handleLoad)
    return () => {
      iframe.removeEventListener('load', handleLoad)
      // unmount 시 iframe 안 react root도 정리 (best-effort)
      iframe.contentWindow?.__jogak_unmount__?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // entry/args 변경 시 setProps 재호출 (load 후에만)
  useEffect(() => {
    if (!readyRef.current) return
    iframeRef.current?.contentWindow?.__jogak_setProps__?.({ entry, args })
  }, [entry, args])

  return (
    <iframe
      ref={iframeRef}
      src="/preview-frame.html"
      title="Preview"
      className={className}
      data-testid={dataTestId}
    />
  )
}
