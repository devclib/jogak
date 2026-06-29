'use client'

import type { ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { products } from '@jogak-shop/shared'
import { CartItemRow } from '../../components/molecules/CartItemRow.tsx'
import { CartSummary } from '../../components/organisms/CartSummary.tsx'
import { Button } from '../../components/atoms/Button.tsx'
import { cartStore, useCart } from '../../lib/cart-store.ts'

export default function CartPage(): ReactElement {
  const cart = useCart()
  const router = useRouter()
  const empty = cart.lines.length === 0

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-3">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink-900">장바구니</h1>
          {!empty ? (
            <button
              type="button"
              onClick={() => cartStore.clear()}
              className="text-sm text-ink-400 hover:text-danger-500"
            >
              전체 비우기
            </button>
          ) : null}
        </header>
        {empty ? (
          <div className="text-center py-16 space-y-4 bg-white border border-dashed border-ink-200 rounded-lg">
            <p className="text-ink-400">장바구니가 비어 있습니다.</p>
            <Button onClick={() => router.push('/')} variant="secondary">쇼핑 계속하기</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.lines.map((line) => {
              const product = products.find((p) => p.id === line.productId)
              if (!product) return null
              return (
                <CartItemRow
                  key={`${line.productId}:${line.variantId ?? '_'}`}
                  line={line}
                  product={product}
                  onQuantityChange={cartStore.setQuantity}
                  onRemove={cartStore.remove}
                />
              )
            })}
          </div>
        )}
      </div>
      <div className="col-span-12 lg:col-span-4">
        <CartSummary cart={cart} onCheckout={() => router.push('/checkout')} />
      </div>
    </div>
  )
}
