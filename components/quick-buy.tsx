'use client'

import { fill } from '../lib/labels'
import { useCart } from './cart'
import { BagIcon } from './icons'

const LABELS = { add: 'Adicionar {name} ao carrinho' }
export type QuickBuyLabels = typeof LABELS

// Só o id e o nome: o que um componente de cliente recebe vai inteiro para o navegador, em cada card.
type Props = { skuId: number; name: string; labels?: Partial<QuickBuyLabels> }

/** Classe: quick-buy. De uso geral: icon-button. */
export function QuickBuy({ skuId, name, labels }: Props) {
  const cart = useCart()

  return (
    <button
      className="icon-button quick-buy"
      disabled={cart.busy}
      aria-label={fill({ ...LABELS, ...labels }.add, { name })}
      onPointerEnter={cart.warm}
      onClick={() => cart.add([{ skuId, quantity: 1 }])}
    >
      <BagIcon />
    </button>
  )
}
