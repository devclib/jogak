import type { ReactElement } from 'react'
import type { Jogak, JogakMeta } from '@jogak/core'
import type { Cart } from '@jogak-shop/shared'
import { CartSummary } from './CartSummary'

const carts: Record<string, Cart> = {
  empty: { lines: [], updatedAt: 0 },
  small: { lines: [{ productId: 'p-007', variantId: null, quantity: 1 }], updatedAt: 0 },
  large: {
    lines: [
      { productId: 'p-003', variantId: 'v-m', quantity: 1 },
      { productId: 'p-006', variantId: 'v-black', quantity: 1 },
    ],
    updatedAt: 0,
  },
  mixed: {
    lines: [
      { productId: 'p-001', variantId: 'v-m', quantity: 2 },
      { productId: 'p-007', variantId: null, quantity: 1 },
      { productId: 'p-011', variantId: null, quantity: 3 },
    ],
    updatedAt: 0,
  },
}

function CartSummaryShowcase({
  kind = 'mixed',
  compact = false,
}: {
  kind?: 'empty' | 'small' | 'large' | 'mixed'
  compact?: boolean
}): ReactElement {
  const cart = carts[kind] ?? carts.empty!
  // 실 환경에선 grid 사이드바(1/4)에 위치 — preview에서도 그 너비 시뮬레이션
  return (
    <div className="max-w-sm">
      <CartSummary cart={cart} compact={compact} />
    </div>
  )
}

const meta = {
  title: 'Organisms/CartSummary',
  component: CartSummaryShowcase,
  argTypes: {
    kind: {
      control: 'select',
      options: ['empty', 'small', 'large', 'mixed'],
      description: '장바구니 상태 시뮬레이션',
    },
    compact: { control: 'boolean', description: 'sticky 비활성화 + 패딩 축소' },
  },
} satisfies JogakMeta

export default meta

export const Empty: Jogak = { name: 'Empty', args: { kind: 'empty', compact: false } }
export const NeedsShipping: Jogak = { name: 'NeedsShipping', args: { kind: 'small' } }
export const FreeShipping: Jogak = { name: 'FreeShipping', args: { kind: 'large' } }
export const Mixed: Jogak = { name: 'Mixed', args: { kind: 'mixed' } }
