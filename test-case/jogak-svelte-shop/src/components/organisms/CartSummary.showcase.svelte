<script lang="ts">
  import type { Cart } from '@jogak-shop/shared'
  import CartSummary from './CartSummary.svelte'

  let {
    kind = 'mixed' as 'empty' | 'small' | 'large' | 'mixed',
    compact = false,
  }: { kind?: 'empty' | 'small' | 'large' | 'mixed'; compact?: boolean } = $props()

  const carts: Record<string, Cart> = {
    empty: { lines: [], updatedAt: 0 },
    small: { lines: [{ productId: 'p-007', variantId: null, quantity: 1 }], updatedAt: 0 },
    large: {
      lines: [
        { productId: 'p-003', variantId: 'v-m', quantity: 1 },
        { productId: 'p-006', variantId: 'v-black', quantity: 1 },
      ],
      updatedAt: 0,
    },
    mixed: {
      lines: [
        { productId: 'p-001', variantId: 'v-m', quantity: 2 },
        { productId: 'p-007', variantId: null, quantity: 1 },
        { productId: 'p-011', variantId: null, quantity: 3 },
      ],
      updatedAt: 0,
    },
  }

  let cart = $derived(carts[kind] ?? carts.empty!)
</script>

<div class="max-w-sm">
  <CartSummary {cart} {compact} />
</div>
