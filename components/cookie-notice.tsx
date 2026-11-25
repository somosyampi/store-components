'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const LABELS = {
  text: 'Usamos cookies para personalizar anúncios e melhorar a sua experiência no site. Ao continuar navegando, você concorda com a nossa',
  policy: 'Política de cookies',
  accept: 'Ok, entendi',
}
export type CookieNoticeLabels = typeof LABELS

const ACCEPTED = 'policy_accepted=true'

/** Classe: cookie-notice. De uso geral: button. */
export function CookieNotice({ href, labels }: { href: string; labels?: Partial<CookieNoticeLabels> }) {
  const t = { ...LABELS, ...labels }
  const [open, setOpen] = useState(false)

  // Só depois de montar: o HTML pronto é o mesmo para quem já aceitou e para quem ainda não.
  useEffect(() => setOpen(!document.cookie.split('; ').includes(ACCEPTED)), [])

  if (!open) return null

  return (
    <aside className="cookie-notice" aria-label={t.policy}>
      <p>
        {t.text} <Link href={href}>{t.policy}</Link>.
      </p>
      <button
        className="button"
        onClick={() => {
          document.cookie = `${ACCEPTED}; max-age=31536000; path=/; samesite=lax`
          setOpen(false)
        }}
      >
        {t.accept}
      </button>
    </aside>
  )
}
