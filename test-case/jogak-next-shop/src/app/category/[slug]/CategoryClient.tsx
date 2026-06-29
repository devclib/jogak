'use client'

import type { CategorySlug } from '@jogak-shop/shared'
import ProductsPage from '../../page.tsx'

export function CategoryClient({ slug }: { slug: string }): React.ReactElement {
  return <ProductsPage selectedCategory={slug as CategorySlug | 'all'} />
}
