<script lang="ts">
  import { products } from '@jogak-shop/shared'
  import ProductCard from './ProductCard.svelte'

  let {
    productId = 'p-001',
    layout = 'grid' as 'grid' | 'horizontal',
  }: { productId?: string; layout?: 'grid' | 'horizontal' } = $props()

  let product = $derived(products.find((p) => p.id === productId) ?? products[0])
</script>

<div class={layout === 'horizontal' ? 'max-w-md' : 'max-w-xs'}>
  {#if product}<ProductCard {product} {layout} />{/if}
</div>
