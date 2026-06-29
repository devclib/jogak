<script lang="ts">
  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
  type Size = 'sm' | 'md' | 'lg'

  let {
    label,
    variant = 'primary' as Variant,
    size = 'md' as Size,
    leadingIcon,
    fullWidth = false,
    loading = false,
    disabled = false,
    onclick,
  }: {
    label: string
    variant?: Variant
    size?: Size
    leadingIcon?: string
    fullWidth?: boolean
    loading?: boolean
    disabled?: boolean
    onclick?: () => void
  } = $props()

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

<button
  type="button"
  disabled={disabled || loading}
  class="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors {variantClass[variant]} {sizeClass[size]} {fullWidth ? 'w-full' : ''} {loading ? 'opacity-70 cursor-progress' : ''}"
  onclick={onclick}
>
  {#if loading}<span class="animate-pulse">…</span>{:else if leadingIcon}<span>{leadingIcon}</span>{/if}
  <span>{label}</span>
</button>
