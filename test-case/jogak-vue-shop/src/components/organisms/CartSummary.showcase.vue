<script setup lang="ts">
import { computed } from 'vue'
import type { Cart } from '@jogak-shop/shared'
import CartSummary from './CartSummary.vue'

const props = withDefaults(
  defineProps<{ kind?: 'empty' | 'small' | 'large' | 'mixed'; compact?: boolean }>(),
  { kind: 'mixed', compact: false },
)

const carts: Record<string, Cart> = {
  empty: { lines: [], updatedAt: 0 },
  small: { lines: [{ productId: 'p-007', variantId: null, quantity: 1 }], updatedAt: 0 },
  large: {
    lines: [
      { productId: 'p-003', variantId: 'v-m', quantity: 1 },
      { productId: 'p-006', variantId: 'v-black', quantity: 1 },
    ],
    updatedAt: 0,
  },
  mixed: {
    lines: [
      { productId: 'p-001', variantId: 'v-m', quantity: 2 },
      { productId: 'p-007', variantId: null, quantity: 1 },
      { productId: 'p-011', variantId: null, quantity: 3 },
    ],
    updatedAt: 0,
  },
}

const cart = computed(() => carts[props.kind] ?? carts.empty!)
</script>

<template>
  <div class="max-w-sm">
    <CartSummary :cart="cart" :compact="compact" />
  </div>
</template>
