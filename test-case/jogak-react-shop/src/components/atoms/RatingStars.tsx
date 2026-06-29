import type { ReactElement } from 'react'
import { ratingStars } from '@jogak-shop/shared'

export interface RatingStarsProps {
  readonly value: number
  readonly reviewCount?: number
  readonly size?: 'sm' | 'md'
  readonly showValue?: boolean
}

const sizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
}

/**
 * 0~5 별점. 반 별 지원. 리뷰 수와 평점 텍스트 옵션.
 */
export function RatingStars({
  value,
  reviewCount,
  size = 'sm',
  showValue = false,
}: RatingStarsProps): ReactElement {
  const stars = ratingStars(value)
  return (
    <span className={`inline-flex items-center gap-1 ${sizeMap[size]}`} aria-label={`${value} / 5`}>
      <span className="text-accent-500 leading-none tracking-tight">
        {'★'.repeat(stars.full)}
        {stars.half ? '½' : ''}
        <span className="text-ink-200">{'★'.repeat(stars.empty)}</span>
      </span>
      {showValue ? <span className="font-medium text-ink-900">{value.toFixed(1)}</span> : null}
      {reviewCount !== undefined ? (
        <span className="text-ink-400">({reviewCount.toLocaleString()})</span>
      ) : null}
    </span>
  )
}
