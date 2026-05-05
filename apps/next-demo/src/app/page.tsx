import Link from 'next/link'
import type { ReactElement } from 'react'

export default function Home(): ReactElement {
  return (
    <main style={{ padding: 32, maxWidth: 720 }}>
      <h1 style={{ marginBottom: 8 }}>Jogak × Next.js</h1>
      <p style={{ color: '#4b5563', marginBottom: 16 }}>
        Jogak 쇼케이스 SPA가 Next.js App Router에 클라이언트 라우트로 마운트되어 있습니다.
        별도 dev server나 manager UI 없이 호스트 번들러(Turbopack)에 직접 임베드됩니다.
      </p>
      <Link href="/jogak" style={{ color: '#2563eb', fontWeight: 600 }}>
        → /jogak 페이지로 이동
      </Link>
    </main>
  )
}
