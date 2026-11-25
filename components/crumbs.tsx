import Link from 'next/link'
import { JsonLd } from './json-ld'

export type Crumb = { name: string; href: string }

export const CRUMBS_LABELS = { crumbs: 'Você está em', home: 'Início' }
export type CrumbsLabels = typeof CRUMBS_LABELS

type Props = {
  trail: Crumb[]
  /** Nome da página atual: fecha a trilha que vai para os buscadores (na tela, é o título da página). */
  current?: string
  /**
   * Endereço público da loja (ex.: https://www.minhaloja.com.br): base dos links que vão para
   * os buscadores. Sem ele, a trilha aparece só na tela.
   */
  siteUrl?: string
  labels?: Partial<CrumbsLabels>
}

/**
 * Trilha de navegação. A mesma trilha vai para os buscadores, como dados estruturados.
 * Classe: `crumbs`.
 */
export function Crumbs({ trail, current, siteUrl, labels }: Props) {
  const t = { ...CRUMBS_LABELS, ...labels }
  const steps = [{ name: t.home, href: '/' }, ...trail].map((step) => ({ name: step.name, item: siteUrl + step.href }))
  // O buscador pede ao menos dois itens; o último pode ser a própria página, sem endereço.
  const items = current ? [...steps, { name: current }] : steps

  return (
    <nav aria-label={t.crumbs} className="crumbs">
      {siteUrl && items.length > 1 && (
        <JsonLd data={{ '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })) }} />
      )}
      <ol>
        <li>
          <Link href="/">{t.home}</Link>
        </li>
        {trail.map((crumb) => (
          <li key={crumb.href}>
            <Link href={crumb.href}>{crumb.name}</Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
