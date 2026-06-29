<script lang="ts">
  import { navigate } from 'svelte-routing'
  import { products, reviews, effectivePriceCents } from '@jogak-shop/shared'
  import Badge from '../components/atoms/Badge.svelte'
  import Button from '../components/atoms/Button.svelte'
  import PriceTag from '../components/atoms/PriceTag.svelte'
  import ProductImage from '../components/atoms/ProductImage.svelte'
  import QuantityStepper from '../components/atoms/QuantityStepper.svelte'
  import RatingStars from '../components/atoms/RatingStars.svelte'
  import ReviewItem from '../components/molecules/ReviewItem.svelte'
  import { cart } from '../lib/cart-store.svelte'

  let { slug }: { slug: string } = $props()

  let product = $derived(products.find((p) => p.slug === slug))
  let variantId = $state<string | null>(null)
  let quantity = $state(1)

  $effect(() => {
    variantId = product?.variants[0]?.id ?? null
  })

  let effective = $derived(product ? effectivePriceCents(product, variantId) : 0)
  let productReviews = $derived(product ? reviews.filter((r) => r.productId === product.id) : [])
</script>

{#if !product}
  <div class="text-center py-12 space-y-4">
    <h1 class="text-2xl font-semibold">상품을 찾을 수 없습니다</h1>
    <Button label="목록으로" onclick={() => navigate('/')} />
  </div>
{:else}
  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12 md:col-span-6">
      <ProductImage color={product.imageColor} label={product.name} aspect="square" rounded="lg" />
    </div>
    <div class="col-span-12 md:col-span-6 space-y-5">
      <div class="flex items-center gap-2">
        {#if product.badge}<Badge tone="accent" label={product.badge.toUpperCase()} />{/if}
        {#each product.tags as t}<Badge tone="neutral" label={t} outline />{/each}
      </div>
      <header>
        <h1 class="text-3xl font-bold text-ink-900">{product.name}</h1>
        <p class="mt-2 text-ink-600">{product.summary}</p>
      </header>
      <RatingStars value={product.rating} reviewCount={product.reviewCount} size="md" showValue />
      <PriceTag
        cents={effective}
        originalCents={product.discountPercent ? product.priceCents : undefined}
        currency={product.currency}
        size="lg"
      />
      <p class="text-sm text-ink-600 leading-relaxed">{product.description}</p>

      {#if product.variants.length > 0}
        <div class="space-y-2">
          <span class="text-sm font-medium text-ink-900">옵션</span>
          <div class="flex flex-wrap gap-2">
            {#each product.variants as v}
              <button
                type="button"
                disabled={v.stock === 0}
                class="h-10 px-4 rounded-md border text-sm transition-colors {variantId === v.id ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium' : 'border-ink-200 text-ink-900 hover:border-ink-400'} {v.stock === 0 ? 'opacity-50 line-through cursor-not-allowed' : ''}"
                onclick={() => (variantId = v.id)}
              >
                {v.label}
                {#if v.priceDelta > 0}<span class="ml-1 text-xs text-ink-400">+${(v.priceDelta / 100).toFixed(2)}</span>{/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="flex items-center gap-4 pt-2">
        <QuantityStepper value={quantity} min={1} max={product.stock} size="md" onchange={(n) => (quantity = n)} />
        <Button
          label="장바구니 담기"
          size="lg"
          fullWidth
          onclick={() => {
            cart.add(product!.id, variantId, quantity)
            navigate('/cart')
          }}
        />
      </div>
    </div>

    <section class="col-span-12 mt-8">
      <h2 class="text-xl font-bold text-ink-900 mb-3">리뷰 ({productReviews.length})</h2>
      {#if productReviews.length === 0}
        <p class="text-sm text-ink-400 py-6">아직 리뷰가 없습니다.</p>
      {:else}
        <div>{#each productReviews as r}<ReviewItem review={r} />{/each}</div>
      {/if}
    </section>
  </div>
{/if}
