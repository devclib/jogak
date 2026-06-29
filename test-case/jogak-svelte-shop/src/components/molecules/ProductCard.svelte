<script lang="ts">
  import type { Product } from '@jogak-shop/shared'
  import { effectivePriceCents } from '@jogak-shop/shared'
  import Badge from '../atoms/Badge.svelte'
  import PriceTag from '../atoms/PriceTag.svelte'
  import RatingStars from '../atoms/RatingStars.svelte'
  import ProductImage from '../atoms/ProductImage.svelte'

  let {
    product,
    layout = 'grid' as 'grid' | 'horizontal',
    onclick,
    onquickadd,
  }: {
    product: Product
    layout?: 'grid' | 'horizontal'
    onclick?: (p: Product) => void
    onquickadd?: (p: Product) => void
  } = $props()

  let effective = $derived(effectivePriceCents(product))
  let wasDiscounted = $derived(Boolean(product.discountPercent && product.discountPercent > 0))

  const badgeToneMap = { new: 'brand', best: 'accent', sale: 'danger', 'low-stock': 'success' } as const
  const badgeLabel = { new: 'NEW', best: 'BEST', sale: 'SALE', 'low-stock': 'LOW STOCK' } as const
</script>

<div class="group bg-white rounded-lg border border-ink-100 overflow-hidden hover:shadow-md transition-shadow {layout === 'horizontal' ? 'flex' : ''}">
  <button
    type="button"
    class="text-left {layout === 'horizontal' ? 'w-32 shrink-0' : 'w-full'}"
    onclick={() => onclick?.(product)}
  >
    <ProductImage
      color={product.imageColor}
      label={product.name}
      aspect={layout === 'horizontal' ? 'square' : 'landscape'}
      rounded="none"
    />
  </button>
  <div class="p-3 flex flex-col gap-2 {layout === 'horizontal' ? 'flex-1' : ''}">
    <div class="flex items-center gap-1 flex-wrap">
      {#if product.badge}<Badge tone={badgeToneMap[product.badge]} label={badgeLabel[product.badge]} />{/if}
      {#each product.tags.slice(0, 2) as t}<Badge tone="neutral" label={t} outline />{/each}
    </div>
    <button
      type="button"
      class="text-left font-medium text-ink-900 hover:text-brand-600 transition-colors leading-snug"
      onclick={() => onclick?.(product)}
    >{product.name}</button>
    {#if layout === 'horizontal'}<p class="text-xs text-ink-600 line-clamp-2">{product.summary}</p>{/if}
    <RatingStars value={product.rating} reviewCount={product.reviewCount} />
    <div class="mt-auto flex items-center justify-between">
      <PriceTag
        cents={effective}
        originalCents={wasDiscounted ? product.priceCents : undefined}
        currency={product.currency}
        size="md"
      />
      <button
        type="button"
        class="text-xs font-medium text-brand-600 hover:text-brand-700"
        onclick={() => onquickadd?.(product)}
      >+ 담기</button>
    </div>
  </div>
</div>
