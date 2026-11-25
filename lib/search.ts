// Serviço de busca da Yampi (search.yampi.com.br), usado do mesmo jeito que a vitrine
// oficial usa. É aberto e tem CORS liberado, então serve ao servidor e ao navegador.
//
//   /products/suggestions  termos sugeridos enquanto se digita; não registra nada
//   /products              resultado da busca; registra o termo entre os "mais buscados"
//
// Por isso as sugestões nunca chamam /products: cada tecla viraria um termo buscado. Sem
// termo, /products lista o catálogo inteiro (e não registra nada): é o que alimenta o sitemap.

import type { Facet, ListingState, Sort } from './routes'
import type { Prices } from './types'

export type Hit = {
  id: number
  name: string
  slug: string
  image_url: string | null
  /** Preço cheio. */
  price: number
  /** Preço promocional; 0 quando o produto não está em promoção. */
  discount_price: number
}

type Bucket = { key: string; doc_count: number }

/** Agregações do resultado: é delas que saem os filtros da busca. */
type Aggs = {
  brands?: { buckets: Bucket[] }
  categories?: Bucket[]
  attributes?: { key: string; values: { buckets: Bucket[] } }[]
}

/** Corte de relevância que a vitrine da Yampi envia nas duas rotas. */
const MIN_SCORE = '9'

const ORDER: Record<Sort, string> = { newest: 'external_created_at', lowest_price: 'price:asc', highest_price: 'price:desc' }

type Source = { endpoint: string; storeId: number; signal?: AbortSignal }

async function get<T>({ endpoint, storeId, signal }: Source, path: string, params: [string, string][]): Promise<T> {
  const query = new URLSearchParams([['store_id', String(storeId)], ['min_score', MIN_SCORE], ...params])
  // Sem um sinal de quem chama, a espera tem limite: uma busca travada não segura a página.
  const response = await fetch(`${endpoint}/v1/search/public/${path}?${query}`, { signal: signal ?? AbortSignal.timeout?.(10_000), headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`A busca da Yampi respondeu ${response.status}`)

  return response.json()
}

/**
 * GET {endpoint}/v1/search/public/products/suggestions — até 9 termos que completam o que
 * foi digitado. Sem `q`, devolve os termos mais buscados da loja.
 */
export async function suggest(source: Source, q = ''): Promise<string[]> {
  const { data } = await get<{ data: unknown }>(source, 'products/suggestions', q ? [['q', q]] : [])

  return Array.isArray(data) ? data.filter((term) => typeof term === 'string').slice(0, 9) : []
}

/**
 * GET {endpoint}/v1/search/public/products, sem termo — os slugs de todos os produtos ativos.
 * ponytail: para em 50 páginas (5.000 produtos); um catálogo maior pede um índice de sitemaps.
 */
export async function catalog(source: Source): Promise<string[]> {
  const slugs: string[] = []
  for (let page = 1, last = 1; page <= last && page <= 50; page++) {
    const { data } = await get<{ data: { data: { content: { slug: string } }[]; last_page: number } }>(source, 'products', [
      ['paginate', 'true'],
      ['active', 'true'],
      ['include', 'slug'],
      ['limit', '100'],
      ['page', String(page)],
    ])
    slugs.push(...data.data.map((hit) => hit.content.slug))
    last = data.last_page
  }

  return slugs
}

type Options = Source & ListingState & { q: string; limit?: number }

/** GET {endpoint}/v1/search/public/products — produtos encontrados para um termo, e os filtros possíveis. */
export async function search({ q, limit = 24, page, sort_by, filters = {}, ...source }: Options) {
  // "Cor:Marrom" + "Cor:Preto" + "Fecho:Zíper" → "Cor:Marrom;Preto|Fecho:Zíper"
  const attributes = Object.entries(Object.groupBy(filters.attributes ?? [], (pair) => pair.split(':')[0]))
    .map(([name, pairs = []]) => `${name}:${pairs.map((pair) => pair.slice(name.length + 1)).join(';')}`)
    .join('|')

  const { data, aggs } = await get<{ data: { data: { content: Hit }[]; total: number; last_page: number }; aggs?: Aggs }>(source, 'products', [
    ['q', q],
    ['paginate', 'true'],
    ['active', 'true'],
    ['aggs', 'true'],
    ['include', 'id,name,slug,image_url,price,discount_price'],
    ['limit', String(limit)],
    ['page', String(page)],
    ...(sort_by ? [['sort', ORDER[sort_by]] as [string, string]] : []),
    ...(filters.categories_name ?? []).map((name): [string, string] => ['categories_name[]', name]),
    ...(filters.brand_name ?? []).map((name): [string, string] => ['brand_name[]', name]),
    ...(attributes ? [['attributes', attributes] as [string, string]] : []),
  ])

  return { hits: data.data.map((hit) => hit.content), total: data.total, pages: data.last_page, facets: facets(aggs ?? {}) }
}

function facets({ categories = [], brands, attributes = [] }: Aggs): Facet[] {
  const options = (buckets: Bucket[], value = (key: string) => key) =>
    buckets.map(({ key, doc_count }) => ({ value: value(key), label: key, count: doc_count }))

  return usefulGroups([
    { param: 'categories_name', label: 'Categorias', options: options(categories) },
    { param: 'brand_name', label: 'Marca', options: options(brands?.buckets ?? []) },
    ...attributes.map(({ key, values }) => ({
      param: 'attributes' as const,
      label: key,
      options: options(values.buckets, (value) => `${key}:${value}`),
    })),
  ])
}

/** Tira os grupos vazios e o de marca quando a loja só tem uma (não haveria o que filtrar). */
export const usefulGroups = (groups: Facet[]) =>
  groups.filter(({ param, options }) => options.length > (param.startsWith('brand') ? 1 : 0))

/**
 * O preço de um resultado da busca, no formato usado pelos cards. É o preço de cadastro: o
 * serviço de busca não conhece as promoções da loja; o preço final só vem no detalhe do produto.
 */
export const hitPrices = ({ price, discount_price }: Hit): Prices => ({
  price: discount_price || price,
  price_sale: price,
  has_promotion: discount_price > 0 && discount_price < price,
  percent_discount: discount_price > 0 ? (1 - discount_price / price) * 100 : 0,
})
