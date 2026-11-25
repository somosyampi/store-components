import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Chrome } from '../lib/home'
import { toRoute } from '../lib/routes'

export type Phone = { number: string; formated_number: string }

// wa.me abre o aplicativo no celular e o WhatsApp Web no computador; o endereço do whois só serve ao computador.
export const whatsappUrl = ({ number }: Phone) => `https://wa.me/55${number.replace(/\D/g, '')}`

/** Classe: notice, com as cores do lojista em `--notice-background` e `--notice-color` e, quando ele a quer só na home, `data-only-home`. */
export function Notice({ notice, storeUrl }: { notice: NonNullable<Chrome['notice']>; storeUrl: string }) {
  const colors = { '--notice-background': notice.background ?? undefined, '--notice-color': notice.color ?? undefined } as CSSProperties

  return (
    <p className="notice" style={colors} data-only-home={notice.onlyHome || undefined}>
      {notice.link ? <Link href={toRoute(notice.link, storeUrl)}>{notice.text}</Link> : notice.text}
    </p>
  )
}

const LABELS = { support: 'Atendimento', whatsapp: 'WhatsApp', tracking: 'Rastreie seu pedido' }
export type TopBarLabels = typeof LABELS

type Props = { whatsapp?: Phone | null; phone?: Phone | null; tracking?: string | null; storeUrl: string; labels?: Partial<TopBarLabels> }

/** Classes: topbar, topbar-support. */
export function TopBar({ whatsapp, phone, tracking, storeUrl, labels }: Props) {
  if (!whatsapp && !phone && !tracking) return null
  const t = { ...LABELS, ...labels }

  return (
    <div className="topbar">
      {(whatsapp || phone) && (
        <p className="topbar-support">
          {t.support}:{' '}
          {whatsapp && (
            <a href={whatsappUrl(whatsapp)} target="_blank" rel="noopener nofollow">
              {t.whatsapp} {whatsapp.formated_number}
            </a>
          )}{' '}
          {phone && <a href={`tel:+55${phone.number.replace(/\D/g, '')}`}>{phone.formated_number}</a>}
        </p>
      )}
      {tracking && (
        <Link href={toRoute(tracking, storeUrl)} rel="nofollow">
          {t.tracking}
        </Link>
      )}
    </div>
  )
}
