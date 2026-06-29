<script setup lang="ts">
import { computed } from 'vue'
import { products } from '@jogak-shop/shared'
import ProductGrid from './ProductGrid.vue'

const props = withDefaults(
  defineProps<{
    kind?: 'all' | 'apparel' | 'tech' | 'beauty' | 'sports' | 'empty'
    columns?: 2 | 3 | 4
    emptyMessage?: string
  }>(),
  { kind: 'all', columns: 4, emptyMessage: '상품이 없습니다.' },
)

const filtered = computed(() =>
  props.kind === 'all'
    ? products
    : props.kind === 'empty'
      ? []
      : products.filter((p) => p.category === props.kind),
)
</script>

<template>
  <ProductGrid :products="filtered" :columns="columns" :empty-message="emptyMessage" />
</template>
