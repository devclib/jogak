'use client'

import type { ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { products } from '@jogak-shop/shared'
import { Badge } from '../../components/atoms/Badge.tsx'
import { ProductCard } from '../../components/molecules/ProductCard.tsx'

const mockOrders = [
  { id: 'ORD-1024', placedAt: Date.UTC(2026, 4, 28), status: '배송 완료', totalCents: 28900 },
  { id: 'ORD-1015', placedAt: Date.UTC(2026, 4, 14), status: '취소', totalCents: 4200 },
  { id: 'ORD-1009', placedAt: Date.UTC(2026, 3, 30), status: '배송 완료', totalCents: 14900 },
] as const

export default function AccountPage(): ReactElement {
  const wishlist = products.filter((p) => p.badge === 'best').slice(0, 4)
  const router = useRouter()
  return (
    <div className="space-y-8">
      <header className="bg-white rounded-lg border border-ink-100 p-6 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xl font-bold">U</div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-ink-900">Guest User</h1>
          <p className="text-sm text-ink-600">test@jogak.dev · 멤버 등급: Silver</p>
        </div>
        <Badge tone="brand">VERIFIED</Badge>
      </header>

      <section className="bg-white rounded-lg border border-ink-100">
        <div className="p-5 border-b border-ink-100">
          <h2 className="font-semibold text-ink-900">주문 내역 (mock)</h2>
          <p className="text-xs text-ink-400 mt-1">서버 호출 없음 — 정적 데이터.</p>
        </div>
        <ul className="divide-y divide-ink-100">
          {mockOrders.map((o) => (
            <li key={o.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{o.id}</p>
                <time className="text-xs text-ink-400">{new Date(o.placedAt).toLocaleDateString('ko-KR')}</time>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === '취소' ? 'bg-red-50 text-danger-500' : 'bg-green-50 text-success-500'}`}>
                {o.status}
              </span>
              <span className="font-semibold tabular-nums">${(o.totalCents / 100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-ink-900 mb-3">위시리스트</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {wishlist.map((p) => (
            <ProductCard key={p.id} product={p} onClick={() => router.push(`/product/${p.slug}`)} />
          ))}
        </div>
      </section>
    </div>
  )
}
