<script lang="ts">
  import { navigate } from 'svelte-routing'
  import { products } from '@jogak-shop/shared'
  import CartItemRow from '../components/molecules/CartItemRow.svelte'
  import CartSummary from '../components/organisms/CartSummary.svelte'
  import Button from '../components/atoms/Button.svelte'
  import { cart } from '../lib/cart-store.svelte'

  let empty = $derived(cart.state.lines.length === 0)
</script>

<div class="grid grid-cols-12 gap-6">
  <div class="col-span-12 lg:col-span-8 space-y-3">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-ink-900">장바구니</h1>
      {#if !empty}
        <button type="button" class="text-sm text-ink-400 hover:text-danger-500" onclick={() => cart.clear()}>
          전체 비우기
        </button>
      {/if}
    </header>
    {#if empty}
      <div class="text-center py-16 space-y-4 bg-white border border-dashed border-ink-200 rounded-lg">
        <p class="text-ink-400">장바구니가 비어 있습니다.</p>
        <Button label="쇼핑 계속하기" variant="secondary" onclick={() => navigate('/')} />
      </div>
    {:else}
      <div class="space-y-3">
        {#each cart.state.lines as line (`${line.productId}:${line.variantId ?? '_'}`)}
          {@const product = products.find((p) => p.id === line.productId)}
          {#if product}
            <CartItemRow
              {line}
              {product}
              onquantitychange={cart.setQuantity}
              onremove={cart.remove}
            />
          {/if}
        {/each}
      </div>
    {/if}
  </div>
  <div class="col-span-12 lg:col-span-4">
    <CartSummary cart={cart.state} oncheckout={() => navigate('/checkout')} />
  </div>
</div>
