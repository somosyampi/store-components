import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canPick, pickedOf, skuFor, skuPrices, soldOut } from './sku.ts'
import type { Sku, Variation } from './types.ts'

const prices = (price: number) => ({ price, price_sale: price, has_promotion: false, percent_discount: 0 })
const sku = (id: number, combinations: string, { price = 100, blocked_sale = false } = {}): Sku => ({ id, combinations, blocked_sale, prices: { data: prices(price) }, images: { data: [] } })
const variations: Variation[] = [
  { id: 1, name: 'Cor', values: { data: [{ id: 10, value: 'Preto' }, { id: 11, value: 'Marrom' }] } },
  { id: 2, name: 'Tamanho', values: { data: [{ id: 20, value: '38' }, { id: 21, value: '39' }] } },
]
const skus = [sku(1, '10-20'), sku(2, '10-21', { blocked_sale: true }), sku(3, '21-11')]

test('variações: o SKU só existe com todas escolhidas, em qualquer ordem dos ids', () => {
  assert.equal(skuFor(skus, variations, [10]), undefined)
  assert.equal(skuFor(skus, variations, [10, 20])?.id, 1)
  assert.equal(skuFor(skus, variations, [11, 21])?.id, 3)
  assert.equal(skuFor(skus, variations, [11, 20]), undefined)
  assert.equal(skuFor([sku(9, '')], [], [])?.id, 9)
})

test('variações: uma opção só pode ser escolhida se levar a um SKU à venda', () => {
  assert.equal(canPick(skus, [10]), true)
  assert.equal(canPick(skus, [10, 21]), false)
  assert.equal(canPick(skus, [11, 20]), false)
  assert.equal(canPick(skus, [1]), false)
})

test('variações: o SKU pedido no endereço vira a escolha, na ordem das variações', () => {
  assert.deepEqual(pickedOf(skus[2], variations), [11, 21])
  assert.deepEqual(pickedOf(sku(9, ''), variations), [])
})

test('indisponível: sem SKU à venda, ou com a combinação escolhida bloqueada ou inexistente', () => {
  assert.equal(soldOut(skus, variations, []), false)
  assert.equal(soldOut(skus, variations, [10]), false)
  assert.equal(soldOut(skus, variations, [10, 20]), false)
  assert.equal(soldOut(skus, variations, [10, 21]), true)
  assert.equal(soldOut(skus, variations, [11, 20]), true)
  assert.equal(soldOut([sku(1, '10-20', { blocked_sale: true })], variations, []), true)
  assert.equal(soldOut([], [], []), true)
})

test('preço: o do SKU só quando os SKUs têm preços diferentes; senão, o do produto', () => {
  const product = prices(90)
  const same = [sku(1, '10'), sku(2, '11')]
  const mixed = [sku(1, '10'), sku(2, '11', { price: 120 })]

  assert.equal(skuPrices(same[1], same, product), product)
  assert.equal(skuPrices(mixed[1], mixed, product).price, 120)
  assert.equal(skuPrices(undefined, mixed, product), product)
})
