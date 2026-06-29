import type { ReactElement } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '../atoms/Badge.tsx'

export interface NavBarProps {
  readonly cartCount: number
  readonly userInitial?: string
  readonly siteName?: string
}

const navLinks: readonly { to: string; label: string }[] = [
  { to: '/', label: '전체' },
  { to: '/category/apparel', label: 'Apparel' },
  { to: '/category/tech', label: 'Tech' },
  { to: '/category/home', label: 'Home' },
  { to: '/category/beauty', label: 'Beauty' },
  { to: '/category/sports', label: 'Sports' },
]

/**
 * 상단 nav — 로고 + 카테고리 링크 + 장바구니 아이콘.
 * react-router의 useLocation으로 active 표시.
 */
export function NavBar({ cartCount, userInitial = 'U', siteName = 'jogak shop' }: NavBarProps): ReactElement {
  const loc = useLocation()
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-ink-100">
      <div className="max-w-6xl mx-auto h-14 px-4 flex items-center gap-6">
        <Link to="/" className="font-bold text-ink-900 tracking-tight">
          {siteName}
        </Link>
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((l) => {
            const active = l.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(l.to)
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 h-9 inline-flex items-center text-sm rounded-md transition-colors ${active ? 'text-brand-700 bg-brand-50 font-medium' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'}`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
        <Link
          to="/cart"
          className="relative inline-flex items-center gap-2 text-sm text-ink-900 hover:text-brand-600"
        >
          <span>🛒</span>
          {cartCount > 0 ? <Badge tone="danger">{String(cartCount)}</Badge> : null}
        </Link>
        <Link
          to="/account"
          className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-100 text-ink-900 font-medium hover:bg-ink-200"
          aria-label="account"
        >
          {userInitial}
        </Link>
      </div>
    </header>
  )
}
