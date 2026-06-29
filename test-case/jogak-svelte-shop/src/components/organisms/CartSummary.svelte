<script lang="ts">
  import type { Cart } from '@jogak-shop/shared'
  import { calcTotalCents, formatPrice, FREE_SHIPPING_THRESHOLD_CENTS } from '@jogak-shop/shared'
  import Button from '../atoms/Button.svelte'

  let {
    cart,
    compact = false,
    oncheckout,
  }: { cart: Cart; compact?: boolean; oncheckout?: () => void } = $props()

  let totals = $derived(calcTotalCents(cart))
  let empty = $derived(cart.lines.length === 0)
  let remainingForFreeShipping = $derived(Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - totals.subtotalCents))
  let freeShippingProgress = $derived(Math.min(100, (totals.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100))
</script>

<aside class="bg-white rounded-lg border border-ink-100 p-5 space-y-4 {compact ? '' : 'sticky top-4'}">
  <h3 class="font-semibold text-ink-900">주문 요약</h3>
  {#if remainingForFreeShipping > 0 && !empty}
    <div class="text-xs space-y-1">
      <p class="text-ink-600">
        <span class="font-medium text-brand-600">{formatPrice(remainingForFreeShipping)}</span>
        더 담으면 무료배송
      </p>
      <div class="h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div class="h-full bg-brand-500 transition-all" style:width="{freeShippingProgress}%"></div>
      </div>
    </div>
  {:else if !empty}
    <p class="text-xs text-success-500 font-medium">✓ 무료배송 적용</p>
  {/if}
  <dl class="space-y-2 text-sm">
    <div class="flex justify-between">
      <dt class="text-ink-600">소계 ({cart.lines.length}개)</dt>
      <dd class="font-medium tabular-nums">{formatPrice(totals.subtotalCents)}</dd>
    </div>
    <div class="flex justify-between">
      <dt class="text-ink-600">배송비</dt>
      <dd class="font-medium tabular-nums">
        {totals.shippingCents === 0 ? '무료' : formatPrice(totals.shippingCents)}
      </dd>
    </div>
    <div class="flex justify-between">
      <dt class="text-ink-600">세금 (10%)</dt>
      <dd class="font-medium tabular-nums">{formatPrice(totals.taxCents)}</dd>
    </div>
    <div class="flex justify-between pt-2 border-t border-ink-100">
      <dt class="font-semibold text-ink-900">합계</dt>
      <dd class="text-xl font-bold tabular-nums">{formatPrice(totals.totalCents)}</dd>
    </div>
  </dl>
  <Button
    label={empty ? '장바구니가 비어 있습니다' : '결제하기'}
    disabled={empty}
    fullWidth
    size="lg"
    onclick={() => oncheckout?.()}
  />
</aside>
