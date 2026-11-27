import { cents } from './format.ts'
import type { CardProduct, Checkout, Customization } from './types'

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

// Começada a personalização opcional, o checkout passa a exigir os campos obrigatórios do cadastro.
export const mustFill = (field: Pick<Customization, 'required'>, fields: Pick<Customization, 'id'>[], answers: Record<number, string>, optional: boolean) =>
  field.required && (!optional || fields.some((other) => answers[other.id]?.trim()))

export type CartItem = {
  /** Num kit, o id de um dos itens: alterar ou remover um vale para o kit todo. */
  id: number
  skuId?: number
  name: string
  images: string[]
  price: number
  listPrice?: number
  quantity: number
  parts?: string[]
  /** Por id da personalização: o checkout a pede de novo a cada mudança de quantidade. */
  customization?: Record<number, string>
  /** Itens de um "compre junto": saem juntos do carrinho e não mudam de quantidade. */
  combo?: boolean
  /** Brinde da loja: o checkout não deixa mudar a quantidade nem tirá-lo do carrinho. */
  freebie?: boolean
}

export type Cart = { items: CartItem[]; count: number; total: number; discount: number; discountLabel: string; savings: number }

export const EMPTY: Cart = { items: [], count: 0, total: 0, discount: 0, discountLabel: '', savings: 0 }

type Item = {
  id: number
  product_option_id?: number
  name: string
  name_with_grids?: string
  medium?: string
  price: number | string
  price_sale?: number | string
  quantity: number | string
  bundle_id?: number | null
  /** O id do "compre junto"; o desconto dele vem no total do carrinho, não no item. */
  kit_id?: number | null
  is_freebie?: boolean
  customizations?: { id?: number; name: string; selected_value?: string | null }[]
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
      const chosen = (item.customizations ?? []).filter((custom) => custom.selected_value)
      const answers = Object.fromEntries(chosen.flatMap((custom) => (custom.id ? [[custom.id, String(custom.selected_value)]] : [])))
      const listPrice = Number(item.price_sale)
      return [
        {
          id: item.id,
          ...(item.product_option_id && { skuId: item.product_option_id }),
          name: name(item),
          images: [photo(item)].filter(Boolean),
          price: Number(item.price),
          // ponytail: com personalização, o preço soma o acréscimo dela e o price_sale não; o "de/por" do item fica de fora.
          ...(!item.is_freebie && chosen.length === 0 && listPrice > Number(item.price) && { listPrice }),
          quantity: Number(item.quantity),
          ...(chosen.length > 0 && { parts: chosen.map((custom) => `${custom.name}: ${custom.selected_value}`) }),
          ...(Object.keys(answers).length > 0 && { customization: answers }),
          ...(item.is_freebie && { freebie: true }),
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
        name: kit?.name || '',
        images: [...new Set(parts.map(photo).filter(Boolean))],
        price: cents(parts.reduce((total, part) => total + Number(part.price) * Number(part.quantity), 0) / quantity),
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
    savings: Math.max(0, cents(amount(prices?.items_discount) - amount(prices?.discount_without_wallet) + amount(prices?.discount))),
  }
}

export type Line = { skuId: number; quantity: number; customization?: Record<string, string> }
/** Os SKUs entram como um kit (`products/{id}/bundles`) ou como um "compre junto" (`products/{id}/combos`). */
export type Group = { kit?: number; combo?: number }
/** Sem `cart`, o carrinho na tela continua valendo. */
export type Result = { cart?: Cart; error?: string }

export const CART_TOKEN = 'yampi_cart_token'
// A plataforma guarda aqui a sessão do visitante: o carrinho que nasce com ela liga a visita à compra.
const SESSION = 'yampi_session'

type CheckoutResponse = { cart?: CheckoutCart | null; error?: boolean; message?: string | { message?: string }[] }

// Com o armazenamento bloqueado (alguns modos privados), o carrinho dura até a página recarregar.
export function checkoutCart(checkout: Checkout, failed: string, storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage) {
  const read = (key: string) => {
    try {
      return storage().getItem(key)
    } catch {
      return null
    }
  }
  const keep = (value: string) => {
    try {
      storage().setItem(CART_TOKEN, value)
    } catch {}
  }

  let token = read(CART_TOKEN) || read(SESSION) || Array.from(crypto.getRandomValues(new Uint8Array(20)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  // Uma mudança abre e fecha uma geração: a leitura feita antes ou durante ela pode não ter a mudança.
  let generation = 0

  const url = (base: string, suffix = '') => {
    const target = new URL(base)
    target.pathname += suffix
    target.searchParams.set('cart_token', token)
    return target
  }

  async function send(method: string, target: URL, body?: object): Promise<Result> {
    const response = await fetch(target, {
      method,
      headers: { Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify({ ...body, skipShipment: true, store_token: checkout.store_token, cart_token: token }),
      // Sem resposta do checkout, o carrinho mostra erro em vez de travar o botão de compra.
      signal: AbortSignal.timeout?.(15_000),
    }).catch(() => null)
    const data: CheckoutResponse | null = (await response?.json().catch(() => null)) ?? null

    if (!response?.ok || data?.error) {
      const message = Array.isArray(data?.message) ? data.message[0]?.message : data?.message
      return { error: message || failed }
    }

    return { cart: toCart(data?.cart) }
  }

  async function change(method: string, target: URL, body: object): Promise<Result> {
    generation++
    const result = await send(method, target, body)
    generation++
    // Depois de um erro o carrinho é relido: a adição de várias linhas que falha no meio deixa nele as que passaram.
    return result.error ? { ...(await send('GET', url(checkout.items_json))), error: result.error } : result
  }

  return {
    load: async (): Promise<Result> => {
      // Sem token gravado não há carrinho: quem só navega não consulta o checkout.
      const saved = read(CART_TOKEN)
      if (!saved) return {}
      token = saved
      const at = ++generation
      const result = await send('GET', url(checkout.items_json))
      return at === generation ? result : {}
    },
    add: (lines: Line[], group: Group = {}) => {
      // Outra aba pode ter criado o carrinho depois que esta montou: a adição vai para o mesmo carrinho.
      token = read(CART_TOKEN) || token
      // Gravado antes da resposta, e não depois: a adição que outra aba fizer ao mesmo tempo cai neste carrinho.
      keep(token)
      return change('POST', url(checkout.items), {
        product_option_id: lines.map((line) => line.skuId),
        quantity: lines.map((line) => line.quantity),
        ...(lines.some((line) => line.customization) && { customization: Object.fromEntries(lines.flatMap((line) => (line.customization ? [[line.skuId, line.customization]] : []))) }),
        // Com `bundle_id` o checkout cobra o preço do kit; com `kit_id`, dá o desconto do "compre junto".
        ...(group.kit && { bundle_id: group.kit }),
        ...(group.combo && { kit_id: group.combo }),
        metadata: { source_platform: 'headless' },
      })
    },
    update: ({ id, skuId, customization }: CartItem, quantity: number) =>
      change('PUT', url(checkout.items, `/${id}`), { quantity, ...(skuId && customization && { customization: { [skuId]: customization } }) }),
    remove: (item: CartItem) => change('DELETE', url(checkout.items, `/${item.id}/delete`), {}),
    checkoutUrl: () => url(checkout.redirect_to).toString(),
  }
}
