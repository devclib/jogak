<script setup lang="ts">
type ButtonVariant = 'primary' | 'secondary' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    /** 버튼 라벨 */
    label?: string
    /** 시각적 변형 */
    variant?: ButtonVariant
    /** 크기 */
    size?: ButtonSize
    /** 비활성화 */
    disabled?: boolean
  }>(),
  {
    label: 'Button',
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
)

const sizeStyle: Record<ButtonSize, { padding: string; fontSize: string; height: string }> = {
  sm: { padding: '0 12px', fontSize: '12px', height: '32px' },
  md: { padding: '0 16px', fontSize: '14px', height: '36px' },
  lg: { padding: '0 24px', fontSize: '16px', height: '44px' },
}

const variantStyle: Record<ButtonVariant, { background: string; color: string; border: string }> = {
  primary: { background: '#0f172a', color: '#fff', border: 'none' },
  secondary: { background: '#f1f5f9', color: '#0f172a', border: 'none' },
  destructive: { background: '#dc2626', color: '#fff', border: 'none' },
}
</script>

<template>
  <button
    :disabled="disabled"
    :style="{
      ...sizeStyle[size],
      ...variantStyle[variant],
      borderRadius: '6px',
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'system-ui, sans-serif',
    }"
    data-testid="vue-button"
  >
    {{ label }}
  </button>
</template>
