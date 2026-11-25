// Dados estruturados (schema.org) no formato que o Google pede para páginas em que se compra
// ("merchant listings"): o preço é sempre um `Offer`, e as variações são um `ProductGroup` com
// um `Product` por SKU.

import type { Image, Prices, Variation } from './types'

type Sku = {
  id: number
  /** Código do SKU e código de barras (EAN/GTIN), como cadastrados pelo lojista. */
  sku?: string | null
  barcode?: string | null
  blocked_sale: boolean
  combinations: string
  prices: { data: Pick<Prices, 'price' | 'price_sale' | 'has_promotion'> }
  images: { data: Image[] }
}

type Input = {
  /** Id do produto: identifica o grupo de variações. */
  id: number
  name: string
  /** Endereço completo da página do produto, sem query string. */
  url: string
  images: Image[]
  description?: string
  brand?: string
  /** Categoria em texto, do geral para o específico (ex.: "Bolsas > Carteiras"). */
  category?: string
  variations: Variation[]
  skus: Sku[]
}

const SCHEMA = 'https://schema.org/'

/**
 * A propriedade do schema.org que corresponde a uma variação cadastrada pelo lojista.
 * ponytail: só cor e tamanho; outra variação (voltagem, sabor) segue só no nome da variante.
 */
const property = (variation: string) => (/^cor(es)?$/i.test(variation.trim()) ? 'color' : /tamanho|numera[cç][aã]o|^tam\.?$/i.test(variation.trim()) ? 'size' : null)

/** Um SKU à venda (ou esgotado) pelo preço final; em promoção, com o preço cheio riscado. */
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

/** Código e GTIN do SKU, só quando têm a forma que o Google aceita. */
const codes = ({ sku, barcode }: Sku) => ({
  ...(sku && /^\S+$/.test(sku) && { sku }),
  ...(barcode && /^(\d{8}|\d{12,14})$/.test(barcode) && { gtin: barcode }),
})

/**
 * O produto como os buscadores o leem. Com variações, cada SKU é uma variante com o endereço
 * `?sku={id}`, que abre a página já com ela escolhida (ver `ProductView`): o Google só trata
 * tamanhos e cores como variantes se cada uma tiver o seu endereço.
 */
export function productSchema({ id, name, url, images, description, brand, category, variations, skus }: Input) {
  const shared = { ...(category && { category }) }
  const about = { name, ...(description && { description }), ...(brand && { brand: { '@type': 'Brand', name: brand } }) }
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
      // O valor deste SKU em cada variação, na ordem em que a loja as cadastrou.
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
  /** Endereço público da loja. */
  url: string
  logo?: string | null
  email?: string | null
  /** Razão social e CNPJ. */
  legalName?: string | null
  taxId?: string | null
  address?: { street?: string | null; number?: string | null; complement?: string | null; city?: string | null; state?: string | null; zipcode?: string | null } | null
  /** Perfis da loja em redes sociais. */
  links?: (string | null | undefined)[]
}

/** Um perfil tem caminho: o endereço só do site da rede (https://x.com/) é campo pela metade. */
const isProfile = (link: string) => URL.canParse(link) && new URL(link).pathname.length > 1

/**
 * A loja como os buscadores a leem; vai uma vez, na home. O país é sempre o Brasil, onde a Yampi
 * opera (o CNPJ só vale como `taxID` junto com ele).
 */
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
          addressCountry: 'BR',
        },
      }),
    ...(sameAs.length && { sameAs }),
  }
}
