import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
  search: {
    codeblocks: false,
  },
})

export default withNextra({
  reactStrictMode: true,
  // Nextra 4 i18n — content/{en,ko}/ + app/[lang]/ + middleware로 동작.
  i18n: {
    locales: ['en', 'ko'],
    defaultLocale: 'en',
  },
})
