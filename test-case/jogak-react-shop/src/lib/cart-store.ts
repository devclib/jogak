import { useSyncExternalStore } from 'react'
import type { Cart, CartLine } from '@jogak-shop/shared'

const STORAGE_KEY = 'jogak-shop:cart'

function loadCart(): Cart {
  if (typeof window === 'undefined') return { lines: [], updatedAt: 0 }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { lines: [], updatedAt: 0 }
    const parsed = JSON.parse(raw) as Cart
    return parsed
  } catch {
    return { lines: [], updatedAt: 0 }
  }
}

let cart: Cart = loadCart()
const listeners = new Set<() => void>()

function emit(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  } catch {
    /* ignore quota */
  }
  listeners.forEach((l) => l())
}

function findIndex(productId: string, variantId: string | null): number {
  return cart.lines.findIndex((l) => l.productId === productId && l.variantId === variantId)
}

export const cartStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot(): Cart {
    return cart
  },
  add(productId: string, variantId: string | null, quantity: number): void {
    const idx = findIndex(productId, variantId)
    const lines: CartLine[] = [...cart.lines]
    if (idx >= 0) {
      const existing = lines[idx]
      if (existing) {
        lines[idx] = { ...existing, quantity: existing.quantity + quantity }
      }
    } else {
      lines.push({ productId, variantId, quantity })
    }
    cart = { lines, updatedAt: Date.UTC(2026, 5, 4) }
    emit()
  },
  setQuantity(productId: string, variantId: string | null, quantity: number): void {
    const idx = findIndex(productId, variantId)
    if (idx < 0) return
    const lines: CartLine[] = [...cart.lines]
    if (quantity <= 0) {
      lines.splice(idx, 1)
    } else {
      const existing = lines[idx]
      if (existing) {
        lines[idx] = { ...existing, quantity }
      }
    }
    cart = { lines, updatedAt: Date.UTC(2026, 5, 4) }
    emit()
  },
  remove(productId: string, variantId: string | null): void {
    cart = { lines: cart.lines.filter((l) => !(l.productId === productId && l.variantId === variantId)), updatedAt: Date.UTC(2026, 5, 4) }
    emit()
  },
  clear(): void {
    cart = { lines: [], updatedAt: Date.UTC(2026, 5, 4) }
    emit()
  },
}

export function useCart(): Cart {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getSnapshot)
}
