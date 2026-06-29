// Shop domain types — framework-agnostic.

export type Currency = 'USD' | 'KRW' | 'EUR'

export type CategorySlug = 'apparel' | 'tech' | 'home' | 'beauty' | 'sports'

export interface Category {
  readonly slug: CategorySlug
  readonly name: string
  readonly description: string
}

export interface ProductVariant {
  readonly id: string
  readonly label: string
  readonly priceDelta: number
  readonly stock: number
}

export interface Product {
  readonly id: string
  readonly slug: string
  readonly category: CategorySlug
  readonly name: string
  readonly summary: string
  readonly description: string
  readonly priceCents: number
  readonly currency: Currency
  readonly rating: number
  readonly reviewCount: number
  readonly stock: number
  readonly imageColor: string
  readonly tags: readonly string[]
  readonly variants: readonly ProductVariant[]
  readonly badge?: 'new' | 'best' | 'sale' | 'low-stock'
  readonly discountPercent?: number
}

export interface CartLine {
  readonly productId: string
  readonly variantId: string | null
  readonly quantity: number
}

export interface Cart {
  readonly lines: readonly CartLine[]
  readonly updatedAt: number
}

export interface Address {
  readonly recipient: string
  readonly line1: string
  readonly line2: string
  readonly city: string
  readonly postalCode: string
  readonly country: string
  readonly phone: string
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  readonly id: string
  readonly placedAt: number
  readonly status: OrderStatus
  readonly lines: readonly CartLine[]
  readonly subtotalCents: number
  readonly shippingCents: number
  readonly taxCents: number
  readonly totalCents: number
  readonly currency: Currency
  readonly address: Address
}

export interface Review {
  readonly id: string
  readonly productId: string
  readonly author: string
  readonly rating: number
  readonly title: string
  readonly body: string
  readonly createdAt: number
  readonly helpfulCount: number
}
