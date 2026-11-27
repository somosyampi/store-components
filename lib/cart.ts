import type { CardProduct, Customization } from './types'

// ponytail: só o produto sem variações; para escolher uma no card, abra um <dialog> com as opções do produto. A listagem não diz quem exige personalização: esse o checkout recusa, e o carrinho mostra o motivo.
export const quickBuySku = ({ sku_id, has_variations, blocked_sale }: Pick<CardProduct, 'sku_id' | 'has_variations' | 'blocked_sale'>) =>
  sku_id && has_variations === false && blocked_sale === false ? sku_id : null

// A opção de uma lista vai como foi cadastrada: só o texto livre é filtrado.
// Sem espaços no início: um valor só de espaços passaria pelo `required` do navegador e chegaria vazio ao checkout.
export const cleanAnswer = (value: string, { type, allowed_values: rule }: Pick<Customization, 'type' | 'allowed_values'>) =>
  type === 'select' ? value : (rule === 'letters' ? value.replace(/[^\p{L} ]/gu, '') : rule === 'numbers' ? value.replace(/\D/g, '') : value).trimStart()

/** `optional` é o `allow_sell_without_customization` do SKU. */
export function toCustomization(fields: Pick<Customization, 'id'>[], answers: Record<number, string>, optional: boolean) {
  const all = Object.fromEntries(fields.map((field) => [field.id, (answers[field.id] ?? '').trim()]))
  const filled = Object.fromEntries(Object.entries(all).filter(([, value]) => value))
  if (Object.keys(filled).length) return filled

  // Sem nada preenchido num SKU que exige personalização, vão os campos vazios: quem recusa é o checkout, com a mensagem dele.
  return optional || !fields.length ? undefined : all
}

export type CartItem = {
  /** Num kit, o id de um dos itens: alterar ou remover um vale para o kit todo. */
  id: number
  name: string
  images: string[]
  price: number
  listPrice?: number
  quantity: number
  parts?: string[]
  /** Itens de um "compre junto": saem juntos do carrinho e não mudam de quantidade. */
  combo?: boolean
}

export type Cart = { items: CartItem[]; count: number; total: number; discount: number; discountLabel: string; savings: number }

export const EMPTY: Cart = { items: [], count: 0, total: 0, discount: 0, discountLabel: '', savings: 0 }

type Item = {
  id: number
  name: string
  name_with_grids?: string
  medium?: string
  price: number | string
  price_sale?: number | string
  quantity: number | string
  bundle_id?: number | null
  /** O id do "compre junto"; o desconto dele vem no total do carrinho, não no item. */
  kit_id?: number | null
  customizations?: { name: string; selected_value?: string | null }[]
}

export type CheckoutCart = {
  items?: Item[]
  /** Um representante de cada kit; sem kits, a API manda `[]`. */
  grouped_items?: Record<string, { bundle_id?: number | null; bundle?: { name?: string; quantity?: number } | null }> | unknown[]
  prices?: { total: number | string; discount?: number | string; items_discount?: number | string; discount_without_wallet?: number | string }
  discounts_labels?: string | null
}

export function toCart(cart: CheckoutCart | null | undefined): Cart {
  const items = cart?.items ?? []
  const name = (item: Item) => item.name_with_grids || item.name
  const photo = (item: Item) => item.medium?.replace(/^\/\//, 'https://') ?? ''
  const kits = Object.values(cart?.grouped_items ?? {}) as { bundle_id?: number | null; bundle?: { name?: string; quantity?: number } | null }[]

  const lines = items.flatMap((item, index): CartItem[] => {
    if (!item.bundle_id && !item.kit_id) {
      const chosen = (item.customizations ?? []).flatMap((custom) => (custom.selected_value ? `${custom.name}: ${custom.selected_value}` : []))
      const listPrice = Number(item.price_sale)
      return [
        {
          id: item.id,
          name: name(item),
          images: [photo(item)].filter(Boolean),
          price: Number(item.price),
          // ponytail: com personalização, o preço soma o acréscimo dela e o price_sale não; o "de/por" do item fica de fora.
          ...(chosen.length === 0 && listPrice > Number(item.price) && { listPrice }),
          quantity: Number(item.quantity),
          ...(chosen.length > 0 && { parts: chosen }),
        },
      ]
    }

    const parts = items.filter((other) => (item.bundle_id ? other.bundle_id === item.bundle_id : other.kit_id === item.kit_id))
    if (items.indexOf(parts[0]) !== index) return []
    const kit = kits.find((group) => group.bundle_id && group.bundle_id === item.bundle_id)?.bundle
    const quantity = Number(kit?.quantity) || 1

    return [
      {
        id: item.id,
        name: kit?.name || (item.bundle_id ? 'Kit' : ''),
        images: [...new Set(parts.map(photo).filter(Boolean))],
        price: Math.round((parts.reduce((total, part) => total + Number(part.price) * Number(part.quantity), 0) / quantity) * 100) / 100,
        quantity,
        parts: parts.map((part) => (Number(part.quantity) > quantity ? `${Number(part.quantity) / quantity} × ${name(part)}` : name(part))),
        ...(!item.bundle_id && { combo: true }),
      },
    ]
  })

  const amount = (value?: number | string) => Number(value) || 0
  const prices = cart?.prices

  return {
    items: lines,
    count: items.reduce((total, item) => total + Number(item.quantity), 0),
    total: Number(prices?.total ?? 0),
    discount: Number(prices?.discount ?? 0),
    discountLabel: cart?.discounts_labels || '',
    // items_discount soma o "de/por" dos itens e os descontos do carrinho; discount_without_wallet é a parte do carrinho.
    savings: Math.max(0, Math.round((amount(prices?.items_discount) - amount(prices?.discount_without_wallet) + amount(prices?.discount)) * 100) / 100),
  }
}
