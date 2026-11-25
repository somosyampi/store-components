import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NAME_FILTERS, listingHref, listingState, toggleFilter, toRoute, type ListingState } from './routes.ts'

test('vitrine: a query string vira estado e o estado volta a ser URL', () => {
  assert.deepEqual(listingState({ sort_by: 'newest', page: '2' }), { sort_by: 'newest', page: 2, filters: {} })
  assert.deepEqual(listingState({ filter_id: ['12', '13'], brand_id: '7' }), {
    sort_by: undefined,
    page: 1,
    filters: { brand_id: ['7'], filter_id: ['12', '13'] },
  })

  assert.deepEqual(listingState({ sort_by: 'toString', page: '-3', min: '100', outro: 'x' }), { sort_by: undefined, page: 1, filters: {} })
  assert.deepEqual(listingState({ page: '999999999999999999999', filter_id: ['12', 'x', '-7', '1 or 1'], attributes: 'Cor:Marrom' }), {
    sort_by: undefined,
    page: 1000,
    filters: { filter_id: ['12', '-7'] },
  })
  assert.deepEqual(listingState({ attributes: ['Cor:Marrom', ''], brand_id: '7' }, NAME_FILTERS).filters, { attributes: ['Cor:Marrom'] })

  assert.equal(listingHref('/categoria/bolsas', { page: 1 }), '/categoria/bolsas')
  assert.equal(listingHref('/categoria/bolsas', { sort_by: 'newest', page: 2 }), '/categoria/bolsas?sort_by=newest&page=2')
  assert.equal(
    listingHref('/busca', { page: 3, filters: { attributes: ['Cor:Marrom', 'Fecho:Zíper'] } }, { q: 'bolsa de mão' }),
    '/busca?q=bolsa+de+m%C3%A3o&attributes=Cor%3AMarrom&attributes=Fecho%3AZ%C3%ADper&page=3',
  )

  const state: ListingState = { sort_by: 'lowest_price', page: 2, filters: { category_id: ['3', '4'], filter_id: ['12'] } }
  const query = new URL(listingHref('/colecao/verao', state), 'https://loja.test').searchParams
  assert.deepEqual(
    listingState({ sort_by: query.get('sort_by')!, page: query.get('page')!, filter_id: query.getAll('filter_id'), category_id: query.getAll('category_id') }),
    state,
  )
})

test('filtros: ligar, desligar e voltar para a primeira página', () => {
  const on = toggleFilter({ page: 3, sort_by: 'newest' }, 'filter_id', '12')
  assert.deepEqual(on, { page: 1, sort_by: 'newest', filters: { filter_id: ['12'] } })
  assert.deepEqual(toggleFilter(on, 'filter_id', '13').filters, { filter_id: ['12', '13'] })
  assert.deepEqual(toggleFilter(on, 'filter_id', '12').filters, { filter_id: [] })
  assert.equal(listingHref('/categoria/bolsas', toggleFilter(on, 'filter_id', '12')), '/categoria/bolsas?sort_by=newest')
})

test('links da vitrine Yampi viram rotas desta loja', () => {
  const store = 'https://loja.catalog.yampi.io'

  assert.equal(toRoute('/elegancia-em-cada-passo/l', store), '/colecao/elegancia-em-cada-passo')
  assert.equal(toRoute(`${store}/promocoes/ate-50-off`, store), '/promocao/ate-50-off')
  assert.equal(toRoute('/mocassim-em-couro-preto/p', store), '/produto/mocassim-em-couro-preto')
  assert.equal(toRoute('/sapatos/masculino?sort_by=best_sellers', store), '/categoria/sapatos/masculino')
  assert.equal(toRoute('/atendimento/contato', store), '/atendimento/contato')
  assert.equal(toRoute('/busca?q=bolsa', store), '/busca?q=bolsa')
  assert.equal(toRoute('/mocassim-em-couro-preto/p?sku=12&utm_source=email', store), '/produto/mocassim-em-couro-preto?sku=12&utm_source=email')
  assert.equal(toRoute('/elegancia-em-cada-passo/l?utm_campaign=inverno#topo', store), '/colecao/elegancia-em-cada-passo?utm_campaign=inverno#topo')
  assert.equal(toRoute(`${store}/?utm_source=email#ofertas`, store), '/?utm_source=email#ofertas')
  assert.equal(toRoute(store, store), '/')
  assert.equal(toRoute('https://www.instagram.com/loja', store), 'https://www.instagram.com/loja')
})
