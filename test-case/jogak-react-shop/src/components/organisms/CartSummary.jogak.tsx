import type { Jogak, JogakMeta } from '@jogak/core'
import type { Cart } from '@jogak-shop/shared'
import { CartSummary } from './CartSummary'

const meta = {
  title: 'Organisms/CartSummary',
  component: CartSummary,
  argTypes: {
    compact: { control: 'boolean', description: 'sticky 비활성화 + 패딩 축소' },
  },
} satisfies JogakMeta

export default meta

const empty: Cart = { lines: [], updatedAt: 0 }
const small: Cart = { lines: [{ productId: 'p-007', variantId: null, quantity: 1 }], updatedAt: 0 }
const large: Cart = {
  lines: [
    { productId: 'p-003', variantId: 'v-m', quantity: 1 },
    { productId: 'p-006', variantId: 'v-black', quantity: 1 },
  ],
  updatedAt: 0,
}
const mixed: Cart = {
  lines: [
    { productId: 'p-001', variantId: 'v-m', quantity: 2 },
    { productId: 'p-007', variantId: null, quantity: 1 },
    { productId: 'p-011', variantId: null, quantity: 3 },
  ],
  updatedAt: 0,
}

export const Empty: Jogak = { name: 'Empty', args: { cart: empty, compact: false } }
export const NeedsShipping: Jogak = { name: 'NeedsShipping', args: { cart: small } }
export const FreeShipping: Jogak = { name: 'FreeShipping', args: { cart: large } }
export const Mixed: Jogak = { name: 'Mixed', args: { cart: mixed } }
