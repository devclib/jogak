import nextra from 'nextra'

const withNextra = nextra({
  // Nextra 4 plugin은 mdx-components를 자동 인식. 별도 옵션은 root에서 처리.
  defaultShowCopyCode: true,
  search: {
    codeblocks: false,
  },
})

export default withNextra({
  reactStrictMode: true,
  // Vercel deploy 가정 — server runtime. GitHub Pages로 옮기려면 output: 'export'.
})
