<script lang="ts">
  import { navigate } from 'svelte-routing'
  import type { CategorySlug, Product } from '@jogak-shop/shared'
  import { categories, products } from '@jogak-shop/shared'
  import FilterSidebar, { type SortKey } from '../components/organisms/FilterSidebar.svelte'
  import ProductGrid from '../components/organisms/ProductGrid.svelte'
  import { cart } from '../lib/cart-store.svelte'

  let { slug }: { slug?: string } = $props()

  let priceRange = $state<readonly [number, number]>([0, 400])
  let sort = $state<SortKey>('rating')
  let onlyInStock = $state(false)

  let selectedCategory = $derived<CategorySlug | 'all'>((slug as CategorySlug | undefined) ?? 'all')

  function sortList(list: readonly Product[]): readonly Product[] {
    const copy = [...list]
    switch (sort) {
      case 'price-asc': return copy.sort((a, b) => a.priceCents - b.priceCents)
      case 'price-desc': return copy.sort((a, b) => b.priceCents - a.priceCents)
      case 'newest': return copy.sort((a, b) => (b.badge === 'new' ? 1 : 0) - (a.badge === 'new' ? 1 : 0))
      default: return copy.sort((a, b) => b.rating - a.rating)
    }
  }

  let filtered = $derived.by(() => {
    let list = products as readonly Product[]
    if (selectedCategory !== 'all') list = list.filter((p) => p.category === selectedCategory)
    const [lo, hi] = priceRange
    list = list.filter((p) => p.priceCents / 100 >= lo && p.priceCents / 100 <= hi)
    if (onlyInStock) list = list.filter((p) => p.stock > 0)
    return sortList(list)
  })

  let categoryMeta = $derived(
    selectedCategory === 'all'
      ? { name: '전체 상품', description: '모든 카테고리.' }
      : categories.find((c) => c.slug === selectedCategory) ?? { name: '', description: '' },
  )
</script>

<div class="grid grid-cols-12 gap-6">
  <div class="col-span-12 lg:col-span-3">
    <FilterSidebar
      {selectedCategory}
      {priceRange}
      {sort}
      {onlyInStock}
      oncategorychange={(c) => navigate(c === 'all' ? '/' : `/category/${c}`)}
      onpricerangechange={(r) => (priceRange = r)}
      onsortchange={(s) => (sort = s)}
      ononlyinstockchange={(v) => (onlyInStock = v)}
    />
  </div>
  <div class="col-span-12 lg:col-span-9 space-y-4">
    <header>
      <h1 class="text-2xl font-bold text-ink-900">{categoryMeta.name}</h1>
      <p class="text-sm text-ink-600 mt-1">{categoryMeta.description} · {filtered.length}개</p>
    </header>
    <ProductGrid
      products={filtered}
      onproductclick={(p) => navigate(`/product/${p.slug}`)}
      onquickadd={(p) => cart.add(p.id, p.variants[0]?.id ?? null, 1)}
    />
  </div>
</div>
