'use client'

import type { ReactElement } from 'react'
import type { CartLine, Product } from '@jogak-shop/shared'
import { effectivePriceCents, formatPrice } from '@jogak-shop/shared'
import { ProductImage } from '../atoms/ProductImage.tsx'
import { QuantityStepper } from '../atoms/QuantityStepper.tsx'

export interface CartItemRowProps {
  readonly line: CartLine
  readonly product: Product
  readonly onQuantityChange: (productId: string, variantId: string | null, next: number) => void
  readonly onRemove: (productId: string, variantId: string | null) => void
}

/**
 * 장바구니의 한 줄. 썸네일 + 정보 + 수량 stepper + 소계 + 삭제.
 * line + product를 분리 — line은 사용자 상태, product는 카탈로그.
 */
export function CartItemRow({
  line,
  product,
  onQuantityChange,
  onRemove,
}: CartItemRowProps): ReactElement {
  const variant = line.variantId
    ? product.variants.find((v) => v.id === line.variantId)
    : null
  const unitPrice = effectivePriceCents(product, line.variantId)
  const subtotal = unitPrice * line.quantity
  return (
    <div className="flex gap-4 p-4 bg-white rounded-lg border border-ink-100">
      <div className="w-20 shrink-0">
        <ProductImage color={product.imageColor} label={product.name} rounded="md" />
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-ink-900 truncate">{product.name}</h3>
          <button
            type="button"
            onClick={() => onRemove(line.productId, line.variantId)}
            className="text-xs text-ink-400 hover:text-danger-500 shrink-0"
          >
            삭제
          </button>
        </div>
        {variant ? (
          <p className="text-xs text-ink-600">옵션: {variant.label}</p>
        ) : null}
        <p className="text-xs text-ink-400">{formatPrice(unitPrice, product.currency)} × {line.quantity}</p>
        <div className="mt-1 flex items-center justify-between">
          <QuantityStepper
            value={line.quantity}
            min={1}
            max={Math.max(1, product.stock)}
            onChange={(n) => onQuantityChange(line.productId, line.variantId, n)}
            size="sm"
          />
          <span className="text-base font-semibold tabular-nums">
            {formatPrice(subtotal, product.currency)}
          </span>
        </div>
      </div>
    </div>
  )
}