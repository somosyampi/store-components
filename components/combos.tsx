'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { brl } from '../lib/format'
import { fill } from '../lib/labels'
import { buyable, comboChoice, type Combo, type Picks } from '../lib/offers'
import { useCart } from './cart'
import { PRICE_LABELS, Price } from './price'

const LABELS = { ...PRICE_LABELS, title: 'Compre junto e economize', choose: 'Selecionar', total: 'Juntos por', saving: 'Economize {value}', buy: 'Comprar junto', unavailable: 'Indisponível' }
export type CombosLabels = typeof LABELS

type Props = { combos: Combo[]; sizes?: string; labels?: Partial<CombosLabels> }

/** Classes: combos, combo, combo-items, combo-media, combo-name, combo-total e a de Price. De uso geral: eyebrow, note, saving, button. */
export function Combos({ combos, sizes = '160px', labels }: Props) {
  const offers = buyable(combos)
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
  const [picked, setPicked] = useState<Picks>({})
  const { skus, available, full, total, saving } = comboChoice(combo, picked)
  const products = combo.products.data

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
        <Price prices={{ price: total, price_sale: full, has_promotion: saving > 0, percent_discount: 0 }} labels={t} />
        {saving > 0 && <p className="note saving">{fill(t.saving, { value: brl(saving) })}</p>}
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
