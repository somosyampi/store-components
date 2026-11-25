import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EMPTY, toCart } from './cart.ts'

test('carrinho: os itens de um kit viram uma linha só', () => {
  const cart = toCart({
    items: [
      { id: 1, name: 'Carteira em Couro Marrom', medium: '//images.yampi.me/carteira.png', price: 220.08, quantity: '2', bundle_id: 334175 },
      { id: 2, name: 'Mocassim', name_with_grids: 'Mocassim 39', medium: 'https://images.yampi.me/mocassim.png', price: '434.30', quantity: 1, bundle_id: null },
      { id: 3, name: 'Maleta em Couro Marrom', medium: '//images.yampi.me/maleta.png', price: 1523.61, quantity: 4, bundle_id: 334175 },
    ],
    grouped_items: { 'Kit Couro Marrom - 334175': { bundle_id: 334175, bundle: { name: 'Kit Couro Marrom', quantity: 2 } } },
    prices: { total: '6969.02', discount: 0 },
    discounts_labels: null,
  })

  assert.deepEqual(cart.items, [
    {
      id: 1,
      name: 'Kit Couro Marrom',
      images: ['https://images.yampi.me/carteira.png', 'https://images.yampi.me/maleta.png'],
      price: 3267.3,
      quantity: 2,
      parts: ['Carteira em Couro Marrom', '2 × Maleta em Couro Marrom'],
    },
    { id: 2, name: 'Mocassim 39', images: ['https://images.yampi.me/mocassim.png'], price: 434.3, quantity: 1 },
  ])
  assert.equal(cart.count, 7)
  assert.equal(cart.total, 6969.02)

  const discounted = toCart({ items: [{ id: 9, name: 'Maleta', price: 1603.8, quantity: 2 }], grouped_items: [], prices: { total: 3047.22, discount: 160.38 }, discounts_labels: 'Leve duas maletas com +5% OFF' })
  assert.deepEqual([discounted.discount, discounted.discountLabel, discounted.items[0].images], [160.38, 'Leve duas maletas com +5% OFF', []])

  assert.deepEqual(toCart(null), EMPTY)
})

test('carrinho: os itens de um "compre junto" viram uma linha, com o desconto no total', () => {
  const cart = toCart({
    items: [
      { id: 1092246393, name: 'Scarpin', name_with_grids: 'Scarpin 38', price: '459.90', quantity: 1, bundle_id: null, kit_id: 38617 },
      { id: 1092246394, name: 'Bolsa de Mão em Couro Creme', price: '1299.90', quantity: 1, bundle_id: null, kit_id: 38617 },
    ],
    grouped_items: [],
    prices: { total: 1583.82, discount: 175.98 },
    discounts_labels: null,
  })

  assert.deepEqual(cart.items, [{ id: 1092246393, name: '', images: [], price: 1759.8, quantity: 1, parts: ['Scarpin 38', 'Bolsa de Mão em Couro Creme'], combo: true }])
  assert.deepEqual([cart.count, cart.total, cart.discount], [2, 1583.82, 175.98])
})

test('item personalizado: o que o visitante escolheu aparece na linha', () => {
  const cart = toCart({
    items: [{ id: 1, name: 'Cortina', price: 174.9, quantity: 1, customizations: [{ name: 'Nome para bordar', selected_value: 'Ana' }, { name: 'Cor da linha', selected_value: null }] }],
    prices: { total: 174.9 },
  })

  assert.deepEqual(cart.items, [{ id: 1, name: 'Cortina', images: [], price: 174.9, quantity: 1, parts: ['Nome para bordar: Ana'] }])
})
