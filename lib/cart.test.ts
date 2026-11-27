import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { CART_TOKEN, EMPTY, checkoutCart, cleanAnswer, mustFill, quickBuySku, toCart, toCustomization } from './cart.ts'

test('carrinho: os itens de um kit viram uma linha só; o kit sem nome fica com o texto do componente', () => {
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

  assert.equal(toCart({ items: [{ id: 5, name: 'Bolsa', price: 10, quantity: 1, bundle_id: 9 }] }).items[0].name, '')
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

test('item personalizado: o que o visitante escolheu aparece na linha e fica para a próxima mudança de quantidade', () => {
  const cart = toCart({
    items: [
      {
        id: 1,
        product_option_id: 77,
        name: 'Cortina',
        price: 174.9,
        quantity: 1,
        customizations: [
          { id: 47, name: 'Nome para bordar', selected_value: 'Ana' },
          { id: 48, name: 'Cor da linha', selected_value: null },
        ],
      },
    ],
    prices: { total: 174.9 },
  })

  assert.deepEqual(cart.items, [{ id: 1, skuId: 77, name: 'Cortina', images: [], price: 174.9, quantity: 1, parts: ['Nome para bordar: Ana'], customization: { 47: 'Ana' } }])
})

test('brinde: vem marcado e sem "de/por", e conta no total de itens', () => {
  const cart = toCart({ items: [{ id: 502, product_option_id: 9002, name: 'Necessaire', price: 0, price_sale: '49.90', quantity: 1, is_freebie: true }] })

  assert.deepEqual(cart.items, [{ id: 502, skuId: 9002, name: 'Necessaire', images: [], price: 0, quantity: 1, freebie: true }])
  assert.equal(cart.count, 1)
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

test('personalização opcional: começada, os campos obrigatórios do cadastro passam a ser exigidos', () => {
  const [name, color] = [{ id: 47, required: true }, { id: 48, required: false }]
  const fields = [name, color]

  assert.equal(mustFill(name, fields, {}, true), false)
  assert.equal(mustFill(name, fields, { 48: '  ' }, true), false)
  assert.equal(mustFill(name, fields, { 48: 'Prata' }, true), true)
  assert.equal(mustFill(color, fields, { 48: 'Prata' }, true), false)
  assert.equal(mustFill(name, fields, {}, false), true)
})

const CHECKOUT = {
  items: 'https://checkout.test/cart/items?store_token=loja',
  items_json: 'https://checkout.test/cart/json?store_token=loja',
  redirect_to: 'https://checkout.test/cart?store_token=loja',
  store_token: 'loja',
}

const memory = (saved: Record<string, string> = {}) => {
  const data = new Map(Object.entries(saved))
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) }
}

type Answer = [status: number, body: unknown]

function serve(t: TestContext, ...answers: Answer[]) {
  const calls: { method: string; url: URL; body?: Record<string, unknown>; reply(...answer: Answer): void }[] = []
  t.mock.method(globalThis, 'fetch', (input: URL, init: RequestInit = {}) => {
    const { promise, resolve } = Promise.withResolvers<Response>()
    const reply = (...[status, body]: Answer) => resolve(Response.json(body, { status }))
    const answer = answers[calls.length]
    calls.push({ method: init.method ?? 'GET', url: new URL(input), body: init.body ? JSON.parse(String(init.body)) : undefined, reply })
    if (answer) reply(...answer)
    return promise
  })
  return calls
}

const bag = (quantity: number) => ({ cart: { items: [{ id: 1, name: 'Bolsa', price: 100, quantity }], prices: { total: 100 * quantity } } })

test('checkout: sem token gravado, não consulta; a primeira adição grava o token antes da resposta', async (t) => {
  const storage = memory()
  const calls = serve(t)
  const api = checkoutCart(CHECKOUT, 'Falhou', () => storage)

  assert.deepEqual(await api.load(), {})
  assert.equal(calls.length, 0)

  const adding = api.add([{ skuId: 7, quantity: 2 }])
  const token = storage.getItem(CART_TOKEN)
  assert.match(token ?? '', /^[\da-f]{40}$/)
  assert.deepEqual([calls[0].method, calls[0].url.pathname, calls[0].url.searchParams.get('cart_token')], ['POST', '/cart/items', token])
  assert.deepEqual(calls[0].body, { product_option_id: [7], quantity: [2], metadata: { source_platform: 'headless' }, skipShipment: true, store_token: 'loja', cart_token: token })

  calls[0].reply(200, bag(2))
  assert.equal((await adding).cart?.count, 2)
  assert.equal(new URL(api.checkoutUrl()).searchParams.get('cart_token'), token)
})

test('checkout: duas abas que adicionam ao mesmo tempo usam o mesmo carrinho', async (t) => {
  const storage = memory()
  const calls = serve(t)
  const [first, second] = [checkoutCart(CHECKOUT, 'Falhou', () => storage), checkoutCart(CHECKOUT, 'Falhou', () => storage)]

  const adding = [first.add([{ skuId: 7, quantity: 1 }]), second.add([{ skuId: 8, quantity: 1 }])]
  for (const call of calls) call.reply(200, bag(1))
  await Promise.all(adding)

  assert.equal(calls[1].url.searchParams.get('cart_token'), calls[0].url.searchParams.get('cart_token'))
})

test('checkout: o carrinho nasce com a sessão da plataforma; sem armazenamento, com um token novo', async (t) => {
  const calls = serve(t, [200, { cart: null }], [200, { cart: null }])
  const blocked = () => {
    throw new DOMException('Armazenamento bloqueado', 'SecurityError')
  }

  await checkoutCart(CHECKOUT, 'Falhou', () => memory({ yampi_session: 'sessao' })).add([{ skuId: 7, quantity: 1 }])
  await checkoutCart(CHECKOUT, 'Falhou', blocked).add([{ skuId: 7, quantity: 1 }])

  assert.equal(calls[0].url.searchParams.get('cart_token'), 'sessao')
  assert.match(calls[1].url.searchParams.get('cart_token') ?? '', /^[\da-f]{40}$/)
})

test('checkout: a releitura usa o token que outra aba gravou depois', async (t) => {
  const storage = memory()
  const calls = serve(t, [200, bag(1)])
  const api = checkoutCart(CHECKOUT, 'Falhou', () => storage)
  storage.setItem(CART_TOKEN, 'da-outra-aba')

  assert.equal((await api.load()).cart?.count, 1)
  assert.equal(calls[0].url.searchParams.get('cart_token'), 'da-outra-aba')
})

test('checkout: mudar a quantidade leva de novo a personalização; remover só leva o item no endereço', async (t) => {
  const calls = serve(t, [200, { cart: { items: [] } }], [200, { error: false, cart: { items: [] } }])
  const api = checkoutCart(CHECKOUT, 'Falhou', () => memory({ [CART_TOKEN]: 'abc' }))
  const item = { id: 501, skuId: 9001, name: 'Toalha', images: [], price: 89.9, quantity: 2, customization: { 47: 'Ana' } }

  await api.update(item, 3)
  await api.remove(item)

  assert.deepEqual([calls[0].method, calls[0].url.pathname], ['PUT', '/cart/items/501'])
  assert.deepEqual(calls[0].body, { quantity: 3, customization: { 9001: { 47: 'Ana' } }, skipShipment: true, store_token: 'loja', cart_token: 'abc' })
  assert.deepEqual([calls[1].method, calls[1].url.pathname, calls[1].body], ['DELETE', '/cart/items/501/delete', { skipShipment: true, store_token: 'loja', cart_token: 'abc' }])
})

test('checkout: a adição que falha no meio relê o carrinho, que pode ter ficado com parte dela', async (t) => {
  const storage = memory()
  const calls = serve(t, [400, { error: true, message: [{ id: 22, message: 'Quantidade indisponível' }] }], [200, bag(1)])

  const result = await checkoutCart(CHECKOUT, 'Falhou', () => storage).add([{ skuId: 21, quantity: 1 }, { skuId: 22, quantity: 1 }], { combo: 38617 })

  assert.deepEqual([result.error, result.cart?.count], ['Quantidade indisponível', 1])
  assert.deepEqual(
    calls.map((call) => [call.method, call.url.pathname]),
    [
      ['POST', '/cart/items'],
      ['GET', '/cart/json'],
    ],
  )
  assert.equal(calls[0].body?.kit_id, 38617)
  assert.equal(storage.getItem(CART_TOKEN), calls[1].url.searchParams.get('cart_token'))
})

test('checkout: sem resposta, vale a mensagem do tema', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch')
  })

  assert.deepEqual(await checkoutCart(CHECKOUT, 'Falhou', () => memory()).add([{ skuId: 7, quantity: 1 }]), { error: 'Falhou' })
})

test('checkout: a leitura feita antes ou durante uma mudança não sobrescreve o que ela devolveu', async (t) => {
  const calls = serve(t)
  const api = checkoutCart(CHECKOUT, 'Falhou', () => memory({ [CART_TOKEN]: 'abc' }))

  const before = api.load()
  const adding = api.add([{ skuId: 7, quantity: 2 }])
  const during = api.load()
  calls[1].reply(200, bag(2))
  assert.equal((await adding).cart?.count, 2)
  calls[0].reply(200, bag(1))
  calls[2].reply(200, bag(1))
  assert.deepEqual([await before, await during], [{}, {}])

  const after = api.load()
  calls[3].reply(200, bag(2))
  assert.equal((await after).cart?.count, 2)
})

test('checkout: a mudança que termina depois que outra aba trocou de carrinho não traz o carrinho antigo de volta', async (t) => {
  const storage = memory({ [CART_TOKEN]: 'antigo' })
  const calls = serve(t)
  const api = checkoutCart(CHECKOUT, 'Falhou', () => storage)

  const adding = api.add([{ skuId: 7, quantity: 1 }])
  storage.setItem(CART_TOKEN, 'novo')
  const reading = api.load()
  calls[1].reply(200, bag(3))
  assert.equal((await reading).cart?.count, 3)
  calls[0].reply(200, bag(1))
  assert.deepEqual(await adding, {})
  assert.equal(new URL(api.checkoutUrl()).searchParams.get('cart_token'), 'novo')
})
