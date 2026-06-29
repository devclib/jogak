import { reactive, readonly, watch } from 'vue'
import type { Cart, CartLine } from '@jogak-shop/shared'

const STORAGE_KEY = 'jogak-shop-vue:cart'

function loadCart(): Cart {
  if (typeof window === 'undefined') return { lines: [], updatedAt: 0 }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { lines: [], updatedAt: 0 }
    return JSON.parse(raw) as Cart
  } catch {
    return { lines: [], updatedAt: 0 }
  }
}

const state = reactive<Cart>(loadCart())

watch(
  () => state,
  (next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  },
  { deep: true },
)

function findIndex(productId: string, variantId: string | null): number {
  return state.lines.findIndex((l) => l.productId === productId && l.variantId === variantId)
}

export const cartStore = {
  state: readonly(state),
  add(productId: string, variantId: string | null, quantity: number): void {
    const idx = findIndex(productId, variantId)
    if (idx >= 0) {
      const existing = state.lines[idx]
      if (existing) {
        ;(state.lines as CartLine[])[idx] = { ...existing, quantity: existing.quantity + quantity }
      }
    } else {
      ;(state.lines as CartLine[]).push({ productId, variantId, quantity })
    }
    ;(state as { updatedAt: number }).updatedAt = Date.UTC(2026, 5, 4)
  },
  setQuantity(productId: string, variantId: string | null, quantity: number): void {
    const idx = findIndex(productId, variantId)
    if (idx < 0) return
    if (quantity <= 0) {
      ;(state.lines as CartLine[]).splice(idx, 1)
    } else {
      const existing = state.lines[idx]
      if (existing) {
        ;(state.lines as CartLine[])[idx] = { ...existing, quantity }
      }
    }
    ;(state as { updatedAt: number }).updatedAt = Date.UTC(2026, 5, 4)
  },
  remove(productId: string, variantId: string | null): void {
    const idx = findIndex(productId, variantId)
    if (idx >= 0) {
      ;(state.lines as CartLine[]).splice(idx, 1)
      ;(state as { updatedAt: number }).updatedAt = Date.UTC(2026, 5, 4)
    }
  },
  clear(): void {
    ;(state.lines as CartLine[]).splice(0, state.lines.length)
    ;(state as { updatedAt: number }).updatedAt = Date.UTC(2026, 5, 4)
  },
}
