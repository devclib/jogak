import type { ReactElement } from 'react'
import { Outlet } from 'react-router-dom'
import { NavBar } from '../organisms/NavBar.tsx'
import { useCart } from '../../lib/cart-store.ts'

export function ShopLayout(): ReactElement {
  const cart = useCart()
  const count = cart.lines.reduce((sum, l) => sum + l.quantity, 0)
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar cartCount={count} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
      <footer className="mt-12 border-t border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-ink-400">
          jogak test-case — React + Vite + react-router. 데이터는 정적, 결제는 mock.
        </div>
      </footer>
    </div>
  )
}
