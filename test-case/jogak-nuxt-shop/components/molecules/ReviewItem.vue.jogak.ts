import type { Jogak, JogakMeta } from '@jogak/core'
import { reviews } from '@jogak-shop/shared'
import ReviewItemShowcase from './ReviewItem.showcase.vue'

const meta = {
  title: 'Molecules/ReviewItem',
  component: ReviewItemShowcase,
  framework: 'vue',
  argTypes: {
    reviewId: { control: 'select', options: reviews.map((r) => r.id) },
    compact: { control: 'boolean' },
  },
} satisfies JogakMeta

export default meta

export const Full: Jogak = { name: 'Full', args: { reviewId: 'r-001', compact: false } }
export const Compact: Jogak = { name: 'Compact', args: { reviewId: 'r-003', compact: true } }
export const LongBody: Jogak = { name: 'LongBody', args: { reviewId: 'r-005', compact: false } }
