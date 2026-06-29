<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CategorySlug, Product } from '@jogak-shop/shared'
import { categories, products } from '@jogak-shop/shared'
import FilterSidebar, { type SortKey } from '../components/organisms/FilterSidebar.vue'
import ProductGrid from '../components/organisms/ProductGrid.vue'
import { cartStore } from '../lib/cart-store'

const route = useRoute()
const router = useRouter()
const priceRange = ref<readonly [number, number]>([0, 400])
const sort = ref<SortKey>('rating')
const onlyInStock = ref(false)

const selectedCategory = computed<CategorySlug | 'all'>(
  () => (route.params.slug as CategorySlug | undefined) ?? 'all',
)

function sortList(list: readonly Product[]): readonly Product[] {
  const copy = [...list]
  switch (sort.value) {
    case 'price-asc': return copy.sort((a, b) => a.priceCents - b.priceCents)
    case 'price-desc': return copy.sort((a, b) => b.priceCents - a.priceCents)
    case 'newest': return copy.sort((a, b) => (b.badge === 'new' ? 1 : 0) - (a.badge === 'new' ? 1 : 0))
    default: return copy.sort((a, b) => b.rating - a.rating)
  }
}

const filtered = computed(() => {
  let list = products as readonly Product[]
  if (selectedCategory.value !== 'all') {
    list = list.filter((p) => p.category === selectedCategory.value)
  }
  const [lo, hi] = priceRange.value
  list = list.filter((p) => p.priceCents / 100 >= lo && p.priceCents / 100 <= hi)
  if (onlyInStock.value) list = list.filter((p) => p.stock > 0)
  return sortList(list)
})

const categoryMeta = computed(() =>
  selectedCategory.value === 'all'
    ? { name: '전체 상품', description: '모든 카테고리.' }
    : categories.find((c) => c.slug === selectedCategory.value) ?? { name: '', description: '' },
)
</script>

<template>
  <div class="grid grid-cols-12 gap-6">
    <div class="col-span-12 lg:col-span-3">
      <FilterSidebar
        :selected-category="selectedCategory"
        :price-range="priceRange"
        :sort="sort"
        :only-in-stock="onlyInStock"
        @category-change="(c: CategorySlug | 'all') => router.push(c === 'all' ? '/' : `/category/${c}`)"
        @price-range-change="(r: readonly [number, number]) => priceRange = r"
        @sort-change="(s: SortKey) => sort = s"
        @only-in-stock-change="(v: boolean) => onlyInStock = v"
      />
    </div>
    <div class="col-span-12 lg:col-span-9 space-y-4">
      <header>
        <h1 class="text-2xl font-bold text-ink-900">{{ categoryMeta.name }}</h1>
        <p class="text-sm text-ink-600 mt-1">{{ categoryMeta.description }} · {{ filtered.length }}개</p>
      </header>
      <ProductGrid
        :products="filtered"
        @product-click="(p: Product) => router.push(`/product/${p.slug}`)"
        @quick-add="(p: Product) => cartStore.add(p.id, p.variants[0]?.id ?? null, 1)"
      />
    </div>
  </div>
</template>
