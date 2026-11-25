import assert from 'node:assert/strict'
import { test } from 'node:test'
import { productSchema, storeSchema } from './schema.ts'

const url = 'https://loja.com.br/produto/mocassim'
const InStock = 'https://schema.org/InStock'
const OutOfStock = 'https://schema.org/OutOfStock'
const sku = (id: number, combinations: string, price: number, extra: object = {}) => ({
  id,
  sku: `COD${id}`,
  barcode: null,
  blocked_sale: false,
  combinations,
  prices: { data: { price, price_sale: price, has_promotion: false } },
  images: { data: [] },
  ...extra,
})
// O resultado é um Product ou um ProductGroup: os testes o leem como JSON, sem distinguir os tipos.
const json = (schema: object) => schema as Record<string, any>
const base = { id: 7, name: 'Mocassim', url, images: [{ url: 'https://img/1.png' }, { url: 'https://img/2.png' }], brand: 'Eleganzio', category: 'Sapatos > Masculino' }

test('produto sem variação: um Product com um Offer, o preço cheio riscado e os códigos válidos', () => {
  const promo = sku(1, '', 434.3, { barcode: '7891234567895', prices: { data: { price: 434.3, price_sale: 649.9, has_promotion: true } } })

  assert.deepEqual(productSchema({ ...base, description: 'Couro legítimo.', variations: [], skus: [promo] }), {
    '@type': 'Product',
    name: 'Mocassim',
    description: 'Couro legítimo.',
    brand: { '@type': 'Brand', name: 'Eleganzio' },
    image: ['https://img/1.png', 'https://img/2.png'],
    category: 'Sapatos > Masculino',
    sku: 'COD1',
    gtin: '7891234567895',
    offers: {
      '@type': 'Offer',
      url,
      price: 434.3,
      priceCurrency: 'BRL',
      availability: InStock,
      priceSpecification: { '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/StrikethroughPrice', price: 649.9, priceCurrency: 'BRL' },
    },
  })

  const odd = json(productSchema({ ...base, variations: [], skus: [sku(2, '', 90, { sku: 'A B', barcode: '123', blocked_sale: true })] }))
  assert.equal('sku' in odd || 'gtin' in odd, false)
  assert.equal(odd.offers.availability, OutOfStock)
  assert.equal('priceSpecification' in odd.offers, false)
})

test('produto com variações: um ProductGroup com uma variante por SKU, cada uma com o seu endereço', () => {
  const variations = [
    { id: 1, name: 'Cor', values: { data: [{ id: 10, value: 'Preto' }, { id: 11, value: 'Marrom' }] } },
    { id: 2, name: 'Numeração', values: { data: [{ id: 20, value: '39' }, { id: 21, value: '40' }] } },
  ]
  // O 39 preto custa menos e está esgotado: ele não vira o preço do produto, só o da própria variante.
  const skus = [sku(100, '10-20', 379.9, { blocked_sale: true }), sku(101, '21-10', 459.9), sku(102, '11-20', 459.9, { images: { data: [{ url: 'https://img/marrom.png' }] } })]
  const group = json(productSchema({ ...base, variations, skus }))

  assert.equal(group['@type'], 'ProductGroup')
  assert.deepEqual([group.url, group.productGroupID, group.variesBy], [url, '7', ['https://schema.org/color', 'https://schema.org/size']])
  assert.deepEqual(
    group.hasVariant.map((variant: Record<string, any>) => [variant.name, variant.sku, variant.color, variant.size, variant.offers.price, variant.offers.availability, variant.offers.url, variant.image[0]]),
    [
      ['Mocassim Preto 39', 'COD100', 'Preto', '39', 379.9, OutOfStock, `${url}?sku=100`, 'https://img/1.png'],
      ['Mocassim Preto 40', 'COD101', 'Preto', '40', 459.9, InStock, `${url}?sku=101`, 'https://img/1.png'],
      ['Mocassim Marrom 39', 'COD102', 'Marrom', '39', 459.9, InStock, `${url}?sku=102`, 'https://img/marrom.png'],
    ],
  )
  assert.equal('offers' in group, false)

  const volts = [{ id: 3, name: 'Voltagem', values: { data: [{ id: 30, value: '110V' }, { id: 31, value: '220V' }] } }]
  const other = json(productSchema({ ...base, variations: volts, skus: [sku(200, '30', 50), sku(201, '31', 50)] }))
  assert.equal('variesBy' in other, false)
  assert.deepEqual(other.hasVariant.map((variant: Record<string, any>) => variant.name), ['Mocassim 110V', 'Mocassim 220V'])
})

test('loja: OnlineStore com o que o lojista cadastrou, sem campos pela metade', () => {
  const store = storeSchema({
    name: 'Eleganzio',
    url: 'https://loja.com.br',
    logo: 'https://img/logo.png',
    email: 'oi@loja.com.br',
    legalName: 'Eleganzio LTDA',
    taxId: '12345678000190',
    address: { street: 'Rua das Flores', number: '70', complement: 'Sala 2', city: 'Ibitinga', state: 'SP', zipcode: '14940-564' },
    links: ['https://www.instagram.com/eleganzio', 'https://x.com/', '', null, 'nada'],
  })

  assert.deepEqual(store, {
    '@type': 'OnlineStore',
    name: 'Eleganzio',
    url: 'https://loja.com.br',
    logo: 'https://img/logo.png',
    email: 'oi@loja.com.br',
    legalName: 'Eleganzio LTDA',
    taxID: '12345678000190',
    address: { '@type': 'PostalAddress', streetAddress: 'Rua das Flores, 70 - Sala 2', addressLocality: 'Ibitinga', addressRegion: 'SP', postalCode: '14940-564', addressCountry: 'BR' },
    sameAs: ['https://www.instagram.com/eleganzio'],
  })
  assert.deepEqual(storeSchema({ name: 'Loja', url: 'https://loja.com.br', legalName: 'Loja', address: { street: 'Rua A' } }), { '@type': 'OnlineStore', name: 'Loja', url: 'https://loja.com.br' })
})
