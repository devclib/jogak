'use client'

import type { ReactElement } from 'react'
import type { Currency } from '@jogak-shop/shared'
import { formatPrice } from '@jogak-shop/shared'

export interface PriceTagProps {
  readonly cents: number
  readonly originalCents?: number
  readonly currency?: Currency
  readonly size?: 'sm' | 'md' | 'lg'
  readonly align?: 'left' | 'right'
}

const sizeMap = {
  sm: { now: 'text-sm', was: 'text-[11px]' },
  md: { now: 'text-base font-semibold', was: 'text-xs' },
  lg: { now: 'text-2xl font-bold', was: 'text-sm' },
}

/**
 * 가격 + 할인 전 가격(strike-through) + 할인율 자동 계산.
 * `originalCents`를 주면 strike-through + accent 색상으로 표시.
 */
export function PriceTag({
  cents,
  originalCents,
  currency = 'USD',
  size = 'md',
  align = 'left',
}: PriceTagProps): ReactElement {
  const cls = sizeMap[size]
  const discounted = originalCents !== undefined && originalCents > cents
  const discountPercent = discounted
    ? Math.round(((originalCents - cents) / originalCents) * 100)
    : 0
  return (
    <div
      className={`inline-flex items-baseline gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}
    >
      <span className={`${cls.now} ${discounted ? 'text-danger-500' : 'text-ink-900'}`}>
        {formatPrice(cents, currency)}
      </span>
      {discounted ? (
        <>
          <span className={`${cls.was} text-ink-400 line-through`}>
            {formatPrice(originalCents, currency)}
          </span>
          <span className={`${cls.was} font-medium text-accent-500`}>-{discountPercent}%</span>
        </>
      ) : null}
    </div>
  )
}