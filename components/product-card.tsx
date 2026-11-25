import Image from 'next/image'
import Link from 'next/link'
import type { CardProduct } from '../lib/types'
import { Price } from './price'

/** `sizes` da foto para uma grade de duas colunas no celular e quatro no desktop; informe o da grade do tema. */
export const CARD_SIZES = '(min-width: 700px) 25vw, 50vw'

type GridProps = {
  products: CardProduct[]
  /** Quantos cards ficam acima da dobra e não devem esperar o lazy loading. */
  eager?: number
  sizes?: string
}

/** Grade de produtos. Classes: grid e as de ProductCard. */
export function ProductGrid({ products, eager = 0, sizes }: GridProps) {
  return (
    <ul className="grid">
      {products.map((product, index) => (
        // Numa vitrine, o maior elemento da tela (LCP) costuma ser uma das duas primeiras fotos.
        <ProductCard key={product.id} product={product} eager={index < eager} priority={index < Math.min(eager, 2)} sizes={sizes} />
      ))}
    </ul>
  )
}

type CardProps = {
  product: CardProduct
  /** A foto carrega junto com a página, sem lazy loading. */
  eager?: boolean
  /** A foto é candidata a maior elemento da tela (LCP) e tem prioridade no carregamento. */
  priority?: boolean
  sizes?: string
}

/** Um produto na grade: foto, selo de desconto, nome e preço. Classes: card, card-media, card-tag, card-name. */
export function ProductCard({ product, eager = false, priority = false, sizes = CARD_SIZES }: CardProps) {
  const prices = product.prices.data
  const image = product.images.data[0]

  return (
    <li className="card">
      <Link href={`/produto/${product.slug}`}>
        <span className="card-media">
          {image && (
            <Image src={image.url} alt="" fill sizes={sizes} loading={eager ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} />
          )}
          {prices.has_promotion && prices.percent_discount >= 1 && (
            <span className="card-tag">−{Math.round(prices.percent_discount)}%</span>
          )}
        </span>
        <span className="card-name">{product.name}</span>
      </Link>
      <Price prices={prices} />
    </li>
  )
}
