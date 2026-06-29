import type { Jogak, JogakMeta } from '@jogak/core'
import { products } from '@jogak-shop/shared'
import CartItemRowShowcase from './CartItemRow.showcase.svelte'

const meta = {
  title: 'Molecules/CartItemRow',
  component: CartItemRowShowcase,
  framework: 'svelte',
  argTypes: {
    productId: { control: 'select', options: products.map((p) => p.id) },
    initial: { control: 'number' },
  },
} satisfies JogakMeta

export default meta

export const SingleQty: Jogak = { name: 'SingleQty', args: { productId: 'p-001', initial: 1 } }
export const ManyQty: Jogak = { name: 'ManyQty', args: { productId: 'p-005', initial: 5 } }
export const Discounted: Jogak = { name: 'Discounted', args: { productId: 'p-011', initial: 2 } }
