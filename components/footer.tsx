import Link from 'next/link'
import type { ReactNode } from 'react'
import { fill } from '../lib/labels'
import type { Category } from '../lib/types'
import { Payments } from './payments'
import { whatsappUrl, type Phone } from './topbar'

const LABELS = {
  categories: 'Categorias',
  categoriesNav: 'Categorias no rodapé',
  pages: 'Atendimento',
  payments: 'Pagamento',
  contact: 'Fale com a loja',
  whatsapp: 'WhatsApp',
  social: 'Redes sociais',
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
  contact?: { whatsapp?: Phone | null; phone?: Phone | null; email?: string | null }
  /** Perfis da loja, como vêm no whois (`facebook_url`, `instagram_url`…). */
  social?: Record<string, string | null | undefined>
  labels?: Partial<FooterLabels>
  children?: ReactNode
}

const cnpj = (digits: string) => digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')

const NETWORKS: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', pinterest: 'Pinterest', tiktok: 'TikTok', twitter: 'X' }

/** Classes: footer, footer-grid, footer-name, footer-legal e a de Payments. */
export function Footer({ name, description, categories, pages, payments, company, contact = {}, social = {}, labels, children }: Props) {
  const t = { ...LABELS, ...labels }
  const profiles = Object.entries(NETWORKS).flatMap(([network, label]) => (social[`${network}_url`] ? { label, url: social[`${network}_url`] as string } : []))
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

        {(contact.whatsapp || contact.phone || contact.email) && (
          <div>
            <h2>{t.contact}</h2>
            <ul>
              {contact.whatsapp && (
                <li>
                  <a href={whatsappUrl(contact.whatsapp)} target="_blank" rel="noopener nofollow">
                    {t.whatsapp} {contact.whatsapp.formated_number}
                  </a>
                </li>
              )}
              {contact.phone && (
                <li>
                  <a href={`tel:+55${contact.phone.number.replace(/\D/g, '')}`}>{contact.phone.formated_number}</a>
                </li>
              )}
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
              )}
            </ul>
          </div>
        )}

        {profiles.length > 0 && (
          <div>
            <h2>{t.social}</h2>
            <ul>
              {profiles.map((profile) => (
                <li key={profile.label}>
                  <a href={profile.url} target="_blank" rel="noopener">
                    {profile.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
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
