import type { ReactElement } from 'react'
import type { CategorySlug } from '@jogak-shop/shared'
import { categories } from '@jogak-shop/shared'
import { Badge } from '../atoms/Badge.tsx'

export type SortKey = 'rating' | 'price-asc' | 'price-desc' | 'newest'

export interface FilterSidebarProps {
  readonly selectedCategory: CategorySlug | 'all'
  readonly onCategoryChange: (next: CategorySlug | 'all') => void
  readonly priceRange: readonly [number, number]
  readonly onPriceRangeChange: (next: readonly [number, number]) => void
  readonly sort: SortKey
  readonly onSortChange: (next: SortKey) => void
  readonly onlyInStock: boolean
  readonly onOnlyInStockChange: (next: boolean) => void
}

const sortOptions: readonly { key: SortKey; label: string }[] = [
  { key: 'rating', label: '평점 높은순' },
  { key: 'price-asc', label: '낮은 가격순' },
  { key: 'price-desc', label: '높은 가격순' },
  { key: 'newest', label: 'NEW 우선' },
]

/**
 * 카테고리 필터 + 가격 슬라이더 + 정렬 + 재고 필터.
 * 모든 상태는 controlled — 부모가 URL/localStorage 결정.
 */
export function FilterSidebar({
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  sort,
  onSortChange,
  onlyInStock,
  onOnlyInStockChange,
}: FilterSidebarProps): ReactElement {
  return (
    <aside className="space-y-6 text-sm">
      <section>
        <h3 className="font-semibold text-ink-900 mb-2">카테고리</h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onCategoryChange('all')}
              className={`w-full text-left px-2 py-1 rounded ${selectedCategory === 'all' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}`}
            >
              전체
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => onCategoryChange(c.slug)}
                className={`w-full text-left px-2 py-1 rounded ${selectedCategory === c.slug ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}`}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-semibold text-ink-900 mb-2">가격 (USD)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priceRange[0]}
            min={0}
            onChange={(e) => onPriceRangeChange([Number(e.target.value) || 0, priceRange[1]])}
            className="w-20 h-8 px-2 rounded border border-ink-200 text-center"
          />
          <span className="text-ink-400">~</span>
          <input
            type="number"
            value={priceRange[1]}
            min={0}
            onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value) || 0])}
            className="w-20 h-8 px-2 rounded border border-ink-200 text-center"
          />
        </div>
      </section>
      <section>
        <h3 className="font-semibold text-ink-900 mb-2">정렬</h3>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="w-full h-9 px-2 rounded border border-ink-200 bg-white"
        >
          {sortOptions.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </section>
      <section>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => onOnlyInStockChange(e.target.checked)}
            className="accent-brand-500"
          />
          <span className="text-ink-600">재고 있음만</span>
          {onlyInStock ? <Badge tone="success">ON</Badge> : null}
        </label>
      </section>
    </aside>
  )
}
