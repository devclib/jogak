import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactElement, ReactNode, CSSProperties } from 'react'

export interface ShadowMountProps {
  readonly children: ReactNode
  readonly className?: string
  readonly style?: CSSProperties
  readonly 'data-testid'?: string
}

/**
 * 알파.7.1: previewIsolation='shadow' 모드의 mount 컴포넌트.
 *
 * 책임: 양방향 격리만 제공 (Preview ↔ outer document 양방향 cascade 차단).
 * - 사용자 globalCss는 main.tsx 가드로 outer document에 inject되지 않음.
 * - shadow root 안에는 jogak chrome css도 사용자 css도 없음 (둘 다 외부에서 격리).
 * - 사용자 컴포넌트의 utility class 컴파일은 결함 B (알파.8 사이클).
 *
 * 알파.7 결함 정정:
 * - `syncStyleSheets`/`MutationObserver`/`adoptedStyleSheets` 흡수 로직 제거.
 *   알파.7은 outer document에 사용자 css가 있는 한 chrome을 침범했고, shadow
 *   안의 흡수 로직은 의미가 없었음. 알파.7.1: outer에 사용자 css 자체가 없음.
 *
 * Radix portal 한계 (사용자 인지 필요, README 명시):
 * - default Portal target = document.body (shadow 외부). 사용자가 명시적으로
 *   `<Portal container={shadowRootEl}>`을 전달해야 portal 내용도 격리됨.
 */
export function ShadowMount({
  children,
  className,
  style,
  'data-testid': dataTestId,
}: ShadowMountProps): ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    const sr = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    setShadowRoot(sr)
    // shadow root는 host element와 함께 GC — 명시 detach 불필요.
  }, [])

  return (
    <div
      ref={hostRef}
      className={className}
      data-testid={dataTestId}
      // eslint-disable-next-line no-restricted-syntax -- jogak: ShadowMount caller-supplied style passthrough (host wrapper, content goes through ShadowRoot portal)
      style={style}
    >
      {shadowRoot !== null ? createPortal(children, shadowRoot) : null}
    </div>
  )
}
