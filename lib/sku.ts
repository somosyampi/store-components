import type { Prices, Sku, Variation } from './types'

const has = (sku: Sku, values: number[]) => values.every((value) => sku.combinations.split('-').includes(String(value)))

export const skuFor = (skus: Sku[], variations: Variation[], picked: number[]) => (picked.length === variations.length ? skus.find((sku) => has(sku, picked)) : undefined)

export const canPick = (skus: Sku[], choice: number[]) => skus.some((sku) => !sku.blocked_sale && has(sku, choice))

export function pickedOf(sku: Sku, variations: Variation[]) {
  const values = sku.combinations.split('-')

  return variations.flatMap((variation) => variation.values.data.find((value) => values.includes(String(value.id)))?.id ?? [])
}

export function soldOut(skus: Sku[], variations: Variation[], picked: number[]) {
  if (skus.every((sku) => sku.blocked_sale)) return true
  if (picked.length < variations.length) return false

  return skuFor(skus, variations, picked)?.blocked_sale ?? true
}

// Com todos os SKUs no mesmo preço vale o do produto, que o tema lê do checkout (lib/prices.ts).
export const skuPrices = (sku: Sku | undefined, skus: Sku[], prices: Prices) => (sku && skus.some((other) => other.prices.data.price !== skus[0].prices.data.price) ? sku.prices.data : prices)
