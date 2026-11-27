import { brl } from '../lib/format'
import type { Prices } from '../lib/types'

export const PRICE_LABELS = { was: 'De', now: 'por' }
export type PriceLabels = typeof PRICE_LABELS

/** Classes: price, sr-only. */
export function Price({ prices, labels }: { prices: Prices; labels?: Partial<PriceLabels> }) {
  const t = { ...PRICE_LABELS, ...labels }
  const onSale = prices.has_promotion && prices.price_sale > prices.price

  return (
    <p className="price">
      {onSale && (
        <>
          <span className="sr-only">{t.was} </span>
          <s>{brl(prices.price_sale)}</s>
          <span className="sr-only"> {t.now} </span>
        </>
      )}
      <span>{brl(prices.price)}</span>
    </p>
  )
}
