// Mock payment + order ID. DB 없음 — localStorage/sessionStorage 위임.

import type { Address, Cart, Order } from './types'
import { products } from './data'
import { effectivePriceCents } from './format'
import {
  SHIPPING_FEE_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  TAX_RATE,
} from './data'

export function calcSubtotalCents(cart: Cart): number {
  let total = 0
  for (const line of cart.lines) {
    const p = products.find((pp) => pp.id === line.productId)
    if (!p) continue
    total += effectivePriceCents(p, line.variantId) * line.quantity
  }
  return total
}

export function calcShippingCents(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS
}

export function calcTaxCents(subtotalCents: number): number {
  return Math.round(subtotalCents * TAX_RATE)
}

export function calcTotalCents(cart: Cart): {
  subtotalCents: number
  shippingCents: number
  taxCents: number
  totalCents: number
} {
  const subtotalCents = calcSubtotalCents(cart)
  const shippingCents = calcShippingCents(subtotalCents)
  const taxCents = calcTaxCents(subtotalCents)
  return {
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
  }
}

let orderSeq = 1000

/**
 * Mock 결제 — 항상 성공 + 80ms 지연. 실제 PG/DB 호출 없음.
 * order ID는 in-memory 카운터. 페이지 reload 시 1000부터 다시.
 */
export async function mockPay(cart: Cart, address: Address): Promise<Order> {
  await new Promise((resolve) => setTimeout(resolve, 80))
  const totals = calcTotalCents(cart)
  orderSeq += 1
  return {
    id: `ORD-${orderSeq}`,
    placedAt: 0,
    status: 'paid',
    lines: cart.lines,
    subtotalCents: totals.subtotalCents,
    shippingCents: totals.shippingCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
    currency: 'USD',
    address,
  }
}
