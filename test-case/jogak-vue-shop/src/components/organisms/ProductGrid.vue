<script setup lang="ts">
import type { Product } from '@jogak-shop/shared'
import ProductCard from '../molecules/ProductCard.vue'

const props = withDefaults(
  defineProps<{
    products: readonly Product[]
    emptyMessage?: string
    columns?: 2 | 3 | 4
  }>(),
  { emptyMessage: '상품이 없습니다.', columns: 4 },
)
const emit = defineEmits<{ productClick: [Product]; quickAdd: [Product] }>()

const columnsClass = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}
</script>

<template>
  <div
    v-if="products.length === 0"
    class="text-center text-ink-400 py-12 border border-dashed border-ink-200 rounded-md"
  >{{ emptyMessage }}</div>
  <div v-else :class="['grid gap-4', columnsClass[columns]]">
    <ProductCard
      v-for="p in products"
      :key="p.id"
      :product="p"
      layout="grid"
      @click="emit('productClick', p)"
      @quick-add="emit('quickAdd', p)"
    />
  </div>
</template>
