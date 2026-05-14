// Nextra 4 — root mdx-components. MDX 페이지가 docs theme component(헤딩 / 코드블록 /
// 콜아웃 등)를 자동으로 사용하도록 등록.
import { useMDXComponents as getDocsComponents } from 'nextra-theme-docs'

const docsComponents = getDocsComponents({})

type Components = Record<string, React.ComponentType<unknown>>

export function useMDXComponents(components: Components): Components {
  return { ...docsComponents, ...components } as Components
}
