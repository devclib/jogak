'use client'

import type { ReactElement } from 'react'

export interface QuantityStepperProps {
  readonly value: number
  readonly min?: number
  readonly max?: number
  readonly onChange: (next: number) => void
  readonly size?: 'sm' | 'md'
}

const sizeMap = {
  sm: { btn: 'h-7 w-7 text-sm', input: 'h-7 w-10 text-sm' },
  md: { btn: 'h-9 w-9 text-base', input: 'h-9 w-12 text-base' },
}

/**
 * - / + 버튼 + 숫자 입력. min/max 클램프.
 * controlled component — 부모가 value/onChange 관리.
 */
export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  size = 'md',
}: QuantityStepperProps): ReactElement {
  const cls = sizeMap[size]
  const clamp = (n: number): number => Math.max(min, Math.min(max, n))
  const dec = (): void => onChange(clamp(value - 1))
  const inc = (): void => onChange(clamp(value + 1))
  return (
    <div className="inline-flex items-center rounded-md border border-ink-200 bg-white">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className={`${cls.btn} flex items-center justify-center text-ink-900 hover:bg-ink-100 disabled:text-ink-400 disabled:cursor-not-allowed`}
        aria-label="quantity-decrement"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(clamp(n))
        }}
        className={`${cls.input} border-x border-ink-200 text-center font-medium tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className={`${cls.btn} flex items-center justify-center text-ink-900 hover:bg-ink-100 disabled:text-ink-400 disabled:cursor-not-allowed`}
        aria-label="quantity-increment"
      >
        ＋
      </button>
    </div>
  )
}