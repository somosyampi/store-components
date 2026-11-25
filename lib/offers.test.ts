import assert from 'node:assert/strict'
import { test } from 'node:test'
import { kitPrice, quantityTiers, tierOffer, type Tier } from './offers.ts'

// Os valores esperados são os que o checkout da Yampi cobrou pelos mesmos itens na loja modelo.

test('desconto por quantidade: faixas da API e o valor que o carrinho cobra', () => {
  const tiers = quantityTiers({
    progressive_discounts: [
      { discount_type: 'quantity', min_quantity: 4, percent: 10 },
      // Faixa por valor da compra: não é anunciada na página.
      { discount_type: 'value', min_quantity: 0, percent: 15 },
    ],
    buy_x_pay_y: [
      // "Leve duas maletas com +5% OFF"
      { entry_condition_type: 'quantity', entry_condition_value: 2, specification: { price_mode: 'percent', price: null, tiers: [{ min_value: 2, price: 5 }] } },
      // Sem faixas: vale a condição de entrada.
      { entry_condition_type: 'quantity', entry_condition_value: 3, specification: { price_mode: 'unit', price: 90, tiers: [] } },
      // Por valor da compra: também não é anunciada.
      { entry_condition_type: 'amount', entry_condition_value: 500, specification: { price_mode: 'percent', price: 10, tiers: [] } },
    ],
  })

  assert.deepEqual(tiers, [
    { quantity: 2, mode: 'percent', value: 5 },
    { quantity: 3, mode: 'unit', value: 90 },
    { quantity: 4, mode: 'percent', value: 10 },
  ])
  assert.deepEqual(quantityTiers({}), [])

  // Duas maletas de R$ 1.603,80 com 5% off: o checkout cobrou R$ 3.047,22 (desconto de R$ 160,38).
  assert.deepEqual(tierOffer(tiers[0], 1603.8), { total: 3047.22, saving: 160.38 })
  assert.deepEqual(tierOffer(tiers[1], 100), { total: 270, saving: 30 })
  const lot: Tier = { quantity: 3, mode: 'group', value: 250 }
  assert.deepEqual(tierOffer(lot, 100), { total: 250, saving: 50 })
})

test('kit: o preço de cada item segue a regra do kit', () => {
  // "Kit Couro Marrom": 5% sobre o preço de cada SKU. O checkout cobrou R$ 220,08 + R$ 1.523,61.
  assert.equal(kitPrice({ price_type: 'discount', price: 234, discount: 5 }, 231.66), 220.08)
  assert.equal(kitPrice({ price_type: 'discount', price: 1620, discount: 5 }, 1603.8), 1523.61)
  assert.equal(kitPrice({ price_type: 'custom', price: 350, discount: 0 }, 499.9), 350)
  assert.equal(kitPrice({ price_type: 'sku', price: 559.9, discount: 0 }, 554.3), 554.3)
})
