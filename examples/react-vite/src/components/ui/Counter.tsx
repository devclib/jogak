import { useState } from 'react'

export interface CounterProps {
  /** 초기값 */
  readonly initial?: number
  /** 증감 단위 */
  readonly step?: number
  /** 라벨 */
  readonly label?: string
}

export function Counter({ initial = 0, step = 1, label = 'count' }: CounterProps) {
  const [value, setValue] = useState(initial)
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background p-2">
      <button
        type="button"
        onClick={() => setValue((v) => v - step)}
        className="h-8 w-8 rounded-md bg-secondary text-secondary-foreground"
        aria-label="decrement"
      >
        −
      </button>
      <span className="min-w-16 text-center text-sm">
        {label}: <strong>{value}</strong>
      </span>
      <button
        type="button"
        onClick={() => setValue((v) => v + step)}
        className="h-8 w-8 rounded-md bg-primary text-primary-foreground"
        aria-label="increment"
      >
        +
      </button>
    </div>
  )
}
