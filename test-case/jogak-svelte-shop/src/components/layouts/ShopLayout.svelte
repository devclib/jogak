<script lang="ts">
  import type { Snippet } from 'svelte'
  import NavBar from '../organisms/NavBar.svelte'
  import { cart } from '../../lib/cart-store.svelte'

  let { children }: { children: Snippet } = $props()
  let count = $derived(cart.state.lines.reduce((sum, l) => sum + l.quantity, 0))
</script>

<div class="min-h-screen flex flex-col">
  <NavBar cartCount={count} />
  <main class="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
    {@render children()}
  </main>
  <footer class="mt-12 border-t border-ink-100 bg-white">
    <div class="max-w-6xl mx-auto px-4 py-6 text-xs text-ink-400">
      jogak test-case — Svelte 5 + Vite + svelte-routing. 데이터는 정적, 결제는 mock.
    </div>
  </footer>
</div>
