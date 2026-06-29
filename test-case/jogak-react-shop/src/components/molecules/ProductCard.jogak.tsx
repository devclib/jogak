import type { Jogak, JogakMeta } from '@jogak/core'
import { products } from '@jogak-shop/shared'
import { ProductCard } from './ProductCard'

const meta = {
  title: 'Molecules/ProductCard',
  component: ProductCard,
  argTypes: {
    product: { control: 'select', options: products.map((p) => p.id), description: '상품 선택' },
    layout: { control: 'select', options: ['grid', 'horizontal'] },
  },
} satisfies JogakMeta

export default meta

export const GridBest: Jogak = { name: 'GridBest', args: { product: products[0], layout: 'grid' } }
export const GridSale: Jogak = { name: 'GridSale', args: { product: products[5], layout: 'grid' } }
export const HorizontalNew: Jogak = { name: 'HorizontalNew', args: { product: products[7], layout: 'horizontal' } }
export const Trail: Jogak = { name: 'Trail', args: { product: products[12], layout: 'grid' } }
