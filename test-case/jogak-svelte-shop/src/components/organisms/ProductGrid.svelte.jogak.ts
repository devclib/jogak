import type { Jogak, JogakMeta } from '@jogak/core'
import ProductGridShowcase from './ProductGrid.showcase.svelte'

const meta = {
  title: 'Organisms/ProductGrid',
  component: ProductGridShowcase,
  framework: 'svelte',
  argTypes: {
    kind: { control: 'select', options: ['all', 'apparel', 'tech', 'beauty', 'sports', 'empty'] },
    columns: { control: 'select', options: [2, 3, 4] },
    emptyMessage: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const FourColumns: Jogak = { name: 'FourColumns', args: { kind: 'all', columns: 4 } }
export const ThreeColumnsApparel: Jogak = { name: 'ThreeColumnsApparel', args: { kind: 'apparel', columns: 3 } }
export const TwoColumnsTech: Jogak = { name: 'TwoColumnsTech', args: { kind: 'tech', columns: 2 } }
export const Empty: Jogak = { name: 'Empty', args: { kind: 'empty', columns: 3, emptyMessage: '검색 결과 없음.' } }
