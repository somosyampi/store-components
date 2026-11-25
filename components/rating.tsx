import type { CSSProperties } from 'react'
import { fill, plural } from '../lib/labels'

export const REVIEWS_ID = 'avaliacoes'

const LABELS = { rating: 'Nota {value} de 5', count_one: '{count} avaliação', count_other: '{count} avaliações' }
export type RatingLabels = typeof LABELS

type Props = { value?: number | string | null; count?: number; labels?: Partial<RatingLabels> }

/** Classes: rating, que leva a nota (de 0 a 5) em `--rating` para o tema desenhar as estrelas, e rating-count. De uso geral: sr-only. */
export function Rating({ value, count, labels }: Props) {
  const rating = Number(value)
  if (!rating) return null
  const t = { ...LABELS, ...labels }

  return (
    <span className="rating" style={{ '--rating': rating } as CSSProperties}>
      <span className="sr-only">{fill(t.rating, { value: rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) })}</span>
      {count !== undefined && <span className="rating-count"> {plural(t.count_one, t.count_other, count)}</span>}
    </span>
  )
}
