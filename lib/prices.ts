// API de preços do checkout da Yampi (pay.yampi.com.br), a que a vitrine oficial consulta para
// mostrar o preço e as parcelas de cada produto. É ela que parcela o preço já com as promoções da
// loja: no detalhe do produto, na API principal, a parcela sai do preço de antes da promoção.
// É aberta e tem CORS liberado, então serve ao servidor e ao navegador.

import type { Installment, Prices } from './types'

export const PRICES_URL = 'https://pay.yampi.com.br/api/v2/prices'

/** O que interessa de GET …/api/v2/prices. */
export type CheckoutPrices = {
  price: number
  price_sale: number
  has_promotion: boolean
  percent_discount: number
  payment_methods?: { pix?: { price: number; discount: number } }
  /** Um array vazio quando o produto não tem parcelamento. */
  installments_data?: { text?: string; installments?: Installment[] } | []
}

const cents = (value: number) => Math.round(value * 100) / 100

/** A resposta da API de preços no formato que os componentes leem, com as parcelas uma a uma. */
export function fromCheckout(data: CheckoutPrices): { prices: Prices; installments: Installment[] } {
  const plan = Array.isArray(data.installments_data) ? undefined : data.installments_data
  const pix = data.payment_methods?.pix

  return {
    prices: {
      // A API devolve frações de centavo (544.401); os componentes comparam preços entre si.
      price: cents(data.price),
      price_sale: cents(data.price_sale),
      has_promotion: data.has_promotion,
      percent_discount: data.percent_discount,
      installments: { data: { text: plan?.text } },
      pix: pix && { price: pix.price, discount_percent: pix.discount },
    },
    installments: (plan?.installments ?? []).map(({ installment, text, amount, base_value, amount_formated }) => ({ installment, text, amount, base_value, amount_formated })),
  }
}

type Query = {
  storeId: number
  productId: number
  /** Bandeira do cartão das parcelas; a padrão da loja vem no whois (`checkout.default_card`). */
  cardBrand?: string | null
  endpoint?: string
  signal?: AbortSignal
}

/**
 * GET …/api/v2/prices — o preço que o checkout cobra pelo produto e as parcelas dele.
 * ponytail: responde pelo produto e por uma bandeira; para os preços de campanha, a vitrine
 * oficial manda também os `utm_*` do visitante, o que só o navegador conhece.
 */
export async function checkoutPrices({ storeId, productId, cardBrand, endpoint = PRICES_URL, signal }: Query) {
  const query = new URLSearchParams({ store_id: String(storeId), product_id: String(productId), ...(cardBrand && { card_brand: cardBrand }) })
  // Sem um sinal de quem chama, a espera tem limite: uma consulta travada não segura a página.
  const response = await fetch(`${endpoint}?${query}`, { signal: signal ?? AbortSignal.timeout?.(10_000), headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`A API de preços da Yampi respondeu ${response.status}`)

  return fromCheckout(((await response.json()) as { data: CheckoutPrices }).data)
}
