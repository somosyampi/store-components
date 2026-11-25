import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EMPTY, toCart } from './cart.ts'

test('carrinho: os itens de um kit viram uma linha só', () => {
  // Formato (reduzido) da resposta do checkout com dois "Kit Couro Marrom" e um produto avulso.
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
      // Um kit: 1 carteira + 2 maletas.
      price: (220.08 * 2 + 1523.61 * 4) / 2,
      quantity: 2,
      parts: ['Carteira em Couro Marrom', '2 × Maleta em Couro Marrom'],
    },
    { id: 2, name: 'Mocassim 39', images: ['https://images.yampi.me/mocassim.png'], price: 434.3, quantity: 1 },
  ])
  // O contador do carrinho conta unidades, não linhas.
  assert.equal(cart.count, 7)
  assert.equal(cart.total, 6969.02)

  // Desconto por quantidade: o checkout devolve o valor e o nome da promoção.
  const discounted = toCart({ items: [{ id: 9, name: 'Maleta', price: 1603.8, quantity: 2 }], grouped_items: [], prices: { total: 3047.22, discount: 160.38 }, discounts_labels: 'Leve duas maletas com +5% OFF' })
  assert.deepEqual([discounted.discount, discounted.discountLabel, discounted.items[0].images], [160.38, 'Leve duas maletas com +5% OFF', []])

  assert.deepEqual(toCart(null), EMPTY)
})
