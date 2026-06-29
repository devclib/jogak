import { useState, type ReactElement } from 'react'
import type { Jogak, JogakMeta } from '@jogak/core'
import { products, type Product } from '@jogak-shop/shared'
import { CartItemRow } from './CartItemRow'

function CartItemRowShowcase(props: { product: Product; initial?: number; variantId?: string | null }): ReactElement {
  const [qty, setQty] = useState(props.initial ?? 1)
  const [removed, setRemoved] = useState(false)
  const variantId = props.variantId ?? props.product.variants[0]?.id ?? null
  if (removed) return <p className="text-sm text-ink-400 p-4">(삭제됨)</p>
  return (
    <CartItemRow
      line={{ productId: props.product.id, variantId, quantity: qty }}
      product={props.product}
      onQuantityChange={(_, __, n) => setQty(n)}
      onRemove={() => setRemoved(true)}
    />
  )
}

const meta = {
  title: 'Molecules/CartItemRow',
  component: CartItemRowShowcase,
  argTypes: {
    initial: { control: 'number', description: '초기 수량' },
  },
} satisfies JogakMeta

export default meta

export const SingleQty: Jogak = { name: 'SingleQty', args: { product: products[0], initial: 1 } }
export const ManyQty: Jogak = { name: 'ManyQty', args: { product: products[4], initial: 5 } }
export const Discounted: Jogak = { name: 'Discounted', args: { product: products[10], initial: 2 } }
