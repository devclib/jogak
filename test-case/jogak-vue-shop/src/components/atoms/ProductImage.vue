<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    color: string
    label: string
    aspect?: 'square' | 'portrait' | 'landscape'
    rounded?: 'none' | 'sm' | 'md' | 'lg'
  }>(),
  { aspect: 'square', rounded: 'md' },
)

const aspectMap = { square: 'aspect-square', portrait: 'aspect-[3/4]', landscape: 'aspect-[4/3]' }
const roundedMap = { none: '', sm: 'rounded', md: 'rounded-md', lg: 'rounded-xl' }
const initials = computed(() =>
  props.label.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase(),
)
</script>

<template>
  <div
    :class="[
      'flex items-center justify-center text-white font-semibold tracking-tight select-none',
      aspectMap[aspect],
      roundedMap[rounded],
    ]"
    :style="{ background: color }"
    :aria-label="label"
  >
    <span class="text-2xl drop-shadow">{{ initials || '◆' }}</span>
  </div>
</template>
