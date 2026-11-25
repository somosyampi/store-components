import Image from 'next/image'
import Link from 'next/link'
import type { CardProduct } from '../lib/types'
import { Flags } from './flags'
import { Price } from './price'
import { QuickBuy } from './quick-buy'
import { Rating } from './rating'

export const CARD_SIZES = '(min-width: 700px) 25vw, 50vw'

type GridProps = {
  products: CardProduct[]
  quickBuy?: boolean
  /** Quantos cards carregam sem lazy loading: os que ficam acima da dobra. */
  eager?: number
  sizes?: string
}

/** Classes: grid e as de ProductCard. */
export function ProductGrid({ products, eager = 0, sizes, quickBuy }: GridProps) {
  return (
    <ul className="grid">
      {products.map((product, index) => (
        // Numa vitrine, o maior elemento da tela (LCP) costuma ser uma das duas primeiras fotos.
        <ProductCard key={product.id} product={product} eager={index < eager} priority={index < Math.min(eager, 2)} sizes={sizes} quickBuy={quickBuy} />
      ))}
    </ul>
  )
}

type CardProps = {
  product: CardProduct
  quickBuy?: boolean
  eager?: boolean
  priority?: boolean
  sizes?: string
}

/** Classes: card, card-media, card-tag, card-name e as de Flags, Rating e QuickBuy. */
export function ProductCard({ product, eager = false, priority = false, sizes = CARD_SIZES, quickBuy = false }: CardProps) {
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
          <Flags flags={product.flags?.data} />
        </span>
        <span className="card-name">{product.name}</span>
        {product.total_approved_reviews ? <Rating value={product.rating} count={product.total_approved_reviews} /> : null}
      </Link>
      <Price prices={prices} />
      {/* ponytail: só o produto sem variações; para escolher uma no card, abra um <dialog> com as opções do produto. */}
      {quickBuy && product.sku_id && !product.has_variations && !product.blocked_sale && <QuickBuy skuId={product.sku_id} name={product.name} />}
    </li>
  )
}
