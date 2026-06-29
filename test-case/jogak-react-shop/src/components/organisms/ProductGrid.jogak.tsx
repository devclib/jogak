import type { Jogak, JogakMeta } from '@jogak/core'
import { products } from '@jogak-shop/shared'
import { ProductGrid } from './ProductGrid'

const meta = {
  title: 'Organisms/ProductGrid',
  component: ProductGrid,
  argTypes: {
    products: { control: 'select', options: ['all', 'apparel', 'tech', 'empty'], description: '필터링된 상품 셋' },
    columns: { control: 'select', options: [2, 3, 4] },
    emptyMessage: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const FourColumns: Jogak = { name: 'FourColumns', args: { products, columns: 4 } }
export const ThreeColumnsApparel: Jogak = { name: 'ThreeColumnsApparel', args: { products: products.filter((p) => p.category === 'apparel'), columns: 3 } }
export const TwoColumnsTech: Jogak = { name: 'TwoColumnsTech', args: { products: products.filter((p) => p.category === 'tech'), columns: 2 } }
export const Empty: Jogak = { name: 'Empty', args: { products: [], emptyMessage: '검색 결과 없음.', columns: 3 } }
