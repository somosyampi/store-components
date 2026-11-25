export type Prices = {
  price: number
  price_sale: number
  has_promotion: boolean
  percent_discount: number
  /** Só o da API de preços do checkout considera as promoções da loja (lib/prices.ts). */
  installments?: { data?: { text?: string } }
  pix?: { price: number; discount_percent: number }
}

export type Image = { url: string }

export type Flag = { id: number; name: string; text_color?: string | null; background_color?: string | null }

/** `amount` é o total e `base_value` o preço sem juros. */
export type Installment = { installment: number; text: string; amount: string | number; base_value: string | number; amount_formated: string }

export type Sku = {
  id: number
  sku?: string | null
  barcode?: string | null
  days_availability_formated?: string | null
  blocked_sale: boolean
  /** Ids dos valores de variação, separados por hífen. */
  combinations: string
  prices: { data: Prices }
  images: { data: Image[] }
}

export type Variation = { id: number; name: string; values: { data: { id: number; value: string }[] } }

export type CardProduct = { id: number; name: string; slug: string; images: { data: Image[] }; prices: { data: Prices }; flags?: { data: Flag[] } }

export type Checkout = { items: string; items_json: string; redirect_to: string; store_token: string }
