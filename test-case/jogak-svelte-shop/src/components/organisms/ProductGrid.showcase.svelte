<script lang="ts">
  import { products } from '@jogak-shop/shared'
  import ProductGrid from './ProductGrid.svelte'

  let {
    kind = 'all' as 'all' | 'apparel' | 'tech' | 'beauty' | 'sports' | 'empty',
    columns = 4 as 2 | 3 | 4,
    emptyMessage = '상품이 없습니다.',
  }: {
    kind?: 'all' | 'apparel' | 'tech' | 'beauty' | 'sports' | 'empty'
    columns?: 2 | 3 | 4
    emptyMessage?: string
  } = $props()

  let filtered = $derived(
    kind === 'all'
      ? products
      : kind === 'empty'
        ? []
        : products.filter((p) => p.category === kind),
  )
</script>

<ProductGrid products={filtered} {columns} {emptyMessage} />
