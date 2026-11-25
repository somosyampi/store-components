import type { CSSProperties } from 'react'
import type { Flag } from '../lib/types'

/** Classes: flags e flag, que leva as cores do cadastro em `--flag-color` e `--flag-background`. */
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
