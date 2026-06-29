import type { ReactElement } from 'react'
import type { Jogak, JogakMeta } from '@jogak/core'
import { reviews } from '@jogak-shop/shared'
import { ReviewItem } from './ReviewItem'

function ReviewItemShowcase({
  reviewId = 'r-001',
  compact = false,
}: {
  reviewId?: string
  compact?: boolean
}): ReactElement {
  const review = reviews.find((r) => r.id === reviewId) ?? reviews[0]
  if (!review) return <p>no review</p>
  return (
    <div className="max-w-2xl">
      <ReviewItem review={review} compact={compact} />
    </div>
  )
}

const meta = {
  title: 'Molecules/ReviewItem',
  component: ReviewItemShowcase,
  argTypes: {
    reviewId: {
      control: 'select',
      options: reviews.map((r) => r.id),
      description: '리뷰 데이터에서 선택',
    },
    compact: { control: 'boolean', description: '제목 생략 + line-clamp body' },
  },
} satisfies JogakMeta

export default meta

export const Full: Jogak = { name: 'Full', args: { reviewId: 'r-001', compact: false } }
export const Compact: Jogak = { name: 'Compact', args: { reviewId: 'r-003', compact: true } }
export const LongBody: Jogak = { name: 'LongBody', args: { reviewId: 'r-005', compact: false } }
