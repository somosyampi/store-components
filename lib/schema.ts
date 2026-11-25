import type { Image, Prices, Ratings, Review, Variation } from './types'

type Sku = {
  id: number
  sku?: string | null
  barcode?: string | null
  blocked_sale: boolean
  combinations: string
  prices: { data: Pick<Prices, 'price' | 'price_sale' | 'has_promotion'> }
  images: { data: Image[] }
}

type Input = {
  id: number
  name: string
  /** Sem query string: cada variante acrescenta `?sku={id}`. */
  url: string
  images: Image[]
  description?: string
  brand?: string
  category?: string
  variations: Variation[]
  skus: Sku[]
  ratings?: Pick<Ratings, 'average_rating' | 'total'> | null
  /** As avaliações exibidas na página. */
  reviews?: Review[]
}

const SCHEMA = 'https://schema.org/'

// ponytail: só cor e tamanho; outra variação (voltagem, sabor) segue só no nome da variante.
const property = (variation: string) => (/^cor(es)?$/i.test(variation.trim()) ? 'color' : /tamanho|numera[cç][aã]o|^tam\.?$/i.test(variation.trim()) ? 'size' : null)

function offer({ blocked_sale, prices }: Sku, url: string) {
  const { price, price_sale, has_promotion } = prices.data

  return {
    '@type': 'Offer',
    url,
    price,
    priceCurrency: 'BRL',
    availability: `${SCHEMA}${blocked_sale ? 'OutOfStock' : 'InStock'}`,
    ...(has_promotion &&
      price_sale > price && {
        priceSpecification: { '@type': 'UnitPriceSpecification', priceType: `${SCHEMA}StrikethroughPrice`, price: price_sale, priceCurrency: 'BRL' },
      }),
  }
}

// Só quando têm a forma que o Google aceita.
const codes = ({ sku, barcode }: Sku) => ({
  ...(sku && /^\S+$/.test(sku) && { sku }),
  ...(barcode && /^(\d{8}|\d{12,14})$/.test(barcode) && { gtin: barcode }),
})

function rated(ratings: Input['ratings'], reviews: Review[]) {
  const value = Number(ratings?.average_rating)
  if (!ratings?.total || !value) return {}

  return {
    aggregateRating: { '@type': 'AggregateRating', ratingValue: Math.round(value * 10) / 10, reviewCount: ratings.total },
    ...(reviews.length && {
      review: reviews.map((review) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: review.name },
        datePublished: review.created_at.date.slice(0, 10),
        reviewRating: { '@type': 'Rating', ratingValue: review.rating },
        reviewBody: review.message,
      })),
    }),
  }
}

// O Google só trata cor e tamanho como variantes se cada uma tiver o seu endereço: daí o `?sku={id}`.
export function productSchema({ id, name, url, images, description, brand, category, variations, skus, ratings, reviews = [] }: Input) {
  const shared = { ...(category && { category }) }
  const about = { name, ...(description && { description }), ...(brand && { brand: { '@type': 'Brand', name: brand } }), ...rated(ratings, reviews) }
  const photos = (sku?: Sku) => (sku?.images.data.length ? sku.images.data : images).map((image) => image.url)

  if (!variations.length || skus.length < 2) {
    const [sku] = skus

    return { '@type': 'Product', ...about, image: photos(sku), ...shared, ...(sku && { ...codes(sku), offers: offer(sku, url) }) }
  }

  const properties = variations.map((variation) => property(variation.name))
  const variesBy = [...new Set(properties.flatMap((key) => (key ? `${SCHEMA}${key}` : [])))]

  return {
    '@type': 'ProductGroup',
    ...about,
    url,
    productGroupID: String(id),
    ...(variesBy.length && { variesBy }),
    hasVariant: skus.map((sku) => {
      const ids = sku.combinations.split('-')
      const values = variations.map((variation) => variation.values.data.find((value) => ids.includes(String(value.id)))?.value)

      return {
        '@type': 'Product',
        name: [name, ...values].filter(Boolean).join(' '),
        ...codes(sku),
        image: photos(sku),
        ...Object.fromEntries(properties.flatMap((key, index) => (key && values[index] ? [[key, values[index]]] : []))),
        ...shared,
        offers: offer(sku, `${url}?sku=${sku.id}`),
      }
    }),
  }
}

type Store = {
  name: string
  url: string
  logo?: string | null
  email?: string | null
  legalName?: string | null
  taxId?: string | null
  address?: { street?: string | null; number?: string | null; complement?: string | null; city?: string | null; state?: string | null; zipcode?: string | null } | null
  links?: (string | null | undefined)[]
}

/** Um perfil tem caminho: o endereço só do site da rede (https://x.com/) é campo pela metade. */
const isProfile = (link: string) => URL.canParse(link) && new URL(link).pathname.length > 1

export function storeSchema({ name, url, logo, email, legalName, taxId, address, links = [] }: Store) {
  const street = [address?.street, address?.number].filter(Boolean).join(', ')
  const sameAs = links.filter((link): link is string => !!link && isProfile(link))

  return {
    '@type': 'OnlineStore',
    name,
    url,
    ...(logo && { logo }),
    ...(email && { email }),
    ...(legalName && legalName !== name && { legalName }),
    ...(taxId && { taxID: taxId }),
    ...(street &&
      address?.city && {
        address: {
          '@type': 'PostalAddress',
          streetAddress: address.complement ? `${street} - ${address.complement}` : street,
          addressLocality: address.city,
          ...(address.state && { addressRegion: address.state }),
          ...(address.zipcode && { postalCode: address.zipcode }),
          // Sempre Brasil, onde a Yampi opera: o CNPJ só vale como `taxID` junto com o país.
          addressCountry: 'BR',
        },
      }),
    ...(sameAs.length && { sameAs }),
  }
}
