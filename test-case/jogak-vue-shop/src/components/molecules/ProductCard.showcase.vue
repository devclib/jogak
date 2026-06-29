<script setup lang="ts">
import { computed } from 'vue'
import { products } from '@jogak-shop/shared'
import ProductCard from './ProductCard.vue'

const props = withDefaults(
  defineProps<{ productId?: string; layout?: 'grid' | 'horizontal' }>(),
  { productId: 'p-001', layout: 'grid' },
)
const product = computed(() => products.find((p) => p.id === props.productId) ?? products[0])
</script>

<template>
  <div :class="layout === 'horizontal' ? 'max-w-md' : 'max-w-xs'">
    <ProductCard v-if="product" :product="product" :layout="layout" />
  </div>
</template>
