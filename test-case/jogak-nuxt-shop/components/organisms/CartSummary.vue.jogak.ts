import type { Jogak, JogakMeta } from '@jogak/core'
import CartSummaryShowcase from './CartSummary.showcase.vue'

const meta = {
  title: 'Organisms/CartSummary',
  component: CartSummaryShowcase,
  framework: 'vue',
  argTypes: {
    kind: { control: 'select', options: ['empty', 'small', 'large', 'mixed'] },
    compact: { control: 'boolean' },
  },
} satisfies JogakMeta

export default meta

export const Empty: Jogak = { name: 'Empty', args: { kind: 'empty', compact: false } }
export const NeedsShipping: Jogak = { name: 'NeedsShipping', args: { kind: 'small' } }
export const FreeShipping: Jogak = { name: 'FreeShipping', args: { kind: 'large' } }
export const Mixed: Jogak = { name: 'Mixed', args: { kind: 'mixed' } }
