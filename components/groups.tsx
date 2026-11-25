import Image from 'next/image'
import Link from 'next/link'
import type { CardProduct } from '../lib/types'

export type Sibling = Pick<CardProduct, 'id' | 'name' | 'slug' | 'images'>

type Props = { products: Sibling[]; title?: string; size?: number }

/** Classes: groups, group-media. De uso geral: eyebrow. */
export function Groups({ products, title = 'Outras opções', size = 64 }: Props) {
  if (!products.length) return null

  return (
    <nav className="groups" aria-label={title}>
      <p className="eyebrow">{title}</p>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <Link href={`/produto/${product.slug}`} title={product.name} aria-label={product.name}>
              <span className="group-media">{product.images.data[0] && <Image src={product.images.data[0].url} alt="" width={size} height={size} />}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
