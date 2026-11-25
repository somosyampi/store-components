import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buyable, cashbackFor, comboChoice, comboOffer, kitPrice, quantityTiers, tierOffer, toKits, type Bundle, type Combo, type Tier } from './offers.ts'

test('desconto por quantidade: faixas da API e o valor que o carrinho cobra', () => {
  const tiers = quantityTiers({
    progressive_discounts: [
      { discount_type: 'quantity', min_quantity: 4, percent: 10 },
      { discount_type: 'value', min_quantity: 0, percent: 15 },
    ],
    buy_x_pay_y: [
      { entry_condition_type: 'quantity', entry_condition_value: 2, specification: { price_mode: 'percent', price: null, tiers: [{ min_value: 2, price: 5 }] } },
      { entry_condition_type: 'quantity', entry_condition_value: 3, specification: { price_mode: 'unit', price: 90, tiers: [] } },
      { entry_condition_type: 'amount', entry_condition_value: 500, specification: { price_mode: 'percent', price: 10, tiers: [] } },
    ],
  })

  assert.deepEqual(tiers, [
    { quantity: 2, mode: 'percent', value: 5 },
    { quantity: 3, mode: 'unit', value: 90 },
    { quantity: 4, mode: 'percent', value: 10 },
  ])
  assert.deepEqual(quantityTiers({}), [])

  assert.deepEqual(tierOffer(tiers[0], 1603.8), { total: 3047.22, saving: 160.38 })
  assert.deepEqual(tierOffer(tiers[1], 100), { total: 270, saving: 30 })
  const lot: Tier = { quantity: 3, mode: 'group', value: 250 }
  assert.deepEqual(tierOffer(lot, 100), { total: 250, saving: 50 })
})

test('kit: o preço de cada item segue a regra do kit', () => {
  assert.equal(kitPrice({ price_type: 'discount', price: 234, discount: 5 }, 231.66), 220.08)
  assert.equal(kitPrice({ price_type: 'discount', price: 1620, discount: 5 }, 1603.8), 1523.61)
  assert.equal(kitPrice({ price_type: 'custom', price: 350, discount: 0 }, 499.9), 350)
  assert.equal(kitPrice({ price_type: 'sku', price: 559.9, discount: 0 }, 554.3), 554.3)
})

test('kits da API: o preço de cada item no kit e avulso; kit inativo ou com item indisponível fica de fora', () => {
  const item = (id: number, price: number, extra = {}) => ({
    id,
    sku_id: id * 10,
    price_type: 'discount',
    price: 0,
    discount: 5,
    quantity: 1,
    available: true,
    sku: { data: { title: `Item ${id}`, prices: { data: { price } }, images: { data: [{ url: `https://img/${id}.png` }] } } },
    ...extra,
  })
  const bundle = (id: number, items: Bundle['items']['data'], extra = {}): Bundle => ({ id, name: `Kit ${id}`, active: true, custom_shipping: true, shipping_type: 'free', items: { data: items }, ...extra })

  const kits = toKits([
    bundle(1, [item(1, 231.66), item(2, 1603.8, { quantity: 2 })]),
    bundle(2, [item(3, 100)], { active: false }),
    bundle(3, [item(4, 100), item(5, 100, { available: false })]),
    bundle(4, [item(6, 100, { sku: undefined })]),
  ])

  assert.deepEqual(kits, [
    {
      id: 1,
      name: 'Kit 1',
      freeShipping: true,
      items: [
        { id: 1, skuId: 10, name: 'Item 1', image: 'https://img/1.png', quantity: 1, price: 220.08, full: 231.66 },
        { id: 2, skuId: 20, name: 'Item 2', image: 'https://img/2.png', quantity: 2, price: 1523.61, full: 1603.8 },
      ],
    },
  ])
})

test('compre junto: o desconto em % ou em reais sobre a soma dos itens', () => {
  // Scarpin de R$ 459,90 + bolsa de R$ 1.299,90 com 10%: o checkout cobrou R$ 1.583,82 (desconto de R$ 175,98).
  assert.deepEqual(comboOffer({ discount_type: 'p', discount_value: 10 }, [459.9, 1299.9]), { full: 1759.8, total: 1583.82, saving: 175.98 })
  assert.deepEqual(comboOffer({ discount_type: 'v', discount_value: 50 }, [100, 80.5]), { full: 180.5, total: 130.5, saving: 50 })
  assert.deepEqual(comboOffer({ discount_type: 'v', discount_value: 500 }, [100]), { full: 100, total: 0, saving: 100 })
})

const comboSku = (id: number, price: number, blocked_sale = false) => ({ id, blocked_sale, prices: { data: { price } }, images: { data: [] } })
const comboProduct = (id: number, ...skus: ReturnType<typeof comboSku>[]) => ({ id, name: `Produto ${id}`, slug: `produto-${id}`, images: { data: [] }, skus: { data: skus } })
const combo: Combo = {
  id: 1,
  discount_type: 'p',
  discount_value: 10,
  products: { data: [comboProduct(1, comboSku(11, 100)), comboProduct(2, comboSku(21, 50, true), comboSku(22, 60), comboSku(23, 80))] },
}
const ids = (choice: ReturnType<typeof comboChoice>) => choice.skus.map((sku) => sku?.id)

test('compre junto: o único SKU à venda já vem escolhido e a conta parte do primeiro à venda', () => {
  const start = comboChoice(combo)

  assert.deepEqual(ids(start), [11, undefined])
  assert.deepEqual([start.available, start.full, start.total, start.saving], [true, 160, 144, 16])
  assert.deepEqual(ids(comboChoice(combo, { 2: 23 })), [11, 23])
  assert.equal(comboChoice(combo, { 2: 23 }).total, 162)
})

test('compre junto: a escolha só vale para um SKU do produto que esteja à venda', () => {
  assert.deepEqual(ids(comboChoice(combo, { 2: 21 })), [11, undefined])
  assert.deepEqual(ids(comboChoice(combo, { 1: 99, 2: 22 })), [11, 22])
})

test('compre junto: sem SKU à venda fica indisponível; sem SKU nenhum, a oferta não é montada', () => {
  const soldOut: Combo = { ...combo, products: { data: [comboProduct(1, comboSku(11, 100, true)), comboProduct(2, comboSku(22, 60))] } }
  const empty: Combo = { ...combo, id: 2, products: { data: [comboProduct(1, comboSku(11, 100)), comboProduct(3)] } }

  assert.equal(comboChoice(soldOut).available, false)
  assert.deepEqual(ids(comboChoice(soldOut)), [undefined, 22])
  assert.deepEqual(buyable([combo, soldOut, empty]).map((offer) => offer.id), [1, 1])
})

test('cashback: o percentual da faixa em que o preço cai', () => {
  const rules = [{ percent_amount: '5.00', min_amount: '0.00', max_amount: '199.99' }, { percent_amount: 10, min_amount: 200, max_amount: 1000 }]

  assert.equal(cashbackFor(150, rules), 5)
  assert.equal(cashbackFor(200, rules), 10)
  assert.equal(cashbackFor(1500, rules), 0)
  assert.equal(cashbackFor(150), 0)
})
