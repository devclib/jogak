<script setup lang="ts">
import { computed } from 'vue'
import NavBar from '../organisms/NavBar.vue'
import { cartStore } from '../../composables/useCart'

const count = computed(() => cartStore.state.lines.reduce((sum, l) => sum + l.quantity, 0))
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <NavBar :cart-count="count" />
    <main class="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
      <slot />
    </main>
    <footer class="mt-12 border-t border-ink-100 bg-white">
      <div class="max-w-6xl mx-auto px-4 py-6 text-xs text-ink-400">
        jogak test-case — Nuxt 4 + Vue 3. 데이터는 정적, 결제는 mock.
      </div>
    </footer>
  </div>
</template>
