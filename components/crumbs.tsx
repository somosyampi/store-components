import Link from 'next/link'
import { JsonLd } from './json-ld'

export type Crumb = { name: string; href: string }

export const CRUMBS_LABELS = { crumbs: 'Você está em', home: 'Início' }
export type CrumbsLabels = typeof CRUMBS_LABELS

type Props = {
  trail: Crumb[]
  /** Endereço público da loja (ex.: https://www.minhaloja.com.br): base dos links que vão para os buscadores. */
  siteUrl: string
  labels?: Partial<CrumbsLabels>
}

/**
 * Trilha de navegação. A mesma trilha vai para os buscadores, como dados estruturados.
 * Classe: `crumbs`.
 */
export function Crumbs({ trail, siteUrl, labels }: Props) {
  const t = { ...CRUMBS_LABELS, ...labels }
  const steps = [{ name: t.home, href: '/' }, ...trail]

  return (
    <nav aria-label={t.crumbs} className="crumbs">
      {/* Uma trilha só com o início não diz nada ao buscador (ele pede ao menos dois itens). */}
      {trail.length > 0 && (
        <JsonLd
          data={{
            '@type': 'BreadcrumbList',
            itemListElement: steps.map((step, index) => ({ '@type': 'ListItem', position: index + 1, name: step.name, item: siteUrl + step.href })),
          }}
        />
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
