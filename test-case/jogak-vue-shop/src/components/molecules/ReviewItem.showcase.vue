<script setup lang="ts">
import { computed } from 'vue'
import { reviews } from '@jogak-shop/shared'
import ReviewItem from './ReviewItem.vue'

const props = withDefaults(
  defineProps<{ reviewId?: string; compact?: boolean }>(),
  { reviewId: 'r-001', compact: false },
)
const review = computed(() => reviews.find((r) => r.id === props.reviewId) ?? reviews[0])
</script>

<template>
  <div class="max-w-2xl">
    <ReviewItem v-if="review" :review="review" :compact="compact" />
  </div>
</template>
