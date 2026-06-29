'use client'

import { useMemo, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { products, reviews, effectivePriceCents } from '@jogak-shop/shared'
import { Badge } from '../../../components/atoms/Badge.tsx'
import { Button } from '../../../components/atoms/Button.tsx'
import { PriceTag } from '../../../components/atoms/PriceTag.tsx'
import { ProductImage } from '../../../components/atoms/ProductImage.tsx'
import { QuantityStepper } from '../../../components/atoms/QuantityStepper.tsx'
import { RatingStars } from '../../../components/atoms/RatingStars.tsx'
import { ReviewItem } from '../../../components/molecules/ReviewItem.tsx'
import { cartStore } from '../../../lib/cart-store.ts'

export function ProductDetailClient({ slug }: { slug: string }): ReactElement {
  const router = useRouter()
  const product = useMemo(() => products.find((p) => p.slug === slug), [slug])
  const [variantId, setVariantId] = useState<string | null>(product?.variants[0]?.id ?? null)
  const [quantity, setQuantity] = useState(1)

  if (!product) {
    return (
      <div className="text-center py-12 space-y-4">
        <h1 className="text-2xl font-semibold">상품을 찾을 수 없습니다</h1>
        <Button onClick={() => router.push('/')}>목록으로</Button>
      </div>
    )
  }

  const effective = effectivePriceCents(product, variantId)
  const productReviews = reviews.filter((r) => r.productId === product.id)

  return (
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12 md:col-span-6">
        <ProductImage color={product.imageColor} label={product.name} aspect="square" rounded="lg" />
      </div>
      <div className="col-span-12 md:col-span-6 space-y-5">
        <div className="flex items-center gap-2">
          {product.badge ? <Badge tone="accent">{product.badge.toUpperCase()}</Badge> : null}
          {product.tags.map((t) => <Badge key={t} outline tone="neutral">{t}</Badge>)}
        </div>
        <header>
          <h1 className="text-3xl font-bold text-ink-900">{product.name}</h1>
          <p className="mt-2 text-ink-600">{product.summary}</p>
        </header>
        <RatingStars value={product.rating} reviewCount={product.reviewCount} size="md" showValue />
        <PriceTag
          cents={effective}
          originalCents={product.discountPercent ? product.priceCents : undefined}
          currency={product.currency}
          size="lg"
        />
        <p className="text-sm text-ink-600 leading-relaxed">{product.description}</p>

        {product.variants.length > 0 ? (
          <div className="space-y-2">
            <span className="text-sm font-medium text-ink-900">옵션</span>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  disabled={v.stock === 0}
                  className={`h-10 px-4 rounded-md border text-sm transition-colors ${
                    variantId === v.id
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                      : 'border-ink-200 text-ink-900 hover:border-ink-400'
                  } ${v.stock === 0 ? 'opacity-50 line-through cursor-not-allowed' : ''}`}
                >
                  {v.label}
                  {v.priceDelta > 0 ? <span className="ml-1 text-xs text-ink-400">+${(v.priceDelta / 100).toFixed(2)}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-4 pt-2">
          <QuantityStepper value={quantity} min={1} max={product.stock} onChange={setQuantity} size="md" />
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              cartStore.add(product.id, variantId, quantity)
              router.push('/cart')
            }}
          >
            장바구니 담기
          </Button>
        </div>
      </div>

      <section className="col-span-12 mt-8">
        <h2 className="text-xl font-bold text-ink-900 mb-3">리뷰 ({productReviews.length})</h2>
        {productReviews.length === 0 ? (
          <p className="text-sm text-ink-400 py-6">아직 리뷰가 없습니다.</p>
        ) : (
          <div>
            {productReviews.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
