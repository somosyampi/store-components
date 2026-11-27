// Só esta API parcela o preço já com as promoções da loja: a principal parcela o preço de cadastro.

import { cents } from './format.ts'
import type { Installment, Prices } from './types'

export const PRICES_URL = 'https://pay.yampi.com.br/api/v2/prices'

export type CheckoutPrices = {
  price: number
  price_sale: number
  has_promotion: boolean
  percent_discount: number
  payment_methods?: { pix?: { price: number; discount: number } }
  /** Um array vazio quando o produto não tem parcelamento. */
  installments_data?: { text?: string; installments?: Installment[] } | []
}

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
      pix: pix && { price: cents(pix.price), discount_percent: pix.discount },
    },
    installments: (plan?.installments ?? []).map(({ installment, text, amount, base_value, amount_formated }) => ({ installment, text, amount, base_value, amount_formated })),
  }
}

type Query = {
  storeId: number
  productId: number
  /** A padrão da loja vem no whois, em `checkout.default_card`. */
  cardBrand?: string | null
  endpoint?: string
  signal?: AbortSignal
}

// ponytail: sem os `utm_*` do visitante, que a vitrine oficial manda para os preços de campanha.
export async function checkoutPrices({ storeId, productId, cardBrand, endpoint = PRICES_URL, signal }: Query) {
  const query = new URLSearchParams({ store_id: String(storeId), product_id: String(productId), ...(cardBrand && { card_brand: cardBrand }) })
  // Sem um sinal de quem chama, a espera tem limite: uma consulta travada não segura a página.
  const response = await fetch(`${endpoint}?${query}`, { signal: signal ?? AbortSignal.timeout?.(10_000), headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`A API de preços da Yampi respondeu ${response.status}`)

  return fromCheckout(((await response.json()) as { data: CheckoutPrices }).data)
}
