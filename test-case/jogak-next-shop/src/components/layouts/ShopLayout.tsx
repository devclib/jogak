'use client'

import type { ReactElement, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { NavBar } from '../organisms/NavBar.tsx'
import { useCart } from '../../lib/cart-store.ts'

export function ShopLayout({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname()
  const cart = useCart()
  // jogak preview는 NavBar/footer 없이 컴포넌트만 표시 (jogak 쇼케이스 의도)
  if (pathname?.startsWith('/jogak-preview') === true) {
    return <>{children}</>
  }
  const count = cart.lines.reduce((sum, l) => sum + l.quantity, 0)
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar cartCount={count} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <footer className="mt-12 border-t border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-ink-400">
          jogak test-case — Next.js 15 App Router. 데이터는 정적, 결제는 mock.
        </div>
      </footer>
    </div>
  )
}
