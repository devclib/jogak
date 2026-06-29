<script lang="ts">
  import { navigate } from 'svelte-routing'
  import type { Address, Order } from '@jogak-shop/shared'
  import { mockPay } from '@jogak-shop/shared'
  import AddressForm from '../components/molecules/AddressForm.svelte'
  import CartSummary from '../components/organisms/CartSummary.svelte'
  import Button from '../components/atoms/Button.svelte'
  import { cart } from '../lib/cart-store.svelte'

  let address = $state<Address>({
    recipient: '', line1: '', line2: '', city: '', postalCode: '', country: 'KR', phone: '',
  })
  let placing = $state(false)
  let order = $state<Order | null>(null)

  let canPlace = $derived(
    cart.state.lines.length > 0 && address.recipient !== '' && address.line1 !== '' && address.phone !== '',
  )

  async function place(): Promise<void> {
    if (!canPlace) return
    placing = true
    const o = await mockPay(cart.state, address)
    order = o
    cart.clear()
    placing = false
  }
</script>

{#if order}
  <div class="max-w-xl mx-auto bg-white rounded-lg border border-ink-100 p-8 text-center space-y-4">
    <div class="text-5xl">✅</div>
    <h1 class="text-2xl font-bold">주문이 완료됐습니다</h1>
    <p class="text-ink-600">주문 번호: <span class="font-semibold text-ink-900">{order.id}</span></p>
    <p class="text-xs text-ink-400">mock 결제 — 실제 결제 게이트웨이 호출 없음.</p>
    <Button label="쇼핑 계속하기" fullWidth onclick={() => navigate('/')} />
  </div>
{:else}
  <div class="grid grid-cols-12 gap-6">
    <div class="col-span-12 lg:col-span-8 space-y-6">
      <h1 class="text-2xl font-bold text-ink-900">결제</h1>
      <section class="bg-white rounded-lg border border-ink-100 p-5 space-y-3">
        <h2 class="font-semibold text-ink-900">배송지</h2>
        <AddressForm value={address} disabled={placing} onupdate={(a) => (address = a)} />
      </section>
      <section class="bg-white rounded-lg border border-ink-100 p-5 space-y-3">
        <h2 class="font-semibold text-ink-900">결제 수단</h2>
        <p class="text-sm text-ink-600">Mock — 결제 게이트웨이 호출 없이 항상 성공.</p>
        <Button label="주문 확정" disabled={!canPlace || placing} loading={placing} size="lg" fullWidth onclick={place} />
      </section>
    </div>
    <div class="col-span-12 lg:col-span-4">
      <CartSummary cart={cart.state} compact />
    </div>
  </div>
{/if}
