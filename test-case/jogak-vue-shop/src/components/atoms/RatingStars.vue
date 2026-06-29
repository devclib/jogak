<script setup lang="ts">
import { computed } from 'vue'
import { ratingStars } from '@jogak-shop/shared'

const props = withDefaults(
  defineProps<{ value: number; reviewCount?: number; size?: 'sm' | 'md'; showValue?: boolean }>(),
  { size: 'sm', showValue: false },
)

const stars = computed(() => ratingStars(props.value))
const sizeMap = { sm: 'text-xs', md: 'text-sm' }
</script>

<template>
  <span :class="['inline-flex items-center gap-1', sizeMap[size]]" :aria-label="`${value} / 5`">
    <span class="text-accent-500 leading-none tracking-tight">
      <span>{{ '★'.repeat(stars.full) }}{{ stars.half ? '½' : '' }}</span>
      <span class="text-ink-200">{{ '★'.repeat(stars.empty) }}</span>
    </span>
    <span v-if="showValue" class="font-medium text-ink-900">{{ value.toFixed(1) }}</span>
    <span v-if="reviewCount !== undefined" class="text-ink-400">({{ reviewCount.toLocaleString() }})</span>
  </span>
</template>
