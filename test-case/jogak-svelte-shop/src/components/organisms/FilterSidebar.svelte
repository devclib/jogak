<script lang="ts" module>
  export type SortKey = 'rating' | 'price-asc' | 'price-desc' | 'newest'
</script>

<script lang="ts">
  import type { CategorySlug } from '@jogak-shop/shared'
  import { categories } from '@jogak-shop/shared'
  import Badge from '../atoms/Badge.svelte'

  let {
    selectedCategory,
    priceRange,
    sort,
    onlyInStock,
    oncategorychange,
    onpricerangechange,
    onsortchange,
    ononlyinstockchange,
  }: {
    selectedCategory: CategorySlug | 'all'
    priceRange: readonly [number, number]
    sort: SortKey
    onlyInStock: boolean
    oncategorychange: (next: CategorySlug | 'all') => void
    onpricerangechange: (next: readonly [number, number]) => void
    onsortchange: (next: SortKey) => void
    ononlyinstockchange: (next: boolean) => void
  } = $props()

  const sortOptions: readonly { key: SortKey; label: string }[] = [
    { key: 'rating', label: '평점 높은순' },
    { key: 'price-asc', label: '낮은 가격순' },
    { key: 'price-desc', label: '높은 가격순' },
    { key: 'newest', label: 'NEW 우선' },
  ]
</script>

<aside class="space-y-6 text-sm">
  <section>
    <h3 class="font-semibold text-ink-900 mb-2">카테고리</h3>
    <ul class="space-y-1">
      <li>
        <button
          type="button"
          class="w-full text-left px-2 py-1 rounded {selectedCategory === 'all' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}"
          onclick={() => oncategorychange('all')}
        >전체</button>
      </li>
      {#each categories as c}
        <li>
          <button
            type="button"
            class="w-full text-left px-2 py-1 rounded {selectedCategory === c.slug ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}"
            onclick={() => oncategorychange(c.slug)}
          >{c.name}</button>
        </li>
      {/each}
    </ul>
  </section>
  <section>
    <h3 class="font-semibold text-ink-900 mb-2">가격 (USD)</h3>
    <div class="flex items-center gap-2">
      <input
        type="number"
        value={priceRange[0]}
        min={0}
        class="w-20 h-8 px-2 rounded border border-ink-200 text-center"
        oninput={(e) => onpricerangechange([Number((e.target as HTMLInputElement).value) || 0, priceRange[1]])}
      />
      <span class="text-ink-400">~</span>
      <input
        type="number"
        value={priceRange[1]}
        min={0}
        class="w-20 h-8 px-2 rounded border border-ink-200 text-center"
        oninput={(e) => onpricerangechange([priceRange[0], Number((e.target as HTMLInputElement).value) || 0])}
      />
    </div>
  </section>
  <section>
    <h3 class="font-semibold text-ink-900 mb-2">정렬</h3>
    <select
      value={sort}
      class="w-full h-9 px-2 rounded border border-ink-200 bg-white"
      onchange={(e) => onsortchange((e.target as HTMLSelectElement).value as SortKey)}
    >
      {#each sortOptions as o}<option value={o.key}>{o.label}</option>{/each}
    </select>
  </section>
  <section>
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={onlyInStock}
        class="accent-brand-500"
        onchange={(e) => ononlyinstockchange((e.target as HTMLInputElement).checked)}
      />
      <span class="text-ink-600">재고 있음만</span>
      {#if onlyInStock}<Badge tone="success" label="ON" />{/if}
    </label>
  </section>
</aside>
