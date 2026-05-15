import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents } from '../../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

interface PageParams {
  lang: string
  mdxPath?: string[]
}

export async function generateMetadata(props: { params: Promise<PageParams> }) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath, params.lang)
  return metadata
}

const Wrapper = useMDXComponents().wrapper

export default async function Page(props: { params: Promise<PageParams> }) {
  const params = await props.params
  const result = await importPage(params.mdxPath, params.lang)
  // `default`는 MDX 본문, 나머지(toc / metadata / sourceCode)는 Wrapper로 전달.
  const { default: MDXContent, ...rest } = result
  return (
    <Wrapper {...rest}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
