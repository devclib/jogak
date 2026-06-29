'use client'

import type { ReactElement } from 'react'
import type { Product } from '@jogak-shop/shared'
import { effectivePriceCents } from '@jogak-shop/shared'
import { Badge } from '../atoms/Badge.tsx'
import { PriceTag } from '../atoms/PriceTag.tsx'
import { RatingStars } from '../atoms/RatingStars.tsx'
import { ProductImage } from '../atoms/ProductImage.tsx'

export type ProductCardLayout = 'grid' | 'horizontal'

export interface ProductCardProps {
  readonly product: Product
  readonly layout?: ProductCardLayout
  readonly onClick?: (product: Product) => void
  readonly onQuickAdd?: (product: Product) => void
}

const badgeToneMap = {
  new: 'brand',
  best: 'accent',
  sale: 'danger',
  'low-stock': 'success',
} as const

const badgeLabel = {
  new: 'NEW',
  best: 'BEST',
  sale: 'SALE',
  'low-stock': 'LOW STOCK',
} as const

/**
 * 그리드/수평 두 레이아웃 지원.
 * onClick으로 detail 페이지 이동, onQuickAdd로 즉시 장바구니.
 */
export function ProductCard({
  product,
  layout = 'grid',
  onClick,
  onQuickAdd,
}: ProductCardProps): ReactElement {
  const effective = effectivePriceCents(product)
  const wasDiscounted = product.discountPercent && product.discountPercent > 0
  const Container = layout === 'grid' ? 'div' : 'div'
  return (
    <Container
      className={`group bg-white rounded-lg border border-ink-100 overflow-hidden hover:shadow-md transition-shadow ${layout === 'horizontal' ? 'flex' : ''}`}
    >
      <button
        type="button"
        onClick={() => onClick?.(product)}
        className={`text-left ${layout === 'horizontal' ? 'w-32 shrink-0' : 'w-full'}`}
      >
        <ProductImage
          color={product.imageColor}
          label={product.name}
          aspect={layout === 'horizontal' ? 'square' : 'landscape'}
          rounded="none"
        />
      </button>
      <div className={`p-3 flex flex-col gap-2 ${layout === 'horizontal' ? 'flex-1' : ''}`}>
        <div className="flex items-center gap-1 flex-wrap">
          {product.badge ? (
            <Badge tone={badgeToneMap[product.badge]}>{badgeLabel[product.badge]}</Badge>
          ) : null}
          {product.tags.slice(0, 2).map((t) => (
            <Badge key={t} tone="neutral" outline>
              {t}
            </Badge>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onClick?.(product)}
          className="text-left font-medium text-ink-900 hover:text-brand-600 transition-colors leading-snug"
        >
          {product.name}
        </button>
        {layout === 'horizontal' ? (
          <p className="text-xs text-ink-600 line-clamp-2">{product.summary}</p>
        ) : null}
        <RatingStars value={product.rating} reviewCount={product.reviewCount} />
        <div className="mt-auto flex items-center justify-between">
          <PriceTag
            cents={effective}
            originalCents={wasDiscounted ? product.priceCents : undefined}
            currency={product.currency}
            size="md"
          />
          {onQuickAdd ? (
            <button
              type="button"
              onClick={() => onQuickAdd(product)}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              + 담기
            </button>
          ) : null}
        </div>
      </div>
    </Container>
  )
}