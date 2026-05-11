<script lang="ts">
  type ButtonVariant = 'primary' | 'secondary' | 'destructive'
  type ButtonSize = 'sm' | 'md' | 'lg'

  let {
    label = 'Button',
    variant = 'primary',
    size = 'md',
    disabled = false,
  }: {
    label?: string
    variant?: ButtonVariant
    size?: ButtonSize
    disabled?: boolean
  } = $props()

  const sizeStyle: Record<ButtonSize, string> = {
    sm: 'padding: 0 12px; font-size: 12px; height: 32px',
    md: 'padding: 0 16px; font-size: 14px; height: 36px',
    lg: 'padding: 0 24px; font-size: 16px; height: 44px',
  }

  const variantStyle: Record<ButtonVariant, string> = {
    primary: 'background: #0f172a; color: #fff',
    secondary: 'background: #f1f5f9; color: #0f172a',
    destructive: 'background: #dc2626; color: #fff',
  }
</script>

<button
  type="button"
  {disabled}
  style="{sizeStyle[size]}; {variantStyle[variant]}; border: none; border-radius: 6px; font-weight: 500; cursor: {disabled ? 'not-allowed' : 'pointer'}; opacity: {disabled ? 0.5 : 1}; font-family: system-ui, sans-serif;"
  data-testid="svelte-button"
>
  {label}
</button>
