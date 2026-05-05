import type { ReactElement, ReactNode } from 'react'

export const metadata = {
  title: 'Jogak Next Demo',
  description: 'Jogak showcase mounted into Next.js App Router',
}

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
