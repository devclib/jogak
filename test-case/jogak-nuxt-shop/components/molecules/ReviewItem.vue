<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Review } from '@jogak-shop/shared'
import RatingStars from '../atoms/RatingStars.vue'

const props = withDefaults(
  defineProps<{ review: Review; compact?: boolean }>(),
  { compact: false },
)

const helpful = ref(false)
const count = computed(() => props.review.helpfulCount + (helpful.value ? 1 : 0))
</script>

<template>
  <article :class="['border-b border-ink-100 py-4', compact ? 'space-y-1' : 'space-y-2']">
    <header class="flex items-center justify-between text-sm">
      <span class="font-medium text-ink-900">{{ review.author }}</span>
      <RatingStars :value="review.rating" size="sm" />
    </header>
    <h4 v-if="!compact" class="font-medium text-ink-900">{{ review.title }}</h4>
    <p :class="['text-ink-600', compact ? 'text-xs line-clamp-2' : 'text-sm']">{{ review.body }}</p>
    <footer class="flex items-center justify-between pt-1 text-xs text-ink-400">
      <time>{{ new Date(review.createdAt).toLocaleDateString('ko-KR') }}</time>
      <button
        type="button"
        :class="['transition-colors', helpful ? 'text-brand-600 font-medium' : 'hover:text-ink-600']"
        @click="helpful = !helpful"
      >👍 도움이 됐어요 ({{ count }})</button>
    </footer>
  </article>
</template>
