<script lang="ts">
  import { ratingStars } from '@jogak-shop/shared'

  let {
    value,
    reviewCount,
    size = 'sm',
    showValue = false,
  }: { value: number; reviewCount?: number; size?: 'sm' | 'md'; showValue?: boolean } = $props()

  let stars = $derived(ratingStars(value))
  const sizeMap = { sm: 'text-xs', md: 'text-sm' }
</script>

<span class="inline-flex items-center gap-1 {sizeMap[size]}" aria-label="{value} / 5">
  <span class="text-accent-500 leading-none tracking-tight">
    <span>{'★'.repeat(stars.full)}{stars.half ? '½' : ''}</span><span class="text-ink-200">{'★'.repeat(stars.empty)}</span>
  </span>
  {#if showValue}<span class="font-medium text-ink-900">{value.toFixed(1)}</span>{/if}
  {#if reviewCount !== undefined}<span class="text-ink-400">({reviewCount.toLocaleString()})</span>{/if}
</span>
