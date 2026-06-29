'use client'

import { useState, type ReactElement } from 'react'
import type { Review } from '@jogak-shop/shared'
import { RatingStars } from '../atoms/RatingStars.tsx'

export interface ReviewItemProps {
  readonly review: Review
  readonly compact?: boolean
}

/**
 * 한 건의 리뷰. "도움이 됐어요" 토글 (local optimistic).
 */
export function ReviewItem({ review, compact = false }: ReviewItemProps): ReactElement {
  const [helpful, setHelpful] = useState(false)
  const count = review.helpfulCount + (helpful ? 1 : 0)
  return (
    <article className={`border-b border-ink-100 py-4 ${compact ? 'space-y-1' : 'space-y-2'}`}>
      <header className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink-900">{review.author}</span>
        <RatingStars value={review.rating} size="sm" />
      </header>
      {!compact ? <h4 className="font-medium text-ink-900">{review.title}</h4> : null}
      <p className={`text-ink-600 ${compact ? 'text-xs line-clamp-2' : 'text-sm'}`}>{review.body}</p>
      <footer className="flex items-center justify-between pt-1 text-xs text-ink-400">
        <time>{new Date(review.createdAt).toLocaleDateString('ko-KR')}</time>
        <button
          type="button"
          onClick={() => setHelpful((v) => !v)}
          className={`transition-colors ${helpful ? 'text-brand-600 font-medium' : 'hover:text-ink-600'}`}
        >
          👍 도움이 됐어요 ({count})
        </button>
      </footer>
    </article>
  )
}