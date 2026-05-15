// Nextra 4 i18n — Accept-Language 기반 locale 감지 + `/{lang}` prefix redirect.
export { middleware } from 'nextra/locales'

export const config = {
  matcher: [
    // _next 정적 자원 / API / pagefind 인덱스 / 파일 확장자가 있는 요청 제외.
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest|robots.txt|sitemap.xml|_pagefind).*)',
  ],
}
