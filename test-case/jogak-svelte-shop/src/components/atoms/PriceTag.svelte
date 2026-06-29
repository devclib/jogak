<script lang="ts">
  import type { Currency } from '@jogak-shop/shared'
  import { formatPrice } from '@jogak-shop/shared'

  let {
    cents,
    originalCents,
    currency = 'USD' as Currency,
    size = 'md' as 'sm' | 'md' | 'lg',
    align = 'left' as 'left' | 'right',
  }: {
    cents: number
    originalCents?: number
    currency?: Currency
    size?: 'sm' | 'md' | 'lg'
    align?: 'left' | 'right'
  } = $props()

  const sizeMap = {
    sm: { now: 'text-sm', was: 'text-[11px]' },
    md: { now: 'text-base font-semibold', was: 'text-xs' },
    lg: { now: 'text-2xl font-bold', was: 'text-sm' },
  }

  let discounted = $derived(originalCents !== undefined && originalCents > cents)
  let discountPercent = $derived(
    discounted ? Math.round(((originalCents! - cents) / originalCents!) * 100) : 0,
  )
</script>

<div class="inline-flex items-baseline gap-2 {align === 'right' ? 'flex-row-reverse' : ''}">
  <span class="{sizeMap[size].now} {discounted ? 'text-danger-500' : 'text-ink-900'}">
    {formatPrice(cents, currency)}
  </span>
  {#if discounted}
    <span class="{sizeMap[size].was} text-ink-400 line-through">
      {formatPrice(originalCents!, currency)}
    </span>
    <span class="{sizeMap[size].was} font-medium text-accent-500">-{discountPercent}%</span>
  {/if}
</div>
