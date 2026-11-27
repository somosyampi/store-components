import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { catalog, hitPrices, search, suggest } from './search.ts'

const source = { endpoint: 'https://busca.test', storeId: 7 }

function answering(t: TestContext, ...bodies: unknown[]) {
  const urls: URL[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(new URL(url))
    return Response.json(bodies[Math.min(urls.length, bodies.length) - 1])
  })

  return urls
}

test('busca: ordenação, filtros e atributos agrupados viram a consulta do serviço', async (t) => {
  const urls = answering(t, { data: { data: [], total: 0, last_page: 1 } })
  await search({ ...source, q: 'bolsa', page: 2, sort_by: 'lowest_price', filters: { attributes: ['Cor:Marrom', 'Cor:Preto', 'Fecho:Zíper'], brand_name: ['Eleganzio'], categories_name: ['Bolsas'] } })
  const query = urls[0].searchParams

  assert.equal(urls[0].pathname, '/v1/search/public/products')
  assert.deepEqual([query.get('store_id'), query.get('q'), query.get('page'), query.get('sort')], ['7', 'bolsa', '2', 'price:asc'])
  assert.equal(query.get('attributes'), 'Cor:Marrom;Preto|Fecho:Zíper')
  assert.deepEqual([query.getAll('brand_name[]'), query.getAll('categories_name[]')], [['Eleganzio'], ['Bolsas']])
})

test('busca: ordenação que o serviço não tem (por nome) não vai na consulta', async (t) => {
  const urls = answering(t, { data: { data: [], total: 0, last_page: 1 } })
  await search({ ...source, q: 'bolsa', page: 1, sort_by: 'name_asc' })

  assert.equal(urls[0].searchParams.has('sort'), false)
})

test('busca: o resultado vira produtos, total, páginas e filtros; marca única não é filtro', async (t) => {
  const hit = { id: 1, name: 'Bolsa', slug: 'bolsa', image_url: null, price: 200, discount_price: 150 }
  answering(t, {
    data: { data: [{ content: hit }], total: 31, last_page: 2 },
    aggs: {
      categories: [{ key: 'Bolsas', doc_count: 3 }],
      brands: { buckets: [{ key: 'Eleganzio', doc_count: 3 }] },
      attributes: [{ key: 'Cor', values: { buckets: [{ key: 'Marrom', doc_count: 2 }] } }],
    },
  })
  const result = await search({ ...source, q: 'bolsa', page: 1 })

  assert.deepEqual([result.hits, result.total, result.pages], [[hit], 31, 2])
  assert.deepEqual(result.facets, [
    { param: 'categories_name', label: 'Categorias', options: [{ value: 'Bolsas', label: 'Bolsas', count: 3 }] },
    { param: 'attributes', label: 'Cor', options: [{ value: 'Cor:Marrom', label: 'Marrom', count: 2 }] },
  ])

  const named = await search({ ...source, q: 'bolsa', page: 1, labels: { categories: 'Departamentos' } })
  assert.equal(named.facets[0].label, 'Departamentos')
})

test('busca: resposta de erro do serviço vira exceção', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))

  await assert.rejects(search({ ...source, q: 'bolsa', page: 1 }), /503/)
})

test('sugestões: só textos, sem repetidos, no máximo nove; sem termo, pede os mais buscados', async (t) => {
  const urls = answering(t, { data: ['bolsa', 7, 'bolsa', 'sapato', ...Array.from({ length: 10 }, (_, index) => `carteira ${index}`)] }, { data: null })
  const terms = await suggest(source, 'bol')

  assert.deepEqual([terms.length, terms.slice(0, 3)], [9, ['bolsa', 'sapato', 'carteira 0']])
  assert.deepEqual(await suggest(source), [])
  assert.deepEqual(urls.map((url) => [url.pathname, url.searchParams.get('q')]), [['/v1/search/public/products/suggestions', 'bol'], ['/v1/search/public/products/suggestions', null]])
})

test('catálogo: percorre as páginas sem termo, que é o que não registra busca', async (t) => {
  const urls = answering(t, { data: { data: [{ content: { slug: 'a' } }], last_page: 2 } }, { data: { data: [{ content: { slug: 'b' } }], last_page: 2 } })

  assert.deepEqual(await catalog(source), ['a', 'b'])
  assert.deepEqual(urls.map((url) => [url.searchParams.get('page'), url.searchParams.has('q')]), [['1', false], ['2', false]])
})

test('preço da busca: o promocional, quando existe, é o preço e o cheio vira o "de"', () => {
  assert.deepEqual(hitPrices({ id: 1, name: '', slug: '', image_url: null, price: 200, discount_price: 150 }), { price: 150, price_sale: 200, has_promotion: true, percent_discount: 25 })
  assert.deepEqual(hitPrices({ id: 1, name: '', slug: '', image_url: null, price: 200, discount_price: 0 }), { price: 200, price_sale: 200, has_promotion: false, percent_discount: 0 })
})
