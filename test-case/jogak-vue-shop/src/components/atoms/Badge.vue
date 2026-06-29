<script setup lang="ts">
type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'danger'
type Size = 'sm' | 'md'

const props = withDefaults(
  defineProps<{ label: string; tone?: Tone; size?: Size; outline?: boolean }>(),
  { tone: 'neutral', size: 'sm', outline: false },
)

const toneClass: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-600',
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-orange-50 text-accent-500',
  success: 'bg-green-50 text-success-500',
  danger: 'bg-red-50 text-danger-500',
}
const outlineClass: Record<Tone, string> = {
  neutral: 'border-ink-200 text-ink-600',
  brand: 'border-brand-500 text-brand-700',
  accent: 'border-accent-500 text-accent-500',
  success: 'border-success-500 text-success-500',
  danger: 'border-danger-500 text-danger-500',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full font-medium tracking-wide uppercase',
      size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
      outline ? `border ${outlineClass[tone]} bg-white` : toneClass[tone],
    ]"
  >
    {{ label }}
  </span>
</template>
