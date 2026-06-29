import { products } from '@jogak-shop/shared'
import { ProductDetailClient } from './ProductDetailClient.tsx'

export function generateStaticParams(): Array<{ slug: string }> {
  return products.map((p) => ({ slug: p.slug }))
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<React.ReactElement> {
  const { slug } = await params
  return <ProductDetailClient slug={slug} />
}
