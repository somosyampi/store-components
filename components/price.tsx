import { brl } from '../lib/format'
import type { Prices } from '../lib/types'

/**
 * Preço de venda; em promoção, precedido do preço cheio riscado.
 * Classes: `price` e `sr-only` (texto só para leitores de tela).
 */
export function Price({ prices }: { prices: Prices }) {
  const onSale = prices.has_promotion && prices.price_sale > prices.price

  return (
    <p className="price">
      {onSale && (
        <>
          <span className="sr-only">De </span>
          <s>{brl(prices.price_sale)}</s>
          <span className="sr-only"> por </span>
        </>
      )}
      <span>{brl(prices.price)}</span>
    </p>
  )
}
