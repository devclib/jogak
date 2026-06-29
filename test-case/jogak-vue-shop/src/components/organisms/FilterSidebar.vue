<script setup lang="ts">
import type { CategorySlug } from '@jogak-shop/shared'
import { categories } from '@jogak-shop/shared'
import Badge from '../atoms/Badge.vue'

export type SortKey = 'rating' | 'price-asc' | 'price-desc' | 'newest'

const props = defineProps<{
  selectedCategory: CategorySlug | 'all'
  priceRange: readonly [number, number]
  sort: SortKey
  onlyInStock: boolean
}>()

const emit = defineEmits<{
  categoryChange: [next: CategorySlug | 'all']
  priceRangeChange: [next: readonly [number, number]]
  sortChange: [next: SortKey]
  onlyInStockChange: [next: boolean]
}>()

const sortOptions = [
  { key: 'rating', label: '평점 높은순' },
  { key: 'price-asc', label: '낮은 가격순' },
  { key: 'price-desc', label: '높은 가격순' },
  { key: 'newest', label: 'NEW 우선' },
] as const

function onPriceLo(e: Event): void {
  emit('priceRangeChange', [Number((e.target as HTMLInputElement).value) || 0, props.priceRange[1]])
}
function onPriceHi(e: Event): void {
  emit('priceRangeChange', [props.priceRange[0], Number((e.target as HTMLInputElement).value) || 0])
}
</script>

<template>
  <aside class="space-y-6 text-sm">
    <section>
      <h3 class="font-semibold text-ink-900 mb-2">카테고리</h3>
      <ul class="space-y-1">
        <li>
          <button
            type="button"
            :class="[
              'w-full text-left px-2 py-1 rounded',
              selectedCategory === 'all'
                ? 'bg-brand-50 text-brand-700 font-medium'
                : 'text-ink-600 hover:bg-ink-100',
            ]"
            @click="emit('categoryChange', 'all')"
          >전체</button>
        </li>
        <li v-for="c in categories" :key="c.slug">
          <button
            type="button"
            :class="[
              'w-full text-left px-2 py-1 rounded',
              selectedCategory === c.slug
                ? 'bg-brand-50 text-brand-700 font-medium'
                : 'text-ink-600 hover:bg-ink-100',
            ]"
            @click="emit('categoryChange', c.slug)"
          >{{ c.name }}</button>
        </li>
      </ul>
    </section>
    <section>
      <h3 class="font-semibold text-ink-900 mb-2">가격 (USD)</h3>
      <div class="flex items-center gap-2">
        <input
          type="number"
          :value="priceRange[0]"
          :min="0"
          class="w-20 h-8 px-2 rounded border border-ink-200 text-center"
          @input="onPriceLo"
        />
        <span class="text-ink-400">~</span>
        <input
          type="number"
          :value="priceRange[1]"
          :min="0"
          class="w-20 h-8 px-2 rounded border border-ink-200 text-center"
          @input="onPriceHi"
        />
      </div>
    </section>
    <section>
      <h3 class="font-semibold text-ink-900 mb-2">정렬</h3>
      <select
        :value="sort"
        class="w-full h-9 px-2 rounded border border-ink-200 bg-white"
        @change="(e: Event) => emit('sortChange', (e.target as HTMLSelectElement).value as SortKey)"
      >
        <option v-for="o in sortOptions" :key="o.key" :value="o.key">{{ o.label }}</option>
      </select>
    </section>
    <section>
      <label class="inline-flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          :checked="onlyInStock"
          class="accent-brand-500"
          @change="(e: Event) => emit('onlyInStockChange', (e.target as HTMLInputElement).checked)"
        />
        <span class="text-ink-600">재고 있음만</span>
        <Badge v-if="onlyInStock" tone="success" label="ON" />
      </label>
    </section>
  </aside>
</template>
