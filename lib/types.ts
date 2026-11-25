// Os dados que os componentes recebem, no formato em que a API pública da Yampi os entrega.
// Cada tipo traz só o que algum componente lê: o cliente de API do tema pode devolver mais.

export type Prices = {
  price: number
  price_sale: number
  has_promotion: boolean
  percent_discount: number
  /** A API devolve `data: []` quando o produto não tem parcelamento. */
  installments?: { data?: { text?: string } }
  pix?: { price: number; discount_percent: number }
}

export type Image = { url: string }

export type Sku = {
  id: number
  blocked_sale: boolean
  /** IDs dos valores de variação que formam o SKU, separados por hífen. */
  combinations: string
  prices: { data: Prices }
  images: { data: Image[] }
}

export type Variation = { id: number; name: string; values: { data: { id: number; value: string }[] } }

/** O que um card de produto mostra. */
export type CardProduct = { id: number; name: string; slug: string; images: { data: Image[] }; prices: { data: Prices } }

/** URLs do carrinho no checkout da Yampi, entregues pelo whois da loja. */
export type Checkout = { items: string; items_json: string; redirect_to: string; store_token: string }
