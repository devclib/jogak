<script setup lang="ts">
import { computed } from 'vue'
import type { CartLine, Product } from '@jogak-shop/shared'
import { effectivePriceCents, formatPrice } from '@jogak-shop/shared'
import ProductImage from '../atoms/ProductImage.vue'
import QuantityStepper from '../atoms/QuantityStepper.vue'

const props = defineProps<{ line: CartLine; product: Product }>()
const emit = defineEmits<{
  quantityChange: [productId: string, variantId: string | null, next: number]
  remove: [productId: string, variantId: string | null]
}>()

const variant = computed(() =>
  props.line.variantId ? props.product.variants.find((v) => v.id === props.line.variantId) : null,
)
const unitPrice = computed(() => effectivePriceCents(props.product, props.line.variantId))
const subtotal = computed(() => unitPrice.value * props.line.quantity)
</script>

<template>
  <div class="flex gap-4 p-4 bg-white rounded-lg border border-ink-100">
    <div class="w-20 shrink-0">
      <ProductImage :color="product.imageColor" :label="product.name" rounded="md" />
    </div>
    <div class="flex-1 flex flex-col gap-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-medium text-ink-900 truncate">{{ product.name }}</h3>
        <button
          type="button"
          class="text-xs text-ink-400 hover:text-danger-500 shrink-0"
          @click="emit('remove', line.productId, line.variantId)"
        >삭제</button>
      </div>
      <p v-if="variant" class="text-xs text-ink-600">옵션: {{ variant.label }}</p>
      <p class="text-xs text-ink-400">{{ formatPrice(unitPrice, product.currency) }} × {{ line.quantity }}</p>
      <div class="mt-1 flex items-center justify-between">
        <QuantityStepper
          :value="line.quantity"
          :min="1"
          :max="Math.max(1, product.stock)"
          size="sm"
          @change="(n: number) => emit('quantityChange', line.productId, line.variantId, n)"
        />
        <span class="text-base font-semibold tabular-nums">
          {{ formatPrice(subtotal, product.currency) }}
        </span>
      </div>
    </div>
  </div>
</template>
