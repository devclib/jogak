import type { Jogak, JogakMeta } from '@jogak/core'
import { reviews } from '@jogak-shop/shared'
import { ReviewItem } from './ReviewItem'

const meta = {
  title: 'Molecules/ReviewItem',
  component: ReviewItem,
  argTypes: {
    compact: { control: 'boolean', description: '제목 생략 + line-clamp body' },
  },
} satisfies JogakMeta

export default meta

export const Full: Jogak = { name: 'Full', args: { review: reviews[0], compact: false } }
export const Compact: Jogak = { name: 'Compact', args: { review: reviews[2], compact: true } }
export const LongBody: Jogak = { name: 'LongBody', args: { review: reviews[4], compact: false } }
