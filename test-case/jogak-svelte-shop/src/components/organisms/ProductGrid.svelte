<script lang="ts">
  import type { Product } from '@jogak-shop/shared'
  import ProductCard from '../molecules/ProductCard.svelte'

  let {
    products,
    emptyMessage = '상품이 없습니다.',
    columns = 4 as 2 | 3 | 4,
    onproductclick,
    onquickadd,
  }: {
    products: readonly Product[]
    emptyMessage?: string
    columns?: 2 | 3 | 4
    onproductclick?: (p: Product) => void
    onquickadd?: (p: Product) => void
  } = $props()

  const columnsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }
</script>

{#if products.length === 0}
  <div class="text-center text-ink-400 py-12 border border-dashed border-ink-200 rounded-md">
    {emptyMessage}
  </div>
{:else}
  <div class="grid gap-4 {columnsClass[columns]}">
    {#each products as p (p.id)}
      <ProductCard
        product={p}
        layout="grid"
        onclick={onproductclick}
        onquickadd={onquickadd}
      />
    {/each}
  </div>
{/if}
