import type { ComponentType, ReactElement } from 'react'
import type { RegistryEntry } from '@jogak/core'
import { JogakClientShell } from '../client/Preview.js'

export interface JogakLayoutProps {
  readonly jogakId: string
  readonly initialEntries: readonly RegistryEntry[]
  readonly component: ComponentType<Record<string, unknown>>
  readonly args?: Readonly<Record<string, unknown>>
}

/**
 * Server Component — 직렬화 가능한 entry 메타데이터를 Client Shell로 전달한다.
 *
 * `entry.meta.component`는 함수이므로 Server → Client 경계를 넘을 수 없다.
 * 호출자가 Client Component(`'use client'`)에서 컴포넌트를 import해
 * `component` prop으로 직접 주입해야 한다.
 *
 * 사용 예 (App Router):
 * ```tsx
 * // app/showcase/page.tsx
 * import { JogakLayout } from '@jogak/next'
 * import { Button } from '@/components/Button'  // 'use client' 모듈
 * import { entries } from '@/jogak-entries'     // 직렬화 가능한 메타만 담긴 배열
 *
 * export default function Page() {
 *   return <JogakLayout jogakId="Components/Button" initialEntries={entries} component={Button} />
 * }
 * ```
 */
export function JogakLayout({
  jogakId,
  initialEntries,
  component,
  args,
}: JogakLayoutProps): ReactElement {
  return (
    <JogakClientShell
      jogakId={jogakId}
      initialEntries={initialEntries}
      component={component}
      {...(args !== undefined ? { args } : {})}
    />
  )
}
