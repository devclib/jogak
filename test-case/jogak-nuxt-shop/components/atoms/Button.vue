<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    label: string
    variant?: Variant
    size?: Size
    leadingIcon?: string
    fullWidth?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', fullWidth: false, loading: false, disabled: false },
)

defineEmits<{ click: [] }>()

const variantClass: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-500/50',
  secondary: 'bg-ink-100 text-ink-900 hover:bg-ink-200 disabled:bg-ink-100/60',
  ghost: 'bg-transparent text-ink-900 hover:bg-ink-100 disabled:text-ink-400',
  danger: 'bg-danger-500 text-white hover:bg-red-700 disabled:bg-danger-500/50',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}
</script>

<template>
  <button
    type="button"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
      variantClass[variant],
      sizeClass[size],
      fullWidth ? 'w-full' : '',
      loading ? 'opacity-70 cursor-progress' : '',
    ]"
    @click="$emit('click')"
  >
    <span v-if="loading" class="animate-pulse">…</span>
    <span v-else-if="leadingIcon">{{ leadingIcon }}</span>
    <span>{{ label }}</span>
  </button>
</template>
