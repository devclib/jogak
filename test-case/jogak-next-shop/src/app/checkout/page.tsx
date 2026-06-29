'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import type { Address, Order } from '@jogak-shop/shared'
import { mockPay } from '@jogak-shop/shared'
import { AddressForm } from '../../components/molecules/AddressForm.tsx'
import { CartSummary } from '../../components/organisms/CartSummary.tsx'
import { Button } from '../../components/atoms/Button.tsx'
import { cartStore, useCart } from '../../lib/cart-store.ts'

const blankAddress: Address = {
  recipient: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: 'KR',
  phone: '',
}

export default function CheckoutPage(): ReactElement {
  const cart = useCart()
  const router = useRouter()
  const [address, setAddress] = useState<Address>(blankAddress)
  const [placing, setPlacing] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)

  const canPlace = cart.lines.length > 0 && address.recipient !== '' && address.line1 !== '' && address.phone !== ''

  const place = async (): Promise<void> => {
    if (!canPlace) return
    setPlacing(true)
    const o = await mockPay(cart, address)
    setOrder(o)
    cartStore.clear()
    setPlacing(false)
  }

  if (order) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-lg border border-ink-100 p-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold">주문이 완료됐습니다</h1>
        <p className="text-ink-600">주문 번호: <span className="font-semibold text-ink-900">{order.id}</span></p>
        <p className="text-xs text-ink-400">mock 결제 — 실제 결제 게이트웨이 호출 없음. 데이터 저장은 in-memory.</p>
        <Button onClick={() => router.push('/')} fullWidth>쇼핑 계속하기</Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <h1 className="text-2xl font-bold text-ink-900">결제</h1>
        <section className="bg-white rounded-lg border border-ink-100 p-5 space-y-3">
          <h2 className="font-semibold text-ink-900">배송지</h2>
          <AddressForm value={address} onChange={setAddress} disabled={placing} />
        </section>
        <section className="bg-white rounded-lg border border-ink-100 p-5 space-y-3">
          <h2 className="font-semibold text-ink-900">결제 수단</h2>
          <p className="text-sm text-ink-600">Mock — 결제 게이트웨이 호출 없이 항상 성공.</p>
          <Button onClick={() => { void place() }} disabled={!canPlace || placing} loading={placing} size="lg" fullWidth>
            주문 확정
          </Button>
        </section>
      </div>
      <div className="col-span-12 lg:col-span-4">
        <CartSummary cart={cart} compact />
      </div>
    </div>
  )
}
