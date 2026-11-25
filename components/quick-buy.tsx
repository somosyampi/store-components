'use client'

import { fill } from '../lib/labels'
import type { CardProduct } from '../lib/types'
import { useCart } from './cart'
import { BagIcon } from './icons'

const LABELS = { add: 'Adicionar {name} ao carrinho' }
export type QuickBuyLabels = typeof LABELS

type Props = { product: Pick<CardProduct, 'name' | 'sku_id' | 'has_variations' | 'blocked_sale'>; labels?: Partial<QuickBuyLabels> }

/** Classe: quick-buy. De uso geral: icon-button. */
export function QuickBuy({ product, labels }: Props) {
  const cart = useCart()
  const skuId = product.sku_id
  // ponytail: só o produto sem variações; para escolher uma no card, abra um <dialog> com as opções do produto.
  if (!skuId || product.has_variations || product.blocked_sale) return null

  return (
    <button
      className="icon-button quick-buy"
      disabled={cart.busy}
      aria-label={fill({ ...LABELS, ...labels }.add, { name: product.name })}
      onPointerEnter={cart.warm}
      onClick={() => cart.add([{ skuId, quantity: 1 }])}
    >
      <BagIcon />
    </button>
  )
}
