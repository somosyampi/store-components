import Link from 'next/link'
import type { ReactNode } from 'react'
import { fill } from '../lib/labels'
import type { Category } from '../lib/types'
import { Payments } from './payments'

const LABELS = {
  categories: 'Categorias',
  categoriesNav: 'Categorias no rodapé',
  pages: 'Atendimento',
  payments: 'Pagamento',
  cnpj: 'CNPJ {number}',
}
export type FooterLabels = typeof LABELS

type Props = {
  name: string
  description?: string
  categories: Category[]
  pages: { name: string; slug: string }[]
  payments: { alias: string; name: string }[]
  company: { razao_social?: string | null; cnpj?: string | null; email?: string | null; address?: { full_address?: string | null } }
  labels?: Partial<FooterLabels>
  children?: ReactNode
}

const cnpj = (digits: string) => digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')

/** Classes: footer, footer-grid, footer-name, footer-legal e a de Payments. */
export function Footer({ name, description, categories, pages, payments, company, labels, children }: Props) {
  const t = { ...LABELS, ...labels }
  const legal = [company.razao_social, company.cnpj && fill(t.cnpj, { number: cnpj(company.cnpj) }), company.address?.full_address, company.email]

  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <p className="footer-name">{name}</p>
          {description && <p>{description}</p>}
        </div>

        <nav aria-label={t.categoriesNav}>
          <h2>{t.categories}</h2>
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={`/categoria/${category.slug}`}>{category.name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {pages.length > 0 && (
          <nav aria-label={t.pages}>
            <h2>{t.pages}</h2>
            <ul>
              {pages.map((page) => (
                <li key={page.slug}>
                  <Link href={`/atendimento/${page.slug}`}>{page.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {payments.length > 0 && (
          <div>
            <h2>{t.payments}</h2>
            <Payments payments={payments} />
          </div>
        )}
      </div>

      <p className="footer-legal">{legal.filter(Boolean).join(' · ')}</p>
      {children}
    </footer>
  )
}
