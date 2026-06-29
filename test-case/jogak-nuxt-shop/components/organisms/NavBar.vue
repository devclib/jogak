<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Badge from '../atoms/Badge.vue'

withDefaults(
  defineProps<{ cartCount: number; userInitial?: string; siteName?: string }>(),
  { userInitial: 'U', siteName: 'jogak shop' },
)

const route = useRoute()
const pathname = computed(() => route.path)

const navLinks = [
  { to: '/', label: '전체' },
  { to: '/category/apparel', label: 'Apparel' },
  { to: '/category/tech', label: 'Tech' },
  { to: '/category/home', label: 'Home' },
  { to: '/category/beauty', label: 'Beauty' },
  { to: '/category/sports', label: 'Sports' },
]

function isActive(to: string): boolean {
  return to === '/' ? pathname.value === '/' : pathname.value.startsWith(to)
}
</script>

<template>
  <header class="sticky top-0 z-10 bg-white border-b border-ink-100">
    <div class="max-w-6xl mx-auto h-14 px-4 flex items-center gap-6">
      <NuxtLink to="/" class="font-bold text-ink-900 tracking-tight">{{ siteName }}</NuxtLink>
      <nav class="hidden md:flex items-center gap-1 flex-1">
        <NuxtLink
          v-for="l in navLinks"
          :key="l.to"
          :to="l.to"
          :class="[
            'px-3 h-9 inline-flex items-center text-sm rounded-md transition-colors',
            isActive(l.to)
              ? 'text-brand-700 bg-brand-50 font-medium'
              : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100',
          ]"
        >{{ l.label }}</NuxtLink>
      </nav>
      <NuxtLink to="/cart" class="relative inline-flex items-center gap-2 text-sm text-ink-900 hover:text-brand-600">
        <span>🛒</span>
        <Badge v-if="cartCount > 0" tone="danger" :label="String(cartCount)" />
      </NuxtLink>
      <NuxtLink
        to="/account"
        class="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-100 text-ink-900 font-medium hover:bg-ink-200"
        aria-label="account"
      >{{ userInitial }}</NuxtLink>
    </div>
  </header>
</template>
