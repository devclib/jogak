<script lang="ts">
  import type { CartLine, Product } from '@jogak-shop/shared'
  import { effectivePriceCents, formatPrice } from '@jogak-shop/shared'
  import ProductImage from '../atoms/ProductImage.svelte'
  import QuantityStepper from '../atoms/QuantityStepper.svelte'

  let {
    line,
    product,
    onquantitychange,
    onremove,
  }: {
    line: CartLine
    product: Product
    onquantitychange: (productId: string, variantId: string | null, next: number) => void
    onremove: (productId: string, variantId: string | null) => void
  } = $props()

  let variant = $derived(
    line.variantId ? product.variants.find((v) => v.id === line.variantId) : null,
  )
  let unitPrice = $derived(effectivePriceCents(product, line.variantId))
  let subtotal = $derived(unitPrice * line.quantity)
</script>

<div class="flex gap-4 p-4 bg-white rounded-lg border border-ink-100">
  <div class="w-20 shrink-0">
    <ProductImage color={product.imageColor} label={product.name} rounded="md" />
  </div>
  <div class="flex-1 flex flex-col gap-1 min-w-0">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-medium text-ink-900 truncate">{product.name}</h3>
      <button
        type="button"
        class="text-xs text-ink-400 hover:text-danger-500 shrink-0"
        onclick={() => onremove(line.productId, line.variantId)}
      >삭제</button>
    </div>
    {#if variant}<p class="text-xs text-ink-600">옵션: {variant.label}</p>{/if}
    <p class="text-xs text-ink-400">{formatPrice(unitPrice, product.currency)} × {line.quantity}</p>
    <div class="mt-1 flex items-center justify-between">
      <QuantityStepper
        value={line.quantity}
        min={1}
        max={Math.max(1, product.stock)}
        size="sm"
        onchange={(n: number) => onquantitychange(line.productId, line.variantId, n)}
      />
      <span class="text-base font-semibold tabular-nums">{formatPrice(subtotal, product.currency)}</span>
    </div>
  </div>
</div>
