'use client'

import { createContext, use, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { preconnect } from 'react-dom'
import { EMPTY, toCart, type Cart, type CartItem, type CheckoutCart } from '../lib/cart'
import { brl } from '../lib/format'
import { fill, plural } from '../lib/labels'
import type { Checkout } from '../lib/types'
import { BagIcon, CloseIcon } from './icons'

export type Line = { skuId: number; quantity: number }
/** Os SKUs entram como um kit (`products/{id}/bundles`) ou como um "compre junto" (`products/{id}/combos`). */
export type Group = { kit?: number; combo?: number }

type CheckoutResponse = { cart?: CheckoutCart | null; error?: boolean; message?: string | { message?: string }[] }

const LABELS = {
  title: 'Carrinho',
  close: 'Fechar carrinho',
  empty: 'Seu carrinho está vazio.',
  failed: 'Não foi possível atualizar o carrinho. Tente novamente.',
  decrease: 'Diminuir quantidade de {name}',
  quantity: 'Quantidade: {count}',
  increase: 'Aumentar quantidade de {name}',
  remove: 'Remover',
  combo: 'Compre junto',
  discount: 'Desconto',
  subtotal: 'Subtotal',
  note: 'Frete e cupons são calculados no checkout.',
  checkout: 'Finalizar compra',
}
export type CartLabels = typeof LABELS

const TOKEN = 'yampi_cart_token'

// Com o armazenamento bloqueado (alguns modos privados), o carrinho dura até a página recarregar.
// ponytail: o token nunca é trocado; se o checkout recusar carrinhos já finalizados, gere outro quando `add` falhar.
function cartToken() {
  const fresh = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  try {
    const stored = localStorage.getItem(TOKEN)
    if (stored) return { token: stored, stored: true }

    const token = fresh()
    localStorage.setItem(TOKEN, token)
    return { token, stored: false }
  } catch {
    return { token: fresh(), stored: false }
  }
}

function checkoutCart(checkout: Checkout, failed: string) {
  const { token, stored } = cartToken()

  const url = (base: string, suffix = '') => {
    const target = new URL(base)
    target.pathname += suffix
    target.searchParams.set('cart_token', token)
    return target
  }

  async function send(method: string, target: URL, body?: object): Promise<Cart> {
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
      throw new Error(message || failed)
    }

    return toCart(data?.cart)
  }

  return {
    load: async () => (stored ? send('GET', url(checkout.items_json)) : EMPTY),
    add: (lines: Line[], group: Group = {}) =>
      send('POST', url(checkout.items), {
        product_option_id: lines.map((line) => line.skuId),
        quantity: lines.map((line) => line.quantity),
        // Com `bundle_id` o checkout cobra o preço do kit; com `kit_id`, dá o desconto do "compre junto".
        ...(group.kit && { bundle_id: group.kit }),
        ...(group.combo && { kit_id: group.combo }),
        metadata: { source_platform: 'headless' },
      }),
    update: (item: CartItem, quantity: number) =>
      send('PUT', url(checkout.items, `/${item.id}`), { product_option_id: item.id, oldQuantity: item.quantity, quantity }),
    remove: (item: CartItem) => send('DELETE', url(checkout.items, `/${item.id}/delete`), { product_option_id: item.id }),
    checkoutUrl: () => url(checkout.redirect_to).toString(),
  }
}

type Api = ReturnType<typeof checkoutCart>

const CartContext = createContext<{
  count: number
  busy: boolean
  add(lines: Line[], group?: Group): Promise<void>
  open(): void
  warm(): void
} | null>(null)

export function useCart() {
  const cart = use(CartContext)
  if (!cart) throw new Error('useCart precisa estar dentro de <CartProvider>')
  return cart
}

type ProviderProps = {
  checkout: Checkout
  labels?: Partial<CartLabels>
  children: ReactNode
}

/**
 * Classes: drawer, drawer-panel, drawer-head, drawer-empty, drawer-items, thumbs, thumbs-kit,
 * drawer-price, stepper, drawer-foot, drawer-discount, drawer-total. De uso geral: icon-button,
 * text-button, button, alert, note, saving.
 */
export function CartProvider({ checkout, labels, children }: ProviderProps) {
  const t = { ...LABELS, ...labels }
  const title = useId()
  const api = useRef<Api | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [cart, setCart] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: (api: Api) => Promise<Cart>) {
    if (!api.current) return
    setBusy(true)
    setError('')
    try {
      setCart(await action(api.current))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.failed)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    api.current = checkoutCart(checkout, t.failed)
    run((api) => api.load())
  }, [checkout, t.failed])

  const open = () => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }

  return (
    <CartContext
      value={{
        count: cart.count,
        busy,
        open,
        warm: () => preconnect(new URL(checkout.items).origin),
        add: async (lines, group) => {
          await run((api) => api.add(lines, group))
          open()
        },
      }}
    >
      {children}

      <dialog
        ref={dialog}
        className="drawer"
        aria-labelledby={title}
        // O clique que chega no próprio <dialog> é o clique no fundo escurecido.
        onClick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
      >
        <div className="drawer-panel">
          <header className="drawer-head">
            <h2 id={title}>{t.title}</h2>
            <button className="icon-button" onClick={() => dialog.current?.close()} aria-label={t.close}>
              <CloseIcon />
            </button>
          </header>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          {cart.items.length === 0 ? (
            <p className="drawer-empty">{t.empty}</p>
          ) : (
            <>
              <ul className="drawer-items">
                {cart.items.map((item) => (
                  <li key={item.id}>
                    {/* <img> simples: o checkout já entrega as miniaturas no tamanho. */}
                    <div className={item.images.length > 1 ? 'thumbs thumbs-kit' : 'thumbs'}>
                      {item.images.slice(0, 2).map((src) => (
                        <img key={src} src={src} alt="" width={72} height={72} loading="lazy" />
                      ))}
                    </div>
                    <div>
                      <p>{item.combo ? t.combo : item.name}</p>
                      {item.parts && <p className="note">{item.parts.join(' + ')}</p>}
                      <p className="drawer-price">{brl(item.price)}</p>
                      <div className="stepper">
                        {!item.combo && (
                          <>
                            <button
                              disabled={busy}
                              aria-label={fill(t.decrease, { name: item.name })}
                              onClick={() => run((api) => (item.quantity > 1 ? api.update(item, item.quantity - 1) : api.remove(item)))}
                            >
                              −
                            </button>
                            <span aria-label={fill(t.quantity, { count: item.quantity })}>{item.quantity}</span>
                            <button disabled={busy} aria-label={fill(t.increase, { name: item.name })} onClick={() => run((api) => api.update(item, item.quantity + 1))}>
                              +
                            </button>
                          </>
                        )}
                        <button className="text-button" disabled={busy} onClick={() => run((api) => api.remove(item))}>
                          {t.remove}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <footer className="drawer-foot">
                {cart.discount > 0 && (
                  <p className="drawer-discount saving">
                    <span>{cart.discountLabel || t.discount}</span>
                    <span>−{brl(cart.discount)}</span>
                  </p>
                )}
                <p className="drawer-total">
                  <span>{t.subtotal}</span>
                  <strong>{brl(cart.total)}</strong>
                </p>
                <p className="note">{t.note}</p>
                <button className="button" disabled={busy} onClick={() => api.current && location.assign(api.current.checkoutUrl())}>
                  {t.checkout}
                </button>
              </footer>
            </>
          )}
        </div>
      </dialog>
    </CartContext>
  )
}

/** Classes: button, button-ghost. */
export function AddKit({ id, lines, children = 'Adicionar kit ao carrinho' }: { id: number; lines: Line[]; children?: ReactNode }) {
  const cart = useCart()

  return (
    <button className="button button-ghost" disabled={cart.busy} onPointerEnter={cart.warm} onClick={() => cart.add(lines, { kit: id })}>
      {children}
    </button>
  )
}

const BUTTON_LABELS = { open_one: 'Abrir carrinho, {count} item', open_other: 'Abrir carrinho, {count} itens' }
export type CartButtonLabels = typeof BUTTON_LABELS

/** Classes: cart-button, cart-count. */
export function CartButton({ labels }: { labels?: Partial<CartButtonLabels> }) {
  const t = { ...BUTTON_LABELS, ...labels }
  const { count, open } = useCart()

  return (
    <button className="cart-button" onClick={open} aria-label={plural(t.open_one, t.open_other, count)}>
      <BagIcon />
      {/* Sempre visível (mesmo em zero), para o cabeçalho não se mexer quando o carrinho carrega. */}
      <span className="cart-count">{count}</span>
    </button>
  )
}
