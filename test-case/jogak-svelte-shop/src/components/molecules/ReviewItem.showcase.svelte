<script lang="ts">
  import { reviews } from '@jogak-shop/shared'
  import ReviewItem from './ReviewItem.svelte'

  let {
    reviewId = 'r-001',
    compact = false,
  }: { reviewId?: string; compact?: boolean } = $props()

  let review = $derived(reviews.find((r) => r.id === reviewId) ?? reviews[0])
</script>

<div class="max-w-2xl">
  {#if review}<ReviewItem {review} {compact} />{/if}
</div>
