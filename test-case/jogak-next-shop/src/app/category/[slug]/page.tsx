import { categories } from '@jogak-shop/shared'
import { CategoryClient } from './CategoryClient.tsx'

export function generateStaticParams(): Array<{ slug: string }> {
  return categories.map((c) => ({ slug: c.slug }))
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<React.ReactElement> {
  const { slug } = await params
  return <CategoryClient slug={slug} />
}
