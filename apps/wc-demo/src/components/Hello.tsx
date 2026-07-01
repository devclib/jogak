/** WC smoke fixture — Preact JSX rendered to a custom element */
import { h } from 'preact'

export interface HelloProps {
  /** 인사 대상 이름 */
  name?: string
}

export function Hello({ name }: HelloProps): h.JSX.Element {
  return <div data-testid="wc-hello">Hello {name ?? 'world'} (wc)</div>
}
