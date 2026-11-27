import Image from 'next/image'
import { brl } from '../lib/format'
import { fill } from '../lib/labels'
import type { Kit } from '../lib/offers'
import { AddKit } from './cart'
import { Price, type PriceLabels } from './price'

const LABELS = {
  eyebrow: 'Leve o kit',
  freeShipping: 'frete grátis',
  total: 'Kit completo',
  saving: 'Economize {value}',
  add: 'Adicionar kit ao carrinho',
}
export type KitLabels = typeof LABELS & PriceLabels

type Props = { kit: Kit; sizes?: string; labels?: Partial<KitLabels> }

/** Classes: kit, picks, pick, pick-media, pick-name, kit-total. De uso geral: eyebrow, price, note, saving, button, button-ghost. */
export function KitOffer({ kit, sizes = '72px', labels }: Props) {
  const t = { ...LABELS, ...labels }
  const sum = (key: 'price' | 'full') => kit.items.reduce((total, item) => total + item[key] * item.quantity, 0)
  const total = sum('price')
  const saving = sum('full') - total

  return (
    <section className="kit" aria-labelledby={`kit-${kit.id}`}>
      <p className="eyebrow">
        {t.eyebrow}
        {kit.freeShipping && ` · ${t.freeShipping}`}
      </p>
      <h2 id={`kit-${kit.id}`}>{kit.name}</h2>
      <ul className="picks">
        {kit.items.map((item) => (
          <li key={item.id}>
            <span className="pick">
              <span className="pick-media">{item.image && <Image src={item.image} alt="" fill sizes={sizes} />}</span>
              <span className="pick-name">
                {item.quantity > 1 && `${item.quantity} × `}
                {item.name}
              </span>
            </span>
            <Price prices={{ price: item.price, price_sale: item.full, has_promotion: item.price < item.full, percent_discount: 0 }} labels={labels} />
          </li>
        ))}
      </ul>
      <p className="kit-total">
        <span>
          {t.total}
          {saving >= 0.01 && <span className="note saving">{fill(t.saving, { value: brl(saving) })}</span>}
        </span>
        <strong>{brl(total)}</strong>
      </p>
      <AddKit id={kit.id} lines={kit.items.map(({ skuId, quantity }) => ({ skuId, quantity }))}>
        {t.add}
      </AddKit>
    </section>
  )
}
