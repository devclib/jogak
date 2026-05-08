import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactElement, ReactNode, CSSProperties } from 'react'

export interface ShadowMountProps {
  readonly children: ReactNode
  readonly className?: string
  readonly style?: CSSProperties
  /** 외부 테스트 hook (호스트 div에 부여). */
  readonly 'data-testid'?: string
}

/**
 * 알파.7: previewIsolation='shadow' 모드의 mount 컴포넌트.
 *
 * 역할:
 * - 호스트 `<div>`에 `attachShadow({ mode: 'open' })`로 ShadowRoot를 부착.
 * - `createPortal`로 children을 ShadowRoot에 렌더 (React tree 유지).
 * - 외부 document의 모든 `<style>` / cross-origin 가능 stylesheet를
 *   `adoptedStyleSheets`로 ShadowRoot에 share (jogak.css + virtual:jogak/global-css
 *   둘 다 자동 포함).
 * - Vite dev에서 `<style>` HMR 시 MutationObserver로 ShadowRoot도 갱신.
 *
 * Radix portal 한계 (사용자 인지 필요):
 * - 사용자 컴포넌트가 `Dialog.Portal` / `Popover.Portal` 등을 default로 쓰면
 *   portal target은 `document.body` — ShadowRoot 외부. utility class는 외부
 *   document에 정의되어 적용됨, 단 z-index/focus/event boundary가 분리될 수 있음.
 * - 회피: 사용자가 명시적으로 `<Portal container={shadowRootEl}>`을 전달.
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
    let sr: ShadowRoot
    if (host.shadowRoot !== null) {
      sr = host.shadowRoot
    } else {
      sr = host.attachShadow({ mode: 'open' })
    }
    setShadowRoot(sr)
    syncStyleSheets(sr)
    const observer = observeDocumentStyles(sr)
    return () => { observer.disconnect() }
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

/**
 * 외부 document의 모든 stylesheet를 ShadowRoot에 share한다.
 *
 * - `adoptedStyleSheets` API를 사용 (Chromium/Safari/Firefox 모던 브라우저 지원).
 * - cross-origin sheet는 `cssRules` 접근 시 SecurityError → catch 후 skip.
 * - Vite dev의 `<style>` HMR이 자주 발생할 수 있어 `replaceSync`를 통한 새
 *   `CSSStyleSheet` 인스턴스 생성으로 처리.
 */
function syncStyleSheets(shadowRoot: ShadowRoot): void {
  const sheets: CSSStyleSheet[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules
      const cs = new CSSStyleSheet()
      const cssText = Array.from(rules).map((r) => r.cssText).join('\n')
      cs.replaceSync(cssText)
      sheets.push(cs)
    } catch {
      // cross-origin sheet — skip
    }
  }
  shadowRoot.adoptedStyleSheets = sheets
}

/**
 * document.head의 변화(`<style>` HMR add/remove)를 관찰해 ShadowRoot의
 * adoptedStyleSheets를 다시 sync.
 */
function observeDocumentStyles(shadowRoot: ShadowRoot): MutationObserver {
  const observer = new MutationObserver(() => {
    syncStyleSheets(shadowRoot)
  })
  observer.observe(document.head, { childList: true, subtree: true })
  return observer
}
