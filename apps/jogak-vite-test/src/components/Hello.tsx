/** React smoke fixture — 최소 컴포넌트 with data-testid */
export interface HelloProps {
  /** 인사 대상 이름 */
  name?: string
}

export function Hello({ name }: HelloProps) {
  return <div data-testid="react-hello">Hello {name ?? 'world'} (react)</div>
}
