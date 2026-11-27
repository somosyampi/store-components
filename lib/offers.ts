import { cents } from './format.ts'

export type Tier = {
  quantity: number
  /** percent = % de desconto · unit = preço de cada unidade · group = preço do lote de `quantity` unidades. */
  mode: 'percent' | 'unit' | 'group'
  value: number
}

/** GET …/products/{id}/discounts */
export type Discounts = {
  progressive_discounts?: { discount_type: string; min_quantity: number; percent: number }[]
  buy_x_pay_y?: {
    entry_condition_type: string
    entry_condition_value: number
    specification: { price_mode: Tier['mode']; price: number | null; tiers: { min_value: number; price: number }[] } | null
  }[]
}

// ponytail: só as faixas por quantidade; as por valor da compra e o "compre X leve Y" o carrinho aplica sem anúncio.
export function quantityTiers({ progressive_discounts = [], buy_x_pay_y = [] }: Discounts): Tier[] {
  const legacy = progressive_discounts
    .filter((discount) => discount.discount_type === 'quantity')
    .map((discount): Tier => ({ quantity: discount.min_quantity, mode: 'percent', value: discount.percent }))

  const tiered = buy_x_pay_y.flatMap(({ entry_condition_type, entry_condition_value, specification }) => {
    if (entry_condition_type !== 'quantity' || !specification) return []
    // Sem faixas, o desconto tem uma só: a da própria condição de entrada.
    const tiers = specification.tiers.length ? specification.tiers : [{ min_value: entry_condition_value, price: specification.price ?? 0 }]

    return tiers.map((tier): Tier => ({ quantity: tier.min_value, mode: specification.price_mode, value: tier.price }))
  })

  return [...legacy, ...tiered].filter((tier) => tier.quantity > 1 && tier.value > 0).sort((a, b) => a.quantity - b.quantity)
}

export function tierOffer(tier: Tier, price: number) {
  const full = price * tier.quantity
  const total = cents(tier.mode === 'percent' ? full * (1 - tier.value / 100) : tier.mode === 'unit' ? tier.value * tier.quantity : tier.value)

  return { total, saving: cents(full - total) }
}

export const kitPrice = (item: { price_type: string; price: number; discount: number }, skuPrice: number) =>
  item.price_type === 'custom' ? item.price : item.price_type === 'discount' ? cents(skuPrice * (1 - item.discount / 100)) : skuPrice

/** As regras de cashback da loja, do whois (`cashbacks`); os valores podem vir como texto. */
export type Cashback = { percent_amount: number | string; min_amount: number | string; max_amount: number | string }

export const cashbackFor = (price: number, rules: Cashback[] = []) =>
  Number(rules.find((rule) => price >= Number(rule.min_amount) && price <= Number(rule.max_amount))?.percent_amount) || 0

/** GET …/products/{id}/combos */
export type Combo = {
  id: number
  /** p = `discount_value`% sobre a soma dos itens · v = `discount_value` reais. */
  discount_type: 'p' | 'v'
  discount_value: number
  products: {
    data: {
      id: number
      name: string
      slug: string
      images: { data: { url: string }[] }
      skus: { data: { id: number; blocked_sale: boolean; prices: { data: { price: number } }; images: { data: { url: string }[] }; variations?: { name?: string; value: string }[] }[] }
    }[]
  }
}

export function comboOffer({ discount_type, discount_value }: Pick<Combo, 'discount_type' | 'discount_value'>, prices: number[]) {
  const full = cents(prices.reduce((sum, price) => sum + price, 0))
  const total = cents(Math.max(0, discount_type === 'p' ? full * (1 - discount_value / 100) : full - discount_value))

  return { full, total, saving: cents(full - total) }
}

// Produto sem SKU não tem preço nem o que pôr no carrinho.
export const buyable = (combos: Combo[]) => combos.filter((combo) => combo.products.data.every((product) => product.skus.data.length > 0))

/** Por id de produto, o id do SKU que o visitante escolheu. */
export type Picks = Record<number, number>

export function comboChoice(combo: Combo, picked: Picks = {}) {
  const sellable = combo.products.data.map((product) => product.skus.data.filter((sku) => !sku.blocked_sale))
  // A escolha só vale enquanto o SKU está à venda, e o único à venda já vem escolhido.
  const skus = combo.products.data.map((product, index) => sellable[index].find((sku) => sku.id === picked[product.id]) ?? (sellable[index].length === 1 ? sellable[index][0] : undefined))
  // Antes da escolha, a conta usa o primeiro SKU à venda: os bloqueados podem ter outro preço.
  const prices = combo.products.data.map((product, index) => (skus[index] ?? sellable[index][0] ?? product.skus.data[0]).prices.data.price)

  return { skus, available: sellable.every((list) => list.length > 0), ...comboOffer(combo, prices) }
}

/** GET …/products/{id}/bundles */
export type Bundle = {
  id: number
  name: string
  active: boolean
  custom_shipping: boolean
  shipping_type: string
  items: {
    data: {
      id: number
      sku_id: number
      price_type: string
      price: number
      discount: number
      quantity: number
      available: boolean
      sku?: { data: { title: string; prices: { data: { price: number } }; images: { data: { url: string }[] } } }
    }[]
  }
}

/** `price` é o que o item custa dentro do kit e `full`, comprado avulso. */
export type Kit = {
  id: number
  name: string
  freeShipping: boolean
  items: { id: number; skuId: number; name: string; image: string | null; quantity: number; price: number; full: number }[]
}

// O checkout não vende um kit com item indisponível.
export const toKits = (bundles: Bundle[]): Kit[] =>
  bundles
    .filter((bundle) => bundle.active && bundle.items.data.every((item) => item.available && item.sku))
    .map((bundle) => ({
      id: bundle.id,
      name: bundle.name,
      freeShipping: bundle.custom_shipping && bundle.shipping_type === 'free',
      items: bundle.items.data.flatMap((item) => {
        const sku = item.sku?.data
        if (!sku) return []
        const full = sku.prices.data.price

        return { id: item.id, skuId: item.sku_id, name: sku.title, image: sku.images.data[0]?.url ?? null, quantity: item.quantity, price: kitPrice(item, full), full }
      }),
    }))
