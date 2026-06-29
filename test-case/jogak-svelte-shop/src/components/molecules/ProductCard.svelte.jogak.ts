import type { Jogak, JogakMeta } from '@jogak/core'
import { products } from '@jogak-shop/shared'
import ProductCardShowcase from './ProductCard.showcase.svelte'

const meta = {
  title: 'Molecules/ProductCard',
  component: ProductCardShowcase,
  framework: 'svelte',
  argTypes: {
    productId: { control: 'select', options: products.map((p) => p.id) },
    layout: { control: 'select', options: ['grid', 'horizontal'] },
  },
} satisfies JogakMeta

export default meta

export const GridBest: Jogak = { name: 'GridBest', args: { productId: 'p-001', layout: 'grid' } }
export const GridSale: Jogak = { name: 'GridSale', args: { productId: 'p-006', layout: 'grid' } }
export const HorizontalNew: Jogak = { name: 'HorizontalNew', args: { productId: 'p-008', layout: 'horizontal' } }
export const Trail: Jogak = { name: 'Trail', args: { productId: 'p-013', layout: 'grid' } }
