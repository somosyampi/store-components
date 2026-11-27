import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EMPTY, cleanAnswer, quickBuySku, toCart, toCustomization } from './cart.ts'

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

test('carrinho: o "de/por" de cada item e o total economizado, como o checkout devolve', () => {
  const cart = toCart({
    items: [
      { id: 10364077, name: 'Conjunto Prime Office', price: '299.90', price_sale: '299.90', quantity: 1, bundle_id: null, kit_id: null },
      { id: 10364078, name: 'Maleta de Couro com Fivelas', price: '1242.00', price_sale: '1380.00', quantity: 1, bundle_id: null, kit_id: null },
    ],
    grouped_items: [],
    prices: { total: 1541.9, discount: 0, discount_without_wallet: 0, items_discount: 138 },
    discounts_labels: '',
  })

  assert.deepEqual(
    cart.items.map((item) => item.listPrice),
    [undefined, 1380],
  )
  assert.equal(cart.savings, 138)

  const coupon = toCart({ items: [], grouped_items: [], prices: { total: 290, discount: 10, discount_without_wallet: 10, items_discount: 40 } })
  assert.equal(coupon.savings, 40)

  const customized = toCart({
    items: [{ id: 1, name: 'Bolsa', price: '310.00', price_sale: '350.00', quantity: 1, customizations: [{ name: 'Gravação', selected_value: 'L.C.' }] }],
  })
  assert.equal(customized.items[0].listPrice, undefined)
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

test('compra rápida: só o produto que diz não ter variações nem venda bloqueada', () => {
  assert.equal(quickBuySku({ sku_id: 7, has_variations: false, blocked_sale: false }), 7)
  assert.equal(quickBuySku({ sku_id: 7, has_variations: true, blocked_sale: false }), null)
  assert.equal(quickBuySku({ sku_id: 7, has_variations: false, blocked_sale: true }), null)
  assert.equal(quickBuySku({ sku_id: 7 }), null)
  assert.equal(quickBuySku({ has_variations: false, blocked_sale: false }), null)
})

test('personalização: o texto livre só guarda o que o cadastro aceita, sem espaços no início', () => {
  const text = (allowed_values: 'letters' | 'numbers' | 'all') => ({ type: 'input' as const, allowed_values })

  assert.equal(cleanAnswer('  Ana3 Maria! ', text('letters')), 'Ana Maria ')
  assert.equal(cleanAnswer('São João', text('letters')), 'São João')
  assert.equal(cleanAnswer('a1 b2', text('numbers')), '12')
  assert.equal(cleanAnswer('  Nº 7!', text('all')), 'Nº 7!')
  assert.equal(cleanAnswer('   ', text('all')), '')
})

test('personalização: a opção de uma lista vai como foi cadastrada', () => {
  assert.equal(cleanAnswer('Azul 2', { type: 'select', allowed_values: 'letters' }), 'Azul 2')
  assert.equal(cleanAnswer('Tamanho P', { type: 'select', allowed_values: 'numbers' }), 'Tamanho P')
})

test('personalização: vai ao carrinho o que foi preenchido; sem nada, só quando o SKU a exige', () => {
  const fields = [{ id: 47 }, { id: 48 }]

  assert.deepEqual(toCustomization(fields, { 47: ' Ana ', 48: '' }, true), { 47: 'Ana' })
  assert.deepEqual(toCustomization(fields, { 47: 'Ana', 48: 'Prata' }, false), { 47: 'Ana', 48: 'Prata' })
  assert.equal(toCustomization(fields, {}, true), undefined)
  assert.deepEqual(toCustomization(fields, { 47: '  ' }, false), { 47: '', 48: '' })
  assert.equal(toCustomization([], {}, false), undefined)
})
