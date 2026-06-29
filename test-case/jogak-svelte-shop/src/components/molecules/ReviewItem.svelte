<script lang="ts">
  import type { Review } from '@jogak-shop/shared'
  import RatingStars from '../atoms/RatingStars.svelte'

  let { review, compact = false }: { review: Review; compact?: boolean } = $props()

  let helpful = $state(false)
  let count = $derived(review.helpfulCount + (helpful ? 1 : 0))
</script>

<article class="border-b border-ink-100 py-4 {compact ? 'space-y-1' : 'space-y-2'}">
  <header class="flex items-center justify-between text-sm">
    <span class="font-medium text-ink-900">{review.author}</span>
    <RatingStars value={review.rating} size="sm" />
  </header>
  {#if !compact}<h4 class="font-medium text-ink-900">{review.title}</h4>{/if}
  <p class="text-ink-600 {compact ? 'text-xs line-clamp-2' : 'text-sm'}">{review.body}</p>
  <footer class="flex items-center justify-between pt-1 text-xs text-ink-400">
    <time>{new Date(review.createdAt).toLocaleDateString('ko-KR')}</time>
    <button
      type="button"
      class="transition-colors {helpful ? 'text-brand-600 font-medium' : 'hover:text-ink-600'}"
      onclick={() => (helpful = !helpful)}
    >👍 도움이 됐어요 ({count})</button>
  </footer>
</article>
