import type { ReactElement } from 'react'
import type { Cart } from '@jogak-shop/shared'
import { calcTotalCents, formatPrice, FREE_SHIPPING_THRESHOLD_CENTS } from '@jogak-shop/shared'
import { Button } from '../atoms/Button.tsx'

export interface CartSummaryProps {
  readonly cart: Cart
  readonly onCheckout?: () => void
  readonly compact?: boolean
}

/**
 * 소계 / 배송비 / 세금 / 총합 + 무료배송 진행률 + 결제 버튼.
 */
export function CartSummary({ cart, onCheckout, compact = false }: CartSummaryProps): ReactElement {
  const totals = calcTotalCents(cart)
  const empty = cart.lines.length === 0
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - totals.subtotalCents)
  const freeShippingProgress = Math.min(100, (totals.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100)
  return (
    <aside className={`bg-white rounded-lg border border-ink-100 p-5 space-y-4 ${compact ? '' : 'sticky top-4'}`}>
      <h3 className="font-semibold text-ink-900">주문 요약</h3>
      {remainingForFreeShipping > 0 && !empty ? (
        <div className="text-xs space-y-1">
          <p className="text-ink-600">
            <span className="font-medium text-brand-600">{formatPrice(remainingForFreeShipping)}</span>
            {' '}더 담으면 무료배송
          </p>
          <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${freeShippingProgress}%` }} />
          </div>
        </div>
      ) : !empty ? (
        <p className="text-xs text-success-500 font-medium">✓ 무료배송 적용</p>
      ) : null}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-600">소계 ({cart.lines.length}개)</dt>
          <dd className="font-medium tabular-nums">{formatPrice(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-600">배송비</dt>
          <dd className="font-medium tabular-nums">
            {totals.shippingCents === 0 ? '무료' : formatPrice(totals.shippingCents)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-600">세금 (10%)</dt>
          <dd className="font-medium tabular-nums">{formatPrice(totals.taxCents)}</dd>
        </div>
        <div className="flex justify-between pt-2 border-t border-ink-100">
          <dt className="font-semibold text-ink-900">합계</dt>
          <dd className="text-xl font-bold tabular-nums">{formatPrice(totals.totalCents)}</dd>
        </div>
      </dl>
      {onCheckout ? (
        <Button onClick={onCheckout} disabled={empty} fullWidth size="lg">
          {empty ? '장바구니가 비어 있습니다' : '결제하기'}
        </Button>
      ) : null}
    </aside>
  )
}
