export const SORTS = {
  best_sellers: 'Mais vendidos',
  newest: 'Novidades',
  rating: 'Melhor avaliação',
  lowest_price: 'Menor preço',
  highest_price: 'Maior preço',
  name_asc: 'A–Z',
  name_desc: 'Z–A',
} as const
export type Sort = keyof typeof SORTS

export const CONTEXTS = { categoria: 'category', colecao: 'collection', promocao: 'promotion' } as const

// Categoria, coleção e promoção filtram por id; a busca, por nome (`attributes` leva pares "Atributo:Valor").
export const ID_FILTERS = ['category_id', 'brand_id', 'filter_id'] as const
export const NAME_FILTERS = ['categories_name', 'brand_name', 'attributes'] as const
export const FILTERS = [...ID_FILTERS, ...NAME_FILTERS] as const
export type FilterKey = (typeof FILTERS)[number]

export type ListingState = {
  sort_by?: Sort
  page: number
  filters?: Partial<Record<FilterKey, string[]>>
}

export type Facet = {
  param: FilterKey
  label: string
  options: { value: string; label: string; color?: string | null; count?: number }[]
}

type Params = Record<string, string | string[] | undefined>

// Um número absurdo na URL não segue para a API.
const MAX_PAGE = 1000

// O que não tem a forma esperada cai no padrão, em vez de seguir da URL para a API.
export function listingState(params: Params, keys: readonly FilterKey[] = ID_FILTERS): ListingState {
  const sort = String(params.sort_by)
  const filters: ListingState['filters'] = {}
  for (const key of keys) {
    const values = [params[key] ?? []]
      .flat()
      // Ids são números (negativos identificam variações); nomes, textos curtos.
      .filter((value) => (key.endsWith('_id') ? /^-?\d{1,12}$/.test(value) : value.length > 0 && value.length <= 120))
      .slice(0, 20)
    if (values.length) filters[key] = values
  }

  return {
    sort_by: Object.hasOwn(SORTS, sort) ? (sort as Sort) : undefined,
    page: Math.min(MAX_PAGE, Math.max(1, Number.parseInt(String(params.page), 10) || 1)),
    filters,
  }
}

export function listingHref(base: string, { sort_by, page, filters = {} }: ListingState, extra: Record<string, string> = {}) {
  const query = new URLSearchParams(extra)
  for (const key of FILTERS) for (const value of filters[key] ?? []) query.append(key, value)
  if (sort_by) query.set('sort_by', sort_by)
  if (page > 1) query.set('page', String(page))

  return query.size ? `${base}?${query}` : base
}

export function toggleFilter(state: ListingState, key: FilterKey, value: string): ListingState {
  const current = state.filters?.[key] ?? []
  const next = current.includes(value) ? current.filter((other) => other !== value) : [...current, value]

  return { ...state, page: 1, filters: { ...state.filters, [key]: next } }
}

// Os links que o lojista cadastra (banners, seções da home) apontam para a vitrine hospedada pela Yampi.
export function toRoute(link: string, storeUrl: string) {
  const url = new URL(link, storeUrl)
  if (url.origin !== new URL(storeUrl).origin) return link

  const [first, second] = url.pathname.split('/').filter(Boolean)
  if (!first) return '/'
  if (second === 'p') return `/produto/${first}`
  if (second === 'l') return `/colecao/${first}`
  if (first === 'promocoes' && second) return `/promocao/${second}`
  if (first === 'atendimento' || first === 'busca') return url.pathname + url.search
  return `/categoria${url.pathname}`
}
