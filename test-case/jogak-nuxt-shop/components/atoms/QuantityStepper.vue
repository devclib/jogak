<script setup lang="ts">
const props = withDefaults(
  defineProps<{ value: number; min?: number; max?: number; size?: 'sm' | 'md' }>(),
  { min: 1, max: 99, size: 'md' },
)
const emit = defineEmits<{ change: [next: number] }>()

const sizeMap = {
  sm: { btn: 'h-7 w-7 text-sm', input: 'h-7 w-10 text-sm' },
  md: { btn: 'h-9 w-9 text-base', input: 'h-9 w-12 text-base' },
}
const cls = sizeMap

function clamp(n: number): number {
  return Math.max(props.min, Math.min(props.max, n))
}
function dec(): void { emit('change', clamp(props.value - 1)) }
function inc(): void { emit('change', clamp(props.value + 1)) }
function onInput(e: Event): void {
  const n = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(n)) emit('change', clamp(n))
}
</script>

<template>
  <div class="inline-flex items-center rounded-md border border-ink-200 bg-white">
    <button
      type="button"
      :class="[cls[size].btn, 'flex items-center justify-center text-ink-900 hover:bg-ink-100 disabled:text-ink-400 disabled:cursor-not-allowed']"
      :disabled="value <= min"
      aria-label="quantity-decrement"
      @click="dec"
    >−</button>
    <input
      type="number"
      :value="value"
      :min="min"
      :max="max"
      :class="[cls[size].input, 'border-x border-ink-200 text-center font-medium tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none']"
      @input="onInput"
    />
    <button
      type="button"
      :class="[cls[size].btn, 'flex items-center justify-center text-ink-900 hover:bg-ink-100 disabled:text-ink-400 disabled:cursor-not-allowed']"
      :disabled="value >= max"
      aria-label="quantity-increment"
      @click="inc"
    >＋</button>
  </div>
</template>
