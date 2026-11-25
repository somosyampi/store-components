import Link from 'next/link'
import type { ReactNode } from 'react'
import { prose } from '../lib/format'
import { fill, plural } from '../lib/labels'
import { SORTS, listingHref, type Facet, type ListingState, type Sort } from '../lib/routes'
import type { CardProduct } from '../lib/types'
import { CRUMBS_LABELS, Crumbs, type Crumb } from './crumbs'
import { FILTERS_ID, FILTERS_LABELS, Filters } from './filters'
import { ProductGrid } from './product-card'

export const LISTING_LABELS = {
  ...CRUMBS_LABELS,
  ...FILTERS_LABELS,
  count_one: '{count} produto',
  count_other: '{count} produtos',
  sortBy: 'Ordenar por',
  featured: 'Destaques',
  empty: 'Nenhum produto encontrado.',
  pagination: 'Paginação',
  previous: 'Anterior',
  next: 'Próxima',
  page: 'Página {page} de {pages}',
}
export type ListingLabels = typeof LISTING_LABELS

type Props = {
  title: string
  products: CardProduct[]
  total: number
  pages: number
  state: ListingState
  base: string
  extra?: Record<string, string>
  facets: Facet[]
  trail?: Crumb[]
  siteUrl?: string
  description?: string | null
  eager?: number
  sizes?: string
  labels?: Partial<ListingLabels>
  children?: ReactNode
}

/**
 * Classes: page, listing-head, sorts, filters-open, listing-body, empty, pagination, prose,
 * listing-about, note; mais as de Crumbs, Filters e ProductGrid.
 */
export function Listing({ title, state, base, extra, facets, trail = [], siteUrl, description, eager = 4, sizes, labels, children, products, total, pages }: Props) {
  const t = { ...LISTING_LABELS, ...labels }
  const href = (next: ListingState) => listingHref(base, next, extra)
  const sorts: [Sort | undefined, string][] = [[undefined, t.featured], ...(Object.entries(SORTS) as [Sort, string][])]
  const filtering = Object.values(state.filters ?? {}).flat().length

  return (
    <div className="page">
      <header className="listing-head">
        <Crumbs trail={trail} current={title} siteUrl={siteUrl} labels={t} />
        <h1>{title}</h1>
        <p className="note">{plural(t.count_one, t.count_other, total)}</p>
      </header>

      {children}

      <nav aria-label={t.sortBy} className="sorts">
        {facets.length > 0 && (
          <button className="filters-open" popoverTarget={FILTERS_ID}>
            {t.filter}
            {filtering > 0 && ` (${filtering})`}
          </button>
        )}
        {sorts.map(([sort, label]) => (
          <Link key={label} href={href({ ...state, sort_by: sort, page: 1 })} aria-current={sort === state.sort_by ? 'true' : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="listing-body">
        <Filters facets={facets} state={state} base={base} extra={extra} total={total} labels={t} />

        <div>
          {products.length > 0 ? <ProductGrid products={products} eager={eager} sizes={sizes} /> : <p className="empty">{t.empty}</p>}

          {pages > 1 && (
            <nav aria-label={t.pagination} className="pagination">
              {state.page > 1 ? (
                <Link href={href({ ...state, page: state.page - 1 })} rel="prev">
                  {t.previous}
                </Link>
              ) : (
                <span />
              )}
              <span>{fill(t.page, { page: state.page, pages })}</span>
              {state.page < pages ? (
                <Link href={href({ ...state, page: state.page + 1 })} rel="next">
                  {t.next}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </div>

      {description && state.page === 1 && (
        <section className="prose listing-about" dangerouslySetInnerHTML={{ __html: prose(description, 2) }} />
      )}
    </div>
  )
}

/** Classes: page, listing-head, skeleton, skeleton-title, grid, card, card-media. */
export function ListingSkeleton() {
  return (
    <div className="page" aria-busy="true">
      <header className="listing-head">
        <p className="skeleton skeleton-title" />
      </header>
      <ul className="grid">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="card">
            <span className="card-media skeleton" />
          </li>
        ))}
      </ul>
    </div>
  )
}
