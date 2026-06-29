'use client'

import type { ReactElement } from 'react'
import type { Product } from '@jogak-shop/shared'
import { ProductCard } from '../molecules/ProductCard.tsx'

export interface ProductGridProps {
  readonly products: readonly Product[]
  readonly emptyMessage?: string
  readonly onProductClick?: (product: Product) => void
  readonly onQuickAdd?: (product: Product) => void
  readonly columns?: 2 | 3 | 4
}

const columnsClass = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}

/**
 * ProductCard를 grid로 배치. responsive columns.
 * 빈 상태 메시지 슬롯.
 */
export function ProductGrid({
  products,
  emptyMessage = '상품이 없습니다.',
  onProductClick,
  onQuickAdd,
  columns = 4,
}: ProductGridProps): ReactElement {
  if (products.length === 0) {
    return (
      <div className="text-center text-ink-400 py-12 border border-dashed border-ink-200 rounded-md">
        {emptyMessage}
      </div>
    )
  }
  return (
    <div className={`grid gap-4 ${columnsClass[columns]}`}>
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          layout="grid"
          onClick={onProductClick}
          onQuickAdd={onQuickAdd}
        />
      ))}
    </div>
  )
}