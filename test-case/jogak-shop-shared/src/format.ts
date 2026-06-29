// Currency formatting + rating helpers. framework-agnostic.

import type { Currency, Product } from './types.js'

export function formatPrice(cents: number, currency: Currency = 'USD'): string {
  const value = cents / 100
  if (currency === 'KRW') return `₩${Math.round(value * 1300).toLocaleString('ko-KR')}`
  if (currency === 'EUR') return `€${value.toFixed(2)}`
  return `$${value.toFixed(2)}`
}

export function effectivePriceCents(product: Product, variantId: string | null = null): number {
  const base = product.priceCents
  const variantDelta = variantId
    ? product.variants.find((v) => v.id === variantId)?.priceDelta ?? 0
    : 0
  const subtotal = base + variantDelta
  if (product.discountPercent && product.discountPercent > 0) {
    return Math.round(subtotal * (1 - product.discountPercent / 100))
  }
  return subtotal
}

export function ratingStars(rating: number): { full: number; half: number; empty: number } {
  const clamped = Math.max(0, Math.min(5, rating))
  const full = Math.floor(clamped)
  const half = clamped - full >= 0.5 ? 1 : 0
  return { full, half, empty: 5 - full - half }
}

export function pluralKor(count: number, singular: string, plural?: string): string {
  return `${count.toLocaleString('ko-KR')} ${plural ?? singular}`
}
