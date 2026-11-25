import Link from 'next/link'
import { JsonLd } from './json-ld'

export type Crumb = { name: string; href: string }

export const CRUMBS_LABELS = { crumbs: 'Você está em', home: 'Início' }
export type CrumbsLabels = typeof CRUMBS_LABELS

type Props = {
  trail: Crumb[]
  /** Só vai para os buscadores: na tela, a página atual é o título. */
  current?: string
  /** Sem ele, a trilha não vai para os buscadores. */
  siteUrl?: string
  labels?: Partial<CrumbsLabels>
}

/** Classe: crumbs. */
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
