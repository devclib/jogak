<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@jogak-shop/shared'
import { effectivePriceCents } from '@jogak-shop/shared'
import Badge from '../atoms/Badge.vue'
import PriceTag from '../atoms/PriceTag.vue'
import RatingStars from '../atoms/RatingStars.vue'
import ProductImage from '../atoms/ProductImage.vue'

const props = withDefaults(
  defineProps<{ product: Product; layout?: 'grid' | 'horizontal' }>(),
  { layout: 'grid' },
)
const emit = defineEmits<{ click: [Product]; quickAdd: [Product] }>()

const effective = computed(() => effectivePriceCents(props.product))
const wasDiscounted = computed(() => Boolean(props.product.discountPercent && props.product.discountPercent > 0))

const badgeToneMap = { new: 'brand', best: 'accent', sale: 'danger', 'low-stock': 'success' } as const
const badgeLabel = { new: 'NEW', best: 'BEST', sale: 'SALE', 'low-stock': 'LOW STOCK' } as const
</script>

<template>
  <div
    :class="[
      'group bg-white rounded-lg border border-ink-100 overflow-hidden hover:shadow-md transition-shadow',
      layout === 'horizontal' ? 'flex' : '',
    ]"
  >
    <button
      type="button"
      :class="['text-left', layout === 'horizontal' ? 'w-32 shrink-0' : 'w-full']"
      @click="emit('click', product)"
    >
      <ProductImage
        :color="product.imageColor"
        :label="product.name"
        :aspect="layout === 'horizontal' ? 'square' : 'landscape'"
        rounded="none"
      />
    </button>
    <div :class="['p-3 flex flex-col gap-2', layout === 'horizontal' ? 'flex-1' : '']">
      <div class="flex items-center gap-1 flex-wrap">
        <Badge v-if="product.badge" :tone="badgeToneMap[product.badge]" :label="badgeLabel[product.badge]" />
        <Badge v-for="t in product.tags.slice(0, 2)" :key="t" tone="neutral" :label="t" outline />
      </div>
      <button
        type="button"
        class="text-left font-medium text-ink-900 hover:text-brand-600 transition-colors leading-snug"
        @click="emit('click', product)"
      >
        {{ product.name }}
      </button>
      <p v-if="layout === 'horizontal'" class="text-xs text-ink-600 line-clamp-2">{{ product.summary }}</p>
      <RatingStars :value="product.rating" :review-count="product.reviewCount" />
      <div class="mt-auto flex items-center justify-between">
        <PriceTag
          :cents="effective"
          :original-cents="wasDiscounted ? product.priceCents : undefined"
          :currency="product.currency"
          size="md"
        />
        <button
          type="button"
          class="text-xs font-medium text-brand-600 hover:text-brand-700"
          @click="emit('quickAdd', product)"
        >+ 담기</button>
      </div>
    </div>
  </div>
</template>
