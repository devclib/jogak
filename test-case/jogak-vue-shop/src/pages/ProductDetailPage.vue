<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { products, reviews, effectivePriceCents } from '@jogak-shop/shared'
import Badge from '../components/atoms/Badge.vue'
import Button from '../components/atoms/Button.vue'
import PriceTag from '../components/atoms/PriceTag.vue'
import ProductImage from '../components/atoms/ProductImage.vue'
import QuantityStepper from '../components/atoms/QuantityStepper.vue'
import RatingStars from '../components/atoms/RatingStars.vue'
import ReviewItem from '../components/molecules/ReviewItem.vue'
import { cartStore } from '../lib/cart-store'

const route = useRoute()
const router = useRouter()
const product = computed(() => products.find((p) => p.slug === (route.params.slug as string)))
const variantId = ref<string | null>(product.value?.variants[0]?.id ?? null)
const quantity = ref(1)

const effective = computed(() => (product.value ? effectivePriceCents(product.value, variantId.value) : 0))
const productReviews = computed(() => (product.value ? reviews.filter((r) => r.productId === product.value!.id) : []))
</script>

<template>
  <div v-if="!product" class="text-center py-12 space-y-4">
    <h1 class="text-2xl font-semibold">상품을 찾을 수 없습니다</h1>
    <Button label="목록으로" @click="router.push('/')" />
  </div>
  <div v-else class="grid grid-cols-12 gap-8">
    <div class="col-span-12 md:col-span-6">
      <ProductImage :color="product.imageColor" :label="product.name" aspect="square" rounded="lg" />
    </div>
    <div class="col-span-12 md:col-span-6 space-y-5">
      <div class="flex items-center gap-2">
        <Badge v-if="product.badge" tone="accent" :label="product.badge.toUpperCase()" />
        <Badge v-for="t in product.tags" :key="t" outline tone="neutral" :label="t" />
      </div>
      <header>
        <h1 class="text-3xl font-bold text-ink-900">{{ product.name }}</h1>
        <p class="mt-2 text-ink-600">{{ product.summary }}</p>
      </header>
      <RatingStars :value="product.rating" :review-count="product.reviewCount" size="md" show-value />
      <PriceTag
        :cents="effective"
        :original-cents="product.discountPercent ? product.priceCents : undefined"
        :currency="product.currency"
        size="lg"
      />
      <p class="text-sm text-ink-600 leading-relaxed">{{ product.description }}</p>

      <div v-if="product.variants.length > 0" class="space-y-2">
        <span class="text-sm font-medium text-ink-900">옵션</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="v in product.variants"
            :key="v.id"
            type="button"
            :disabled="v.stock === 0"
            :class="[
              'h-10 px-4 rounded-md border text-sm transition-colors',
              variantId === v.id
                ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                : 'border-ink-200 text-ink-900 hover:border-ink-400',
              v.stock === 0 ? 'opacity-50 line-through cursor-not-allowed' : '',
            ]"
            @click="variantId = v.id"
          >
            {{ v.label }}
            <span v-if="v.priceDelta > 0" class="ml-1 text-xs text-ink-400">+${{ (v.priceDelta / 100).toFixed(2) }}</span>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-4 pt-2">
        <QuantityStepper
          :value="quantity"
          :min="1"
          :max="product.stock"
          size="md"
          @change="(n: number) => quantity = n"
        />
        <Button
          label="장바구니 담기"
          size="lg"
          full-width
          @click="cartStore.add(product!.id, variantId, quantity); router.push('/cart')"
        />
      </div>
    </div>

    <section class="col-span-12 mt-8">
      <h2 class="text-xl font-bold text-ink-900 mb-3">리뷰 ({{ productReviews.length }})</h2>
      <p v-if="productReviews.length === 0" class="text-sm text-ink-400 py-6">아직 리뷰가 없습니다.</p>
      <div v-else>
        <ReviewItem v-for="r in productReviews" :key="r.id" :review="r" />
      </div>
    </section>
  </div>
</template>
