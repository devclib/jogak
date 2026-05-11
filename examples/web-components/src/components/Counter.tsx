import { h } from 'preact'
import { useState } from 'preact/hooks'

export interface CounterProps {
  /** 초기값 */
  readonly initial?: number
  /** 증감 단위 */
  readonly step?: number
  /** 라벨 */
  readonly label?: string
}

export function Counter({
  initial = 0,
  step = 1,
  label = 'count',
}: CounterProps): h.JSX.Element {
  const [value, setValue] = useState(initial)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
      }}
    >
      <button
        type="button"
        onClick={() => setValue((v) => v - step)}
        style={{
          height: 28,
          width: 28,
          background: '#f1f5f9',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        −
      </button>
      <span style={{ minWidth: 60, textAlign: 'center' }}>
        {label}: <strong>{value}</strong>
      </span>
      <button
        type="button"
        onClick={() => setValue((v) => v + step)}
        style={{
          height: 28,
          width: 28,
          background: '#0f172a',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        +
      </button>
    </span>
  )
}
