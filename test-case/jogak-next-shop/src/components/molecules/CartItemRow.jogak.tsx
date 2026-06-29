import { useState, type ReactElement } from 'react'
import type { Jogak, JogakMeta } from '@jogak/core'
import { products } from '@jogak-shop/shared'
import { CartItemRow } from './CartItemRow'

function CartItemRowShowcase({
  productId = 'p-001',
  initial = 1,
}: {
  productId?: string
  initial?: number
}): ReactElement {
  const [qty, setQty] = useState(initial)
  const [removed, setRemoved] = useState(false)
  const product = products.find((p) => p.id === productId) ?? products[0]
  if (!product) return <p>no product</p>
  if (removed) return <p className="text-sm text-ink-400 p-4">(삭제됨)</p>
  const variantId = product.variants[0]?.id ?? null
  return (
    <div className="max-w-2xl">
      <CartItemRow
        line={{ productId: product.id, variantId, quantity: qty }}
        product={product}
        onQuantityChange={(_, __, n) => setQty(n)}
        onRemove={() => setRemoved(true)}
      />
    </div>
  )
}

const meta = {
  title: 'Molecules/CartItemRow',
  component: CartItemRowShowcase,
  argTypes: {
    productId: {
      control: 'select',
      options: products.map((p) => p.id),
      description: '카탈로그에서 선택',
    },
    initial: { control: 'number', description: '초기 수량' },
  },
} satisfies JogakMeta

export default meta

export const SingleQty: Jogak = { name: 'SingleQty', args: { productId: 'p-001', initial: 1 } }
export const ManyQty: Jogak = { name: 'ManyQty', args: { productId: 'p-005', initial: 5 } }
export const Discounted: Jogak = { name: 'Discounted', args: { productId: 'p-011', initial: 2 } }
