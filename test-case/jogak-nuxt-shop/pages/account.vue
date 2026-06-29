<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { products } from '@jogak-shop/shared'
import Badge from '~/components/atoms/Badge.vue'
import ProductCard from '~/components/molecules/ProductCard.vue'

const router = useRouter()
const wishlist = computed(() => products.filter((p) => p.badge === 'best').slice(0, 4))

const mockOrders = [
  { id: 'ORD-1024', placedAt: Date.UTC(2026, 4, 28), status: '배송 완료', totalCents: 28900 },
  { id: 'ORD-1015', placedAt: Date.UTC(2026, 4, 14), status: '취소', totalCents: 4200 },
  { id: 'ORD-1009', placedAt: Date.UTC(2026, 3, 30), status: '배송 완료', totalCents: 14900 },
] as const
</script>

<template>
  <div class="space-y-8">
    <header class="bg-white rounded-lg border border-ink-100 p-6 flex items-center gap-4">
      <div class="h-14 w-14 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xl font-bold">U</div>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-ink-900">Guest User</h1>
        <p class="text-sm text-ink-600">test@jogak.dev · 멤버 등급: Silver</p>
      </div>
      <Badge tone="brand" label="VERIFIED" />
    </header>

    <section class="bg-white rounded-lg border border-ink-100">
      <div class="p-5 border-b border-ink-100">
        <h2 class="font-semibold text-ink-900">주문 내역 (mock)</h2>
        <p class="text-xs text-ink-400 mt-1">서버 호출 없음 — 정적 데이터.</p>
      </div>
      <ul class="divide-y divide-ink-100">
        <li
          v-for="o in mockOrders"
          :key="o.id"
          class="p-4 flex items-center justify-between text-sm"
        >
          <div>
            <p class="font-medium">{{ o.id }}</p>
            <time class="text-xs text-ink-400">{{ new Date(o.placedAt).toLocaleDateString('ko-KR') }}</time>
          </div>
          <span :class="['text-xs px-2 py-0.5 rounded-full', o.status === '취소' ? 'bg-red-50 text-danger-500' : 'bg-green-50 text-success-500']">
            {{ o.status }}
          </span>
          <span class="font-semibold tabular-nums">${{ (o.totalCents / 100).toFixed(2) }}</span>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="font-semibold text-ink-900 mb-3">위시리스트</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ProductCard
          v-for="p in wishlist"
          :key="p.id"
          :product="p"
          @click="router.push(`/product/${p.slug}`)"
        />
      </div>
    </section>
  </div>
</template>
