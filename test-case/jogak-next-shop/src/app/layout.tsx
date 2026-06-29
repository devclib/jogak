import type { ReactNode } from 'react'
import { ShopLayout } from '../components/layouts/ShopLayout.tsx'
import './globals.css'

export const metadata = {
  title: 'jogak shop · Next.js',
  description: 'jogak test-case (Next.js App Router)',
}

export default function RootLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <html lang="ko">
      <body>
        <ShopLayout>{children}</ShopLayout>
      </body>
    </html>
  )
}
