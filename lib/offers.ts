// As contas das ofertas da página de produto — desconto por quantidade e kits — num lugar só
// e sem dependências, para poderem ser testadas com `npm test`.
// Elas repetem o que o checkout da Yampi faz ao montar o carrinho: a página promete o valor que
// será cobrado.

const cents = (value: number) => Math.round(value * 100) / 100

/** Faixa de desconto por quantidade: a partir de `quantity` unidades, vale `value` no modo `mode`. */
export type Tier = {
  quantity: number
  /** percent = % de desconto · unit = preço de cada unidade · group = preço do lote de `quantity` unidades. */
  mode: 'percent' | 'unit' | 'group'
  value: number
}

/** O que interessa de GET …/products/{id}/discounts. */
export type Discounts = {
  progressive_discounts?: { discount_type: string; min_quantity: number; percent: number }[]
  buy_x_pay_y?: {
    entry_condition_type: string
    entry_condition_value: number
    specification: { price_mode: Tier['mode']; price: number | null; tiers: { min_value: number; price: number }[] } | null
  }[]
}

/**
 * As faixas "leve N" de um produto, da menor quantidade para a maior. Saem do desconto
 * progressivo legado e do multi-faixa (`buy_x_pay_y`).
 * ponytail: ficam de fora as faixas por valor da compra e o "compre X leve Y"
 * (`buy_x_get_y`), que a mesma rota devolve. O carrinho aplica todos; a página só anuncia os
 * que dependem da quantidade.
 */
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

/** Quanto custam as `tier.quantity` unidades da faixa e quanto isso economiza sobre o preço avulso. */
export function tierOffer(tier: Tier, price: number) {
  const full = price * tier.quantity
  const total = cents(tier.mode === 'percent' ? full * (1 - tier.value / 100) : tier.mode === 'unit' ? tier.value * tier.quantity : tier.value)

  return { total, saving: cents(full - total) }
}

/** Preço de uma unidade de um item dentro do kit: o do SKU, o do SKU com desconto ou um valor fixo. */
export const kitPrice = (item: { price_type: string; price: number; discount: number }, skuPrice: number) =>
  item.price_type === 'custom' ? item.price : item.price_type === 'discount' ? cents(skuPrice * (1 - item.discount / 100)) : skuPrice
