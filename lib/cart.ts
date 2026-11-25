export type CartItem = {
  /** Num kit, o id de um dos itens: alterar ou remover um vale para o kit todo. */
  id: number
  name: string
  images: string[]
  price: number
  quantity: number
  parts?: string[]
}

export type Cart = { items: CartItem[]; count: number; total: number; discount: number; discountLabel: string }

export const EMPTY: Cart = { items: [], count: 0, total: 0, discount: 0, discountLabel: '' }

type Item = {
  id: number
  name: string
  name_with_grids?: string
  medium?: string
  price: number | string
  quantity: number | string
  bundle_id?: number | null
}

export type CheckoutCart = {
  items?: Item[]
  /** Um representante de cada kit; sem kits, a API manda `[]`. */
  grouped_items?: Record<string, { bundle_id?: number | null; bundle?: { name?: string; quantity?: number } | null }> | unknown[]
  prices?: { total: number | string; discount?: number | string }
  discounts_labels?: string | null
}

export function toCart(cart: CheckoutCart | null | undefined): Cart {
  const items = cart?.items ?? []
  const name = (item: Item) => item.name_with_grids || item.name
  const photo = (item: Item) => item.medium?.replace(/^\/\//, 'https://') ?? ''
  const kits = Object.values(cart?.grouped_items ?? {}) as { bundle_id?: number | null; bundle?: { name?: string; quantity?: number } | null }[]

  const lines = items.flatMap((item, index): CartItem[] => {
    if (!item.bundle_id) return [{ id: item.id, name: name(item), images: [photo(item)].filter(Boolean), price: Number(item.price), quantity: Number(item.quantity) }]

    const parts = items.filter((other) => other.bundle_id === item.bundle_id)
    if (items.indexOf(parts[0]) !== index) return []
    const kit = kits.find((group) => group.bundle_id === item.bundle_id)?.bundle
    const quantity = Number(kit?.quantity) || 1

    return [
      {
        id: item.id,
        name: kit?.name || 'Kit',
        images: [...new Set(parts.map(photo).filter(Boolean))],
        price: parts.reduce((total, part) => total + Number(part.price) * Number(part.quantity), 0) / quantity,
        quantity,
        parts: parts.map((part) => (Number(part.quantity) > quantity ? `${Number(part.quantity) / quantity} × ${name(part)}` : name(part))),
      },
    ]
  })

  return {
    items: lines,
    count: items.reduce((total, item) => total + Number(item.quantity), 0),
    total: Number(cart?.prices?.total ?? 0),
    discount: Number(cart?.prices?.discount ?? 0),
    discountLabel: cart?.discounts_labels || '',
  }
}
