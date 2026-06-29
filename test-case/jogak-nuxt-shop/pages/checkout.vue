<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Address, Order } from '@jogak-shop/shared'
import { mockPay } from '@jogak-shop/shared'
import AddressForm from '~/components/molecules/AddressForm.vue'
import CartSummary from '~/components/organisms/CartSummary.vue'
import Button from '~/components/atoms/Button.vue'
import { cartStore } from '~/composables/useCart'

const router = useRouter()
const cart = cartStore.state

const address = ref<Address>({
  recipient: '', line1: '', line2: '', city: '', postalCode: '', country: 'KR', phone: '',
})
const placing = ref(false)
const order = ref<Order | null>(null)

const canPlace = computed(() =>
  cart.lines.length > 0 && address.value.recipient !== '' && address.value.line1 !== '' && address.value.phone !== '',
)

async function place(): Promise<void> {
  if (!canPlace.value) return
  placing.value = true
  const o = await mockPay(cart, address.value)
  order.value = o
  cartStore.clear()
  placing.value = false
}
</script>

<template>
  <div
    v-if="order"
    class="max-w-xl mx-auto bg-white rounded-lg border border-ink-100 p-8 text-center space-y-4"
  >
    <div class="text-5xl">✅</div>
    <h1 class="text-2xl font-bold">주문이 완료됐습니다</h1>
    <p class="text-ink-600">주문 번호: <span class="font-semibold text-ink-900">{{ order.id }}</span></p>
    <p class="text-xs text-ink-400">mock 결제 — 실제 결제 게이트웨이 호출 없음.</p>
    <Button label="쇼핑 계속하기" full-width @click="router.push('/')" />
  </div>
  <div v-else class="grid grid-cols-12 gap-6">
    <div class="col-span-12 lg:col-span-8 space-y-6">
      <h1 class="text-2xl font-bold text-ink-900">결제</h1>
      <section class="bg-white rounded-lg border border-ink-100 p-5 space-y-3">
        <h2 class="font-semibold text-ink-900">배송지</h2>
        <AddressForm :value="address" :disabled="placing" @update="(a) => address = a" />
      </section>
      <section class="bg-white rounded-lg border border-ink-100 p-5 space-y-3">
        <h2 class="font-semibold text-ink-900">결제 수단</h2>
        <p class="text-sm text-ink-600">Mock — 결제 게이트웨이 호출 없이 항상 성공.</p>
        <Button
          label="주문 확정"
          :disabled="!canPlace || placing"
          :loading="placing"
          size="lg"
          full-width
          @click="place()"
        />
      </section>
    </div>
    <div class="col-span-12 lg:col-span-4">
      <CartSummary :cart="cart" compact />
    </div>
  </div>
</template>
