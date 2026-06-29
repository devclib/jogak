import type { ReactElement } from 'react'
import type { Jogak, JogakMeta } from '@jogak/core'
import { products } from '@jogak-shop/shared'
import { ProductCard } from './ProductCard'

/**
 * wrapper — productId(string)만 받아 인덱스로 product 객체를 찾아 전달.
 * ts-morph 정적 추출 한계 우회.
 */
function ProductCardShowcase({
  productId = 'p-001',
  layout = 'grid',
}: {
  productId?: string
  layout?: 'grid' | 'horizontal'
}): ReactElement {
  const product = products.find((p) => p.id === productId) ?? products[0]
  if (!product) return <p>no product</p>
  // preview 영역이 full-width일 때 grid item 모양 시각 — 실제 shop에선 grid 한 칸을 차지
  return (
    <div className={layout === 'horizontal' ? 'max-w-md' : 'max-w-xs'}>
      <ProductCard product={product} layout={layout} />
    </div>
  )
}

const meta = {
  title: 'Molecules/ProductCard',
  component: ProductCardShowcase,
  argTypes: {
    productId: {
      control: 'select',
      options: products.map((p) => p.id),
      description: '카탈로그에서 선택',
    },
    layout: { control: 'select', options: ['grid', 'horizontal'] },
  },
} satisfies JogakMeta

export default meta

export const GridBest: Jogak = { name: 'GridBest', args: { productId: 'p-001', layout: 'grid' } }
export const GridSale: Jogak = { name: 'GridSale', args: { productId: 'p-006', layout: 'grid' } }
export const HorizontalNew: Jogak = { name: 'HorizontalNew', args: { productId: 'p-008', layout: 'horizontal' } }
export const Trail: Jogak = { name: 'Trail', args: { productId: 'p-013', layout: 'grid' } }
