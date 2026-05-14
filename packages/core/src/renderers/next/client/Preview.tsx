'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import type { ComponentType, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { ComponentRegistry, injectActions } from '../../../index.js'
import type { RegistryEntry } from '../../../index.js'

export interface JogakClientShellProps {
  readonly jogakId: string
  /**
   * 서버에서 직렬화하여 전달된 RegistryEntry 배열.
   * Server Component → Client 경계를 넘기 위해 `meta.component`는 직렬화되지 않는다.
   */
  readonly initialEntries: readonly RegistryEntry[]
  /**
   * jogakId에 해당하는 컴포넌트.
   * 함수는 Server Component에서 직렬화 불가하므로,
   * Client 페이지가 자체 import하여 직접 prop으로 전달한다.
   */
  readonly component: ComponentType<Record<string, unknown>>
  /**
   * 렌더에 사용할 args. 미지정 시 첫 번째 jogak의 args를 사용한다.
   */
  readonly args?: Readonly<Record<string, unknown>>
}

/**
 * Next.js App Router용 클라이언트 셸.
 *
 * 서버에서 받은 entry 메타데이터를 클라이언트 레지스트리에 로드하고,
 * 함수 prop은 Action spy로 자동 주입한 뒤 React DOM으로 렌더한다.
 */
export function JogakClientShell({
  jogakId,
  initialEntries,
  component,
  args,
}: JogakClientShellProps): ReactElement {
  const [registry] = useState(() => {
    const r = new ComponentRegistry()
    for (const entry of initialEntries) r.register(entry)
    return r
  })
  const entry = registry.get(jogakId)

  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<Root | null>(null)

  const resolvedArgs = args ?? entry?.jogaks[0]?.args ?? {}

  useEffect(() => {
    const container = containerRef.current
    if (container === null || entry === undefined) return
    const finalArgs = injectActions(resolvedArgs, entry.meta.argTypes ?? {})
    if (rootRef.current === null) {
      rootRef.current = createRoot(container)
    }
    rootRef.current.render(createElement(component, finalArgs))
  }, [entry, component, resolvedArgs])

  useEffect(() => {
    return () => {
      const root = rootRef.current
      rootRef.current = null
      if (root === null) return
      // React 19: 동일 트리에서 outer root unmount 도중 inner root를 동기 unmount하면
      // "Attempted to synchronously unmount a root while React was already rendering" race.
      // microtask로 defer하여 outer cleanup이 끝난 뒤에 처리한다.
      queueMicrotask(() => {
        try {
          root.unmount()
        } catch {
          /* 이미 unmount된 경우 무시 */
        }
      })
    }
  }, [])

  if (entry === undefined) {
    return <div data-testid="jogak-not-found">Jogak not found: {jogakId}</div>
  }

  return (
    <div data-testid="jogak-client-shell">
      <h2 data-testid="jogak-title">{entry.title}</h2>
      <div ref={containerRef} data-testid="jogak-preview" />
    </div>
  )
}
