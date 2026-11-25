// Os dados que os componentes recebem, no formato em que a API pública da Yampi os entrega.
// Cada tipo traz só o que algum componente lê: o cliente de API do tema pode devolver mais.

export type Prices = {
  price: number
  price_sale: number
  has_promotion: boolean
  percent_discount: number
  /** "12x de R$ 19,31 sem juros". Só o da API de preços do checkout considera as promoções da loja (lib/prices.ts). */
  installments?: { data?: { text?: string } }
  pix?: { price: number; discount_percent: number }
}

export type Image = { url: string }

/** Selo que o lojista prende a produtos ("Lançamento"), com as cores escolhidas no cadastro. */
export type Flag = { id: number; name: string; text_color?: string | null; background_color?: string | null }

/** Uma parcela, como a API de preços do checkout a devolve; `amount` é o total e `base_value` o preço sem juros. */
export type Installment = { installment: number; text: string; amount: string | number; base_value: string | number; amount_formated: string }

export type Sku = {
  id: number
  /** Código do SKU: a referência exibida na página e, com o código de barras (EAN/GTIN), os dados estruturados. */
  sku?: string | null
  barcode?: string | null
  /** Prazo até o envio, como a API o escreve ("Imediata", "60 dias úteis"). */
  days_availability_formated?: string | null
  blocked_sale: boolean
  /** IDs dos valores de variação que formam o SKU, separados por hífen. */
  combinations: string
  prices: { data: Prices }
  images: { data: Image[] }
}

export type Variation = { id: number; name: string; values: { data: { id: number; value: string }[] } }

/** O que um card de produto mostra. */
export type CardProduct = { id: number; name: string; slug: string; images: { data: Image[] }; prices: { data: Prices }; flags?: { data: Flag[] } }

/** URLs do carrinho no checkout da Yampi, entregues pelo whois da loja. */
export type Checkout = { items: string; items_json: string; redirect_to: string; store_token: string }
