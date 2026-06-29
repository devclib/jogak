import type { Jogak, JogakMeta } from '@jogak/core'
import { RatingStars } from './RatingStars'

const meta = {
  title: 'Atoms/RatingStars',
  component: RatingStars,
  argTypes: {
    value: { control: 'number', description: '0~5' },
    reviewCount: { control: 'number' },
    size: { control: 'select', options: ['sm', 'md'] },
    showValue: { control: 'boolean' },
  },
} satisfies JogakMeta

export default meta

export const Full: Jogak = { name: 'Full', args: { value: 5, reviewCount: 421 } }
export const Half: Jogak = { name: 'Half', args: { value: 4.5, reviewCount: 87, size: 'md', showValue: true } }
export const Low: Jogak = { name: 'Low', args: { value: 2.3, reviewCount: 12 } }
export const NoCount: Jogak = { name: 'NoCount', args: { value: 4.0, showValue: true } }
