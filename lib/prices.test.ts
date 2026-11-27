import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fromCheckout } from './prices.ts'

test('preço em promoção: a parcela é a do preço final, com Pix e as parcelas uma a uma', () => {
  const row = { amount_formated: 'R$ 231,66', tax: '0.00', installment_value: '115.83' }
  const { prices, installments } = fromCheckout({
    price: 231.66,
    price_sale: 260,
    has_promotion: true,
    percent_discount: 10.9,
    payment_methods: { pix: { discount: 3, price: 224.71 } },
    installments_data: {
      text: '12x de R$ 19,31 sem juros',
      installments: [
        { ...row, installment: 1, text: '1x de R$ 231,66', amount: '231.66', base_value: '231.66' },
        { ...row, installment: 2, text: '2x de R$ 115,83 sem juros', amount: '231.66', base_value: '231.66' },
      ],
    },
  })

  assert.deepEqual(prices, {
    price: 231.66,
    price_sale: 260,
    has_promotion: true,
    percent_discount: 10.9,
    installments: { data: { text: '12x de R$ 19,31 sem juros' } },
    pix: { price: 224.71, discount_percent: 3 },
  })
  assert.deepEqual(installments, [
    { installment: 1, text: '1x de R$ 231,66', amount: '231.66', base_value: '231.66', amount_formated: 'R$ 231,66' },
    { installment: 2, text: '2x de R$ 115,83 sem juros', amount: '231.66', base_value: '231.66', amount_formated: 'R$ 231,66' },
  ])
})

test('frações de centavo no preço e no Pix; produto sem parcelamento nem Pix', () => {
  const { prices, installments } = fromCheckout({ price: 544.401, price_sale: 1099.9, has_promotion: true, percent_discount: 50.5, installments_data: [] })

  assert.equal(prices.price, 544.4)
  assert.equal(prices.installments?.data?.text, undefined)
  assert.equal(prices.pix, undefined)
  assert.deepEqual(installments, [])

  const pix = fromCheckout({ price: 544.401, price_sale: 1099.9, has_promotion: true, percent_discount: 50.5, payment_methods: { pix: { discount: 3, price: 528.06897 } } })
  assert.equal(pix.prices.pix?.price, 528.07)
})
