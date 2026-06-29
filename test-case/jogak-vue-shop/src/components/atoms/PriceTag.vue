<script setup lang="ts">
import { computed } from 'vue'
import type { Currency } from '@jogak-shop/shared'
import { formatPrice } from '@jogak-shop/shared'

const props = withDefaults(
  defineProps<{
    cents: number
    originalCents?: number
    currency?: Currency
    size?: 'sm' | 'md' | 'lg'
    align?: 'left' | 'right'
  }>(),
  { currency: 'USD', size: 'md', align: 'left' },
)

const sizeMap = {
  sm: { now: 'text-sm', was: 'text-[11px]' },
  md: { now: 'text-base font-semibold', was: 'text-xs' },
  lg: { now: 'text-2xl font-bold', was: 'text-sm' },
}

const discounted = computed(() => props.originalCents !== undefined && props.originalCents > props.cents)
const discountPercent = computed(() =>
  discounted.value ? Math.round(((props.originalCents! - props.cents) / props.originalCents!) * 100) : 0,
)
</script>

<template>
  <div :class="['inline-flex items-baseline gap-2', align === 'right' ? 'flex-row-reverse' : '']">
    <span :class="[sizeMap[size].now, discounted ? 'text-danger-500' : 'text-ink-900']">
      {{ formatPrice(cents, currency) }}
    </span>
    <template v-if="discounted">
      <span :class="[sizeMap[size].was, 'text-ink-400 line-through']">
        {{ formatPrice(originalCents!, currency) }}
      </span>
      <span :class="[sizeMap[size].was, 'font-medium text-accent-500']">-{{ discountPercent }}%</span>
    </template>
  </div>
</template>
