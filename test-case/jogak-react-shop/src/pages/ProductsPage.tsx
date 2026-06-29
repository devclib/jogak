import { useMemo, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { CategorySlug, Product } from '@jogak-shop/shared'
import { categories, products } from '@jogak-shop/shared'
import { FilterSidebar, type SortKey } from '../components/organisms/FilterSidebar.tsx'
import { ProductGrid } from '../components/organisms/ProductGrid.tsx'
import { cartStore } from '../lib/cart-store.ts'

function sortProducts(list: readonly Product[], sort: SortKey): readonly Product[] {
  const copy = [...list]
  switch (sort) {
    case 'price-asc': return copy.sort((a, b) => a.priceCents - b.priceCents)
    case 'price-desc': return copy.sort((a, b) => b.priceCents - a.priceCents)
    case 'newest': return copy.sort((a, b) => (b.badge === 'new' ? 1 : 0) - (a.badge === 'new' ? 1 : 0))
    case 'rating':
    default:
      return copy.sort((a, b) => b.rating - a.rating)
  }
}

export function ProductsPage(): ReactElement {
  const params = useParams<{ slug?: CategorySlug }>()
  const navigate = useNavigate()
  const [priceRange, setPriceRange] = useState<readonly [number, number]>([0, 400])
  const [sort, setSort] = useState<SortKey>('rating')
  const [onlyInStock, setOnlyInStock] = useState(false)
  const selectedCategory: CategorySlug | 'all' = params.slug ?? 'all'

  const filtered = useMemo(() => {
    let list = products as readonly Product[]
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory)
    }
    const [lo, hi] = priceRange
    list = list.filter((p) => p.priceCents / 100 >= lo && p.priceCents / 100 <= hi)
    if (onlyInStock) list = list.filter((p) => p.stock > 0)
    return sortProducts(list, sort)
  }, [selectedCategory, priceRange, sort, onlyInStock])

  const categoryMeta = selectedCategory === 'all'
    ? { name: '전체 상품', description: '모든 카테고리.' }
    : categories.find((c) => c.slug === selectedCategory) ?? { name: '', description: '' }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-3">
        <FilterSidebar
          selectedCategory={selectedCategory}
          onCategoryChange={(c) => navigate(c === 'all' ? '/' : `/category/${c}`)}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          sort={sort}
          onSortChange={setSort}
          onlyInStock={onlyInStock}
          onOnlyInStockChange={setOnlyInStock}
        />
      </div>
      <div className="col-span-12 lg:col-span-9 space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-ink-900">{categoryMeta.name}</h1>
          <p className="text-sm text-ink-600 mt-1">{categoryMeta.description} · {filtered.length}개</p>
        </header>
        <ProductGrid
          products={filtered}
          onProductClick={(p) => navigate(`/product/${p.slug}`)}
          onQuickAdd={(p) => cartStore.add(p.id, p.variants[0]?.id ?? null, 1)}
        />
      </div>
    </div>
  )
}
