<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { products } from '@jogak-shop/shared'
import CartItemRow from '../components/molecules/CartItemRow.vue'
import CartSummary from '../components/organisms/CartSummary.vue'
import Button from '../components/atoms/Button.vue'
import { cartStore } from '../lib/cart-store'

const router = useRouter()
const cart = cartStore.state
const empty = computed(() => cart.lines.length === 0)

function productOf(productId: string) {
  return products.find((p) => p.id === productId)
}
</script>

<template>
  <div class="grid grid-cols-12 gap-6">
    <div class="col-span-12 lg:col-span-8 space-y-3">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-ink-900">장바구니</h1>
        <button
          v-if="!empty"
          type="button"
          class="text-sm text-ink-400 hover:text-danger-500"
          @click="cartStore.clear()"
        >전체 비우기</button>
      </header>
      <div
        v-if="empty"
        class="text-center py-16 space-y-4 bg-white border border-dashed border-ink-200 rounded-lg"
      >
        <p class="text-ink-400">장바구니가 비어 있습니다.</p>
        <Button label="쇼핑 계속하기" variant="secondary" @click="router.push('/')" />
      </div>
      <div v-else class="space-y-3">
        <template v-for="line in cart.lines" :key="`${line.productId}:${line.variantId ?? '_'}`">
          <CartItemRow
            v-if="productOf(line.productId)"
            :line="line"
            :product="productOf(line.productId)!"
            @quantity-change="cartStore.setQuantity"
            @remove="cartStore.remove"
          />
        </template>
      </div>
    </div>
    <div class="col-span-12 lg:col-span-4">
      <CartSummary :cart="cart" @checkout="router.push('/checkout')" />
    </div>
  </div>
</template>
