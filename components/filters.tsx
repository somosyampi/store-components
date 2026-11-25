import Link from 'next/link'
import { fill, plural } from '../lib/labels'
import { listingHref, toggleFilter, type Facet, type ListingState } from '../lib/routes'
import { CloseIcon } from './icons'

export const FILTERS_LABELS = {
  filters: 'Filtros',
  filter: 'Filtrar',
  closeFilters: 'Fechar filtros',
  removeFilter: 'Remover filtro {name}',
  clearFilters: 'Limpar filtros',
  results_one: 'Ver {count} produto',
  results_other: 'Ver {count} produtos',
}
export type FiltersLabels = typeof FILTERS_LABELS

/** Id do painel de filtros: é o alvo (`popoverTarget`) do botão que o abre no celular. */
export const FILTERS_ID = 'filtros'

type Props = {
  facets: Facet[]
  state: ListingState
  /** Caminho da vitrine e parâmetros fixos dela (o termo, na busca). */
  base: string
  extra?: Record<string, string>
  total: number
  labels?: Partial<FiltersLabels>
}

/**
 * Filtros da vitrine. Cada opção é um link para a mesma página com o filtro ligado ou
 * desligado, então tudo funciona sem JavaScript. O painel é um popover nativo: o tema decide
 * se ele é uma gaveta (celular) ou uma coluna sempre visível (desktop).
 * Classes: `filters`, `filters-head`, `filters-selected`, `filters-clear`, `filter`, `swatch`,
 * `check`, `filters-done`; e as de uso geral `icon-button`, `button` e `note`.
 */
export function Filters({ facets, state, base, extra, total, labels }: Props) {
  if (!facets.length) return null

  const t = { ...FILTERS_LABELS, ...labels }
  const href = (next: ListingState) => listingHref(base, next, extra)
  const selected = facets.flatMap((group) =>
    group.options.filter((option) => state.filters?.[group.param]?.includes(option.value)).map((option) => ({ group, option })),
  )

  return (
    <aside id={FILTERS_ID} popover="auto" className="filters" aria-label={t.filters}>
      <div className="filters-head">
        <h2>{t.filter}</h2>
        <button className="icon-button" popoverTarget={FILTERS_ID} popoverTargetAction="hide" aria-label={t.closeFilters}>
          <CloseIcon />
        </button>
      </div>

      {selected.length > 0 && (
        <ul className="filters-selected">
          {selected.map(({ group, option }) => (
            <li key={group.label + option.value}>
              <Link
                href={href(toggleFilter(state, group.param, option.value))}
                rel="nofollow"
                scroll={false}
                aria-label={fill(t.removeFilter, { name: option.label })}
              >
                {option.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href={href({ sort_by: state.sort_by, page: 1 })} rel="nofollow" scroll={false} className="filters-clear">
              {t.clearFilters}
            </Link>
          </li>
        </ul>
      )}

      {facets.map((group) => (
        <details key={group.param + group.label} className="filter" open>
          <summary>{group.label}</summary>
          <ul>
            {group.options.map((option) => (
              <li key={option.value}>
                <Link
                  href={href(toggleFilter(state, group.param, option.value))}
                  rel="nofollow"
                  scroll={false}
                  aria-current={state.filters?.[group.param]?.includes(option.value) ? 'true' : undefined}
                >
                  {option.color ? <span className="swatch" style={{ background: option.color }} /> : <span className="check" />}
                  {option.label}
                  {option.count !== undefined && <span className="note">{option.count}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}

      <button className="button filters-done" popoverTarget={FILTERS_ID} popoverTargetAction="hide">
        {plural(t.results_one, t.results_other, total)}
      </button>
    </aside>
  )
}
