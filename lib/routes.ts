// O esquema de URLs da loja, num lugar só (e sem dependências, para poder ser testado
// com `npm test`).

/** Ordenações da vitrine (`sort_by`). Sem ordenação, valem os destaques definidos pela loja. */
export const SORTS = { newest: 'Novidades', lowest_price: 'Menor preço', highest_price: 'Maior preço' } as const
export type Sort = keyof typeof SORTS

/** Prefixo da URL → `context` da listagem pública: /categoria/…, /colecao/…, /promocao/… */
export const CONTEXTS = { categoria: 'category', colecao: 'collection', promocao: 'promotion' } as const

/**
 * Filtros aceitos na query string, com os mesmos nomes que a Yampi usa. Categoria, coleção e
 * promoção filtram por id; a busca por termo, por nome (`attributes` leva pares "Atributo:Valor").
 */
export const ID_FILTERS = ['category_id', 'brand_id', 'filter_id'] as const
export const NAME_FILTERS = ['categories_name', 'brand_name', 'attributes'] as const
export const FILTERS = [...ID_FILTERS, ...NAME_FILTERS] as const
export type FilterKey = (typeof FILTERS)[number]

export type ListingState = {
  sort_by?: Sort
  page: number
  filters?: Partial<Record<FilterKey, string[]>>
}

/** Um grupo de opções de filtro (marca, cor, categoria…) e a chave da query string que ele alimenta. */
export type Facet = {
  param: FilterKey
  label: string
  options: { value: string; label: string; color?: string | null; count?: number }[]
}

type Params = Record<string, string | string[] | undefined>

/** Última página aceita: só para um número absurdo na URL não seguir para a API. */
const MAX_PAGE = 1000

/**
 * ?sort_by=newest&page=2&filter_id=12 → estado da vitrine. Só entram os filtros de `keys`
 * (os da vitrine em questão) e o que tem a forma esperada: o resto cai no padrão em vez de
 * seguir para a API e de criar entradas de cache à toa.
 */
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

/** O inverso de listingState: a URL da mesma vitrine em outro estado. */
export function listingHref(base: string, { sort_by, page, filters = {} }: ListingState, extra: Record<string, string> = {}) {
  const query = new URLSearchParams(extra)
  for (const key of FILTERS) for (const value of filters[key] ?? []) query.append(key, value)
  if (sort_by) query.set('sort_by', sort_by)
  if (page > 1) query.set('page', String(page))

  return query.size ? `${base}?${query}` : base
}

/** Liga ou desliga uma opção de filtro, voltando para a primeira página. */
export function toggleFilter(state: ListingState, key: FilterKey, value: string): ListingState {
  const current = state.filters?.[key] ?? []
  const next = current.includes(value) ? current.filter((other) => other !== value) : [...current, value]

  return { ...state, page: 1, filters: { ...state.filters, [key]: next } }
}

/**
 * Converte um link da vitrine hospedada pela Yampi (é o que vem nos banners e nas seções
 * da home) na rota equivalente desta loja. Links para outros sites voltam como estão.
 */
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
