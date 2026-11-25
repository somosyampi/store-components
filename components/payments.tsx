import type { ReactNode } from 'react'

const text = { fill: 'currentColor', stroke: 'none', textAnchor: 'middle' } as const

const PIX = 'M12 3 21 12l-9 9-9-9zM7.9 7.1l4.1 4.1 4.1-4.1M7.9 16.9l4.1-4.1 4.1 4.1'

const MARKS: Record<string, ReactNode> = {
  visa: (
    <text {...text} x="22.4" y="17.3" fontSize="9.4" fontStyle="italic" letterSpacing="0.8">
      VISA
    </text>
  ),
  mastercard: (
    <>
      <circle cx="17.5" cy="14" r="6" />
      <circle cx="26.5" cy="14" r="6" />
    </>
  ),
  amex: (
    <text {...text} x="22.6" y="16.7" fontSize="7.6" letterSpacing="1.2">
      AMEX
    </text>
  ),
  diners: (
    <>
      <circle cx="22" cy="14" r="7" />
      <path d="M20.6 10.4a3.6 3.6 0 0 0 0 7.2zM23.4 10.4a3.6 3.6 0 0 1 0 7.2z" />
    </>
  ),
  discover: (
    <>
      <text {...text} x="19.4" y="16.1" fontSize="6" letterSpacing="0.4" textAnchor="end">
        DISC
      </text>
      <circle cx="22.2" cy="14" r="2.3" fill="currentColor" stroke="none" />
      <text {...text} x="25.4" y="16.1" fontSize="6" letterSpacing="0.4" textAnchor="start">
        VER
      </text>
    </>
  ),
  aura: (
    <text {...text} x="22.7" y="16.7" fontSize="7.6" letterSpacing="1.4">
      AURA
    </text>
  ),
  elo: (
    <text {...text} x="22.2" y="17.4" fontSize="11" letterSpacing="0.4">
      elo
    </text>
  ),
  hiper: (
    <text {...text} x="22.1" y="17" fontSize="8.6" fontStyle="italic" letterSpacing="0.2">
      Hiper
    </text>
  ),
  billet: (
    <>
      <path d="M11.5 8.5v11M14.5 8.5v11M16.5 8.5v11M21.5 8.5v11M23.5 8.5v11M25.5 8.5v11M30.5 8.5v11M32.5 8.5v11" />
      <path d="M19 8.5v11M28 8.5v11" strokeWidth="2" />
    </>
  ),
  pix: <path d={PIX} transform="translate(10 2)" />,
}

type Payment = { alias: string; name: string }

const PaymentIcon = ({ alias, name }: Payment) => (
  <svg width="44" height="28" viewBox="0 0 44 28" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={name}>
    <rect x=".5" y=".5" width="43" height="27" rx="4" />
    {MARKS[alias] ?? <path d="M.5 9.5h43M6 19.5h9" />}
  </svg>
)

/** Classe: payments. */
export const Payments = ({ payments }: { payments: Payment[] }) => (
  <ul className="payments">
    {payments.map((payment) => (
      <li key={payment.alias} title={payment.name}>
        <PaymentIcon {...payment} />
      </li>
    ))}
  </ul>
)
