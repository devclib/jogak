<script setup lang="ts">
import { computed, ref } from 'vue'
import { products } from '@jogak-shop/shared'
import CartItemRow from './CartItemRow.vue'

const props = withDefaults(
  defineProps<{ productId?: string; initial?: number }>(),
  { productId: 'p-001', initial: 1 },
)
const qty = ref(props.initial)
const removed = ref(false)
const product = computed(() => products.find((p) => p.id === props.productId) ?? products[0])
const variantId = computed(() => product.value?.variants[0]?.id ?? null)
const line = computed(() => ({ productId: product.value!.id, variantId: variantId.value, quantity: qty.value }))
</script>

<template>
  <p v-if="removed" class="text-sm text-ink-400 p-4">(삭제됨)</p>
  <div v-else class="max-w-2xl">
    <CartItemRow
      v-if="product"
      :line="line"
      :product="product"
      @quantity-change="(_, __, n) => qty = n"
      @remove="removed = true"
    />
  </div>
</template>
