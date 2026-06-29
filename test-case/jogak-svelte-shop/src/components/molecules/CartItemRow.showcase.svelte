<script lang="ts">
  import { products } from '@jogak-shop/shared'
  import CartItemRow from './CartItemRow.svelte'

  let {
    productId = 'p-001',
    initial = 1,
  }: { productId?: string; initial?: number } = $props()

  let qty = $state(initial)
  let removed = $state(false)
  let product = $derived(products.find((p) => p.id === productId) ?? products[0])
  let variantId = $derived(product?.variants[0]?.id ?? null)
  let line = $derived({ productId: product!.id, variantId, quantity: qty })
</script>

{#if removed}
  <p class="text-sm text-ink-400 p-4">(삭제됨)</p>
{:else if product}
  <div class="max-w-2xl">
    <CartItemRow
      {line}
      {product}
      onquantitychange={(_, __, n) => (qty = n)}
      onremove={() => (removed = true)}
    />
  </div>
{/if}
