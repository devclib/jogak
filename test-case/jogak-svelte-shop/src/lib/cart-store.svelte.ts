import type { Cart, CartLine } from '@jogak-shop/shared'

const STORAGE_KEY = 'jogak-shop-svelte:cart'

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

const initial = loadCart()
const state = $state<{ lines: CartLine[]; updatedAt: number }>({
  lines: [...initial.lines],
  updatedAt: initial.updatedAt,
})

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function findIndex(productId: string, variantId: string | null): number {
  return state.lines.findIndex((l) => l.productId === productId && l.variantId === variantId)
}

export const cart = {
  get state(): { readonly lines: readonly CartLine[]; readonly updatedAt: number } {
    return state
  },
  add(productId: string, variantId: string | null, quantity: number): void {
    const idx = findIndex(productId, variantId)
    if (idx >= 0) {
      const existing = state.lines[idx]
      if (existing) state.lines[idx] = { ...existing, quantity: existing.quantity + quantity }
    } else {
      state.lines.push({ productId, variantId, quantity })
    }
    state.updatedAt = Date.UTC(2026, 5, 4)
    persist()
  },
  setQuantity(productId: string, variantId: string | null, quantity: number): void {
    const idx = findIndex(productId, variantId)
    if (idx < 0) return
    if (quantity <= 0) state.lines.splice(idx, 1)
    else {
      const existing = state.lines[idx]
      if (existing) state.lines[idx] = { ...existing, quantity }
    }
    state.updatedAt = Date.UTC(2026, 5, 4)
    persist()
  },
  remove(productId: string, variantId: string | null): void {
    const idx = findIndex(productId, variantId)
    if (idx >= 0) {
      state.lines.splice(idx, 1)
      state.updatedAt = Date.UTC(2026, 5, 4)
      persist()
    }
  },
  clear(): void {
    state.lines.splice(0, state.lines.length)
    state.updatedAt = Date.UTC(2026, 5, 4)
    persist()
  },
}
