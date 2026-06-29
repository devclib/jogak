import type { ReactElement } from 'react'
import type { Jogak, JogakMeta } from '@jogak/core'
import { products } from '@jogak-shop/shared'
import { ProductGrid } from './ProductGrid'

/**
 * jogak ts-morph는 entry args에서 inline literal만 정적 추출한다. import된 array를
 * `args: { products }` 같이 전달하면 chrome scope에 빈 args만 등록되어 iframe scope의
 * 컴포넌트에 props가 undefined로 도달한다. 우회 — wrapper가 primitive args(kind)만
 * 받고 내부에서 array를 결정한다.
 */
function ProductGridShowcase({
  kind = 'all',
  columns = 4,
  emptyMessage,
}: {
  kind?: 'all' | 'apparel' | 'tech' | 'beauty' | 'sports' | 'empty'
  columns?: 2 | 3 | 4
  emptyMessage?: string
}): ReactElement {
  const filtered =
    kind === 'all'
      ? products
      : kind === 'empty'
        ? []
        : products.filter((p) => p.category === kind)
  return (
    <ProductGrid
      products={filtered}
      columns={columns}
      emptyMessage={emptyMessage}
    />
  )
}

const meta = {
  title: 'Organisms/ProductGrid',
  component: ProductGridShowcase,
  argTypes: {
    kind: {
      control: 'select',
      options: ['all', 'apparel', 'tech', 'beauty', 'sports', 'empty'],
      description: '필터 — 카테고리 또는 빈 상태',
    },
    columns: { control: 'select', options: [2, 3, 4] },
    emptyMessage: { control: 'text', description: '상품이 없을 때 메시지' },
  },
} satisfies JogakMeta

export default meta

export const FourColumns: Jogak = { name: 'FourColumns', args: { kind: 'all', columns: 4 } }
export const ThreeColumnsApparel: Jogak = { name: 'ThreeColumnsApparel', args: { kind: 'apparel', columns: 3 } }
export const TwoColumnsTech: Jogak = { name: 'TwoColumnsTech', args: { kind: 'tech', columns: 2 } }
export const Empty: Jogak = { name: 'Empty', args: { kind: 'empty', columns: 3, emptyMessage: '검색 결과 없음.' } }
