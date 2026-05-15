import type { ReactNode } from 'react'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  title: { default: 'Jogak', template: '%s — Jogak' },
  description:
    'A lightweight, fast component showcase. A drop-in alternative to Storybook with a leaner stack.',
  metadataBase: new URL('https://jogak.dev'),
}

const I18N = [
  { locale: 'en', name: 'English' },
  { locale: 'ko', name: '한국어' },
]

const EDIT_LINK: Record<string, string> = {
  en: 'Edit this page on GitHub',
  ko: 'GitHub에서 이 페이지 편집',
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const pageMap = await getPageMap(`/${lang}`)

  const navbar = (
    <Navbar
      logo={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <strong style={{ fontWeight: 700, fontSize: 18 }}>Jogak</strong>
          <span style={{ fontSize: 11, opacity: 0.6 }}>· 조각</span>
        </span>
      }
      projectLink="https://github.com/devclib/jogak"
    />
  )

  const footer = (
    <Footer>
      MIT {new Date().getFullYear()} ©{' '}
      <a href="https://github.com/devclib/jogak" target="_blank" rel="noopener noreferrer">
        Jogak
      </a>
      .
    </Footer>
  )

  return (
    <html lang={lang} dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/devclib/jogak/tree/main/website"
          i18n={I18N}
          editLink={EDIT_LINK[lang] ?? EDIT_LINK['en']}
          sidebar={{ defaultMenuCollapseLevel: 1, toggleButton: true }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
