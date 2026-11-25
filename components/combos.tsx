'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { brl } from '../lib/format'
import { fill } from '../lib/labels'
import { comboOffer, type Combo } from '../lib/offers'
import { useCart } from './cart'
import { Price } from './price'

const LABELS = { title: 'Compre junto e economize', choose: 'Selecionar', saving: 'Economize {value}', buy: 'Comprar junto', unavailable: 'Indisponível' }
export type CombosLabels = typeof LABELS

type Props = { combos: Combo[]; sizes?: string; labels?: Partial<CombosLabels> }

/** Classes: combos, combo, combo-items, combo-media, combo-name, combo-total e a de Price. De uso geral: note, saving, button. */
export function Combos({ combos, sizes = '160px', labels }: Props) {
  if (!combos.length) return null
  const t = { ...LABELS, ...labels }

  return (
    <section className="combos">
      <h2>{t.title}</h2>
      {combos.map((combo) => (
        <ComboOffer key={combo.id} combo={combo} sizes={sizes} t={t} />
      ))}
    </section>
  )
}

function ComboOffer({ combo, sizes, t }: { combo: Combo; sizes: string; t: CombosLabels }) {
  const cart = useCart()
  const products = combo.products.data.map((product) => ({ ...product, sellable: product.skus.data.filter((sku) => !sku.blocked_sale) }))
  // O produto com um único SKU à venda já vem escolhido.
  const [picked, setPicked] = useState(() => products.map((product) => (product.sellable.length === 1 ? product.sellable[0].id : 0)))
  const skus = products.map((product, index) => product.sellable.find((sku) => sku.id === picked[index]))
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
                <select
                  required
                  aria-label={product.name}
                  value={picked[index] || ''}
                  onChange={(event) => setPicked(picked.map((id, position) => (position === index ? Number(event.target.value) : id)))}
                >
                  <option value="">{t.choose}</option>
                  {product.skus.data.map((sku) => (
                    <option key={sku.id} value={sku.id} disabled={sku.blocked_sale}>
                      {sku.variations?.map((variation) => variation.value).join(' / ')}
                    </option>
                  ))}
                </select>
              )}
            </li>
          )
        })}
      </ul>

      <div className="combo-total">
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
