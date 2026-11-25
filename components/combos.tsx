'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { brl } from '../lib/format'
import { fill } from '../lib/labels'
import { comboOffer, type Combo } from '../lib/offers'
import { useCart } from './cart'
import { Price } from './price'

const LABELS = { title: 'Compre junto e economize', choose: 'Selecionar', total: 'Juntos por', saving: 'Economize {value}', buy: 'Comprar junto', unavailable: 'Indisponível' }
export type CombosLabels = typeof LABELS

type Props = { combos: Combo[]; sizes?: string; labels?: Partial<CombosLabels> }

/** Classes: combos, combo, combo-items, combo-media, combo-name, combo-total e a de Price. De uso geral: eyebrow, note, saving, button. */
export function Combos({ combos, sizes = '160px', labels }: Props) {
  // Produto sem SKU não tem preço nem o que pôr no carrinho: a oferta dele não aparece.
  const offers = combos.filter((combo) => combo.products.data.every((product) => product.skus.data.length > 0))
  if (!offers.length) return null
  const t = { ...LABELS, ...labels }

  return (
    <section className="combos">
      <h2>{t.title}</h2>
      {offers.map((combo) => (
        <ComboOffer key={combo.id} combo={combo} sizes={sizes} t={t} />
      ))}
    </section>
  )
}

function ComboOffer({ combo, sizes, t }: { combo: Combo; sizes: string; t: CombosLabels }) {
  const cart = useCart()
  const products = combo.products.data.map((product) => ({ ...product, sellable: product.skus.data.filter((sku) => !sku.blocked_sale) }))
  const [picked, setPicked] = useState<Record<number, number>>({})
  // A escolha só vale enquanto o SKU está à venda, e o único à venda já vem escolhido. A cada renderização: os dados podem mudar com a página aberta.
  const skus = products.map((product) => product.sellable.find((sku) => sku.id === picked[product.id]) ?? (product.sellable.length === 1 ? product.sellable[0] : undefined))
  const available = products.every((product) => product.sellable.length > 0)
  // Antes da escolha, a conta usa o primeiro SKU à venda: os bloqueados podem ter outro preço.
  const offer = comboOffer(combo, products.map((product, index) => (skus[index] ?? product.sellable[0] ?? product.skus.data[0]).prices.data.price))

  return (
    <div className="combo">
      <ul className="combo-items">
        {products.map((product, index) => {
          const photo = (skus[index]?.images.data[0] ?? product.images.data[0])?.url

          return (
            <li key={product.id}>
              <Link href={`/produto/${product.slug}`}>
                <span className="combo-media">{photo && <Image src={photo} alt="" fill sizes={sizes} />}</span>
                <span className="combo-name">{product.name}</span>
              </Link>
              {product.skus.data.length > 1 && (
                <label>
                  <span className="note">{product.skus.data[0].variations?.map((variation) => variation.name).join(' / ')}</span>
                  <select
                    required
                    aria-label={product.name}
                    value={skus[index]?.id ?? ''}
                    onChange={(event) => setPicked({ ...picked, [product.id]: Number(event.target.value) })}
                  >
                    <option value="">{t.choose}</option>
                    {product.skus.data.map((sku) => (
                      <option key={sku.id} value={sku.id} disabled={sku.blocked_sale}>
                        {sku.variations?.map((variation) => variation.value).join(' / ')}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          )
        })}
      </ul>

      <div className="combo-total">
        <p className="eyebrow">{t.total}</p>
        <Price prices={{ price: offer.total, price_sale: offer.full, has_promotion: offer.saving > 0, percent_discount: 0 }} />
        {offer.saving > 0 && <p className="note saving">{fill(t.saving, { value: brl(offer.saving) })}</p>}
        <button
          className="button"
          disabled={cart.busy || !available}
          onPointerEnter={cart.warm}
          onClick={(event) => {
            const lines = skus.flatMap((sku) => (sku ? { skuId: sku.id, quantity: 1 } : []))
            if (lines.length === products.length) return cart.add(lines, { combo: combo.id })
            event.currentTarget.closest('.combo')?.querySelector<HTMLSelectElement>('select:invalid')?.focus()
          }}
        >
          {available ? t.buy : t.unavailable}
        </button>
      </div>
    </div>
  )
}
