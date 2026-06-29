import type { Jogak, JogakMeta } from '@jogak/core'
import { PriceTag } from './PriceTag'

const meta = {
  title: 'Atoms/PriceTag',
  component: PriceTag,
  argTypes: {
    cents: { control: 'number' },
    originalCents: { control: 'number' },
    currency: { control: 'select', options: ['USD', 'KRW', 'EUR'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    align: { control: 'select', options: ['left', 'right'] },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = { name: 'Default', args: { cents: 4900, currency: 'USD' } }
export const Discounted: Jogak = { name: 'Discounted', args: { cents: 4165, originalCents: 4900, size: 'md' } }
export const LargeKRW: Jogak = { name: 'LargeKRW', args: { cents: 14900, currency: 'KRW', size: 'lg' } }
export const SmallRight: Jogak = { name: 'SmallRight', args: { cents: 1200, size: 'sm', align: 'right' } }
