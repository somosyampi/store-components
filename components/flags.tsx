import type { CSSProperties } from 'react'
import type { Flag } from '../lib/types'

/**
 * Selos do produto ("Lançamento", "Pré-venda"). As cores que o lojista escolheu chegam ao CSS do
 * tema em cada selo, como `--flag-color` e `--flag-background`. Classes: flags, flag.
 */
export function Flags({ flags = [] }: { flags?: Flag[] }) {
  if (!flags.length) return null

  return (
    // <span>, e não lista: os selos também vão dentro do link do card.
    <span className="flags">
      {flags.map((flag) => (
        <span
          key={flag.id}
          className="flag"
          style={{ '--flag-color': flag.text_color ?? undefined, '--flag-background': flag.background_color ?? undefined } as CSSProperties}
        >
          {/* O espaço separa os selos para quem ouve a página ou a vê sem o CSS do tema. */}
          {flag.name}{' '}
        </span>
      ))}
    </span>
  )
}
