'use client'

import { createContext, use, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { preconnect } from 'react-dom'
import { CART_TOKEN, EMPTY, checkoutCart, type Group, type Line, type Result } from '../lib/cart'
import { brl } from '../lib/format'
import { fill, plural } from '../lib/labels'
import type { RichText as RichTextValue } from '../lib/rich-text'
import type { Checkout } from '../lib/types'
import { BagIcon, CloseIcon } from './icons'
import { RichText } from './rich-text'

export type { Group, Line } from '../lib/cart'

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
  kit: 'Kit',
  freebie: 'Brinde',
  discount: 'Desconto',
  itemSavings: '{value} mais barato',
  savings: 'Você economizou',
  subtotal: 'Subtotal',
  note: 'Frete e cupons são calculados no checkout.',
  checkout: 'Finalizar compra',
}
export type CartLabels = typeof LABELS

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
  savings?: { items?: boolean; total?: boolean }
  empty?: { text?: RichTextValue; action?: { label: string; href: string } }
  variant?: string
  children: ReactNode
}

/**
 * Classes: drawer, drawer-panel, drawer-head, drawer-empty, drawer-empty-action, drawer-items, thumbs,
 * thumbs-kit, drawer-price, drawer-item-saving, stepper, drawer-foot, drawer-discount, drawer-savings,
 * drawer-total. De uso geral: icon-button, text-button, button, alert, note, saving, tag, prose. Atributo:
 * data-variant no drawer, com o valor de `variant`.
 */
export function CartProvider({ checkout, labels, savings, empty, variant, children }: ProviderProps) {
  const t = { ...LABELS, ...labels }
  const title = useId()
  const api = useRef<Api | null>(null)
  const pending = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  // O navegador tira o foco do botão que fica desabilitado durante o pedido: ele volta a quem pediu e a quem abriu o carrinho.
  const trigger = useRef<Element | null>(null)
  const opener = useRef<Element | null>(null)
  const [cart, setCart] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const apply = (result: Result) => {
    if (result.cart) setCart(result.cart)
    if (result.error) setError(result.error)
  }

  async function run(action: (api: Api) => Promise<Result>) {
    if (!api.current || pending.current) return
    pending.current = true
    trigger.current = document.activeElement
    setBusy(true)
    setError('')
    try {
      apply(await action(api.current))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  useEffect(() => {
    const current = checkoutCart(checkout, t.failed)
    api.current = current
    const load = () => current.load().then(apply)
    // Outra aba pode ter mudado o carrinho: ele é relido quando ela cria um e quando o visitante volta para esta.
    const created = (event: StorageEvent) => event.key === CART_TOKEN && load()
    const back = () => document.visibilityState === 'visible' && load()
    load()
    addEventListener('storage', created)
    document.addEventListener('visibilitychange', back)
    return () => {
      removeEventListener('storage', created)
      document.removeEventListener('visibilitychange', back)
    }
  }, [checkout, t.failed])

  useEffect(() => {
    if (!busy && document.activeElement === document.body && trigger.current instanceof HTMLElement) trigger.current.focus()
  }, [busy])

  const show = (from: Element | null) => {
    if (!dialog.current || dialog.current.open) return
    opener.current = from
    dialog.current.showModal()
  }

  return (
    <CartContext
      value={{
        count: cart.count,
        busy,
        open: () => show(document.activeElement),
        warm: () => preconnect(new URL(checkout.items).origin),
        add: async (lines, group) => {
          const from = document.activeElement
          await run((api) => api.add(lines, group))
          show(from)
        },
      }}
    >
      {children}

      <dialog
        ref={dialog}
        className="drawer"
        data-variant={variant}
        aria-labelledby={title}
        // O clique que chega no próprio <dialog> é o clique no fundo escurecido.
        onClick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
        onClose={() => {
          setError('')
          if (document.activeElement === document.body && opener.current instanceof HTMLElement) opener.current.focus()
        }}
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
            <>
              <p className="drawer-empty">{t.empty}</p>
              {empty?.text && empty.text.length > 0 && <RichText value={empty.text} />}
              {empty?.action && (
                <a className="button drawer-empty-action" href={empty.action.href}>
                  {empty.action.label}
                </a>
              )}
            </>
          ) : (
            <>
              <ul className="drawer-items">
                {cart.items.map((item) => {
                  const name = item.combo ? t.combo : item.name || t.kit

                  return (
                    <li key={item.id}>
                      {/* <img> simples: o checkout já entrega as miniaturas no tamanho. */}
                      <div className={item.images.length > 1 ? 'thumbs thumbs-kit' : 'thumbs'}>
                        {item.images.slice(0, 2).map((src) => (
                          <img key={src} src={src} alt="" width={72} height={72} loading="lazy" />
                        ))}
                      </div>
                      <div>
                        <p>{name}</p>
                        {item.parts && <p className="note">{item.parts.join(' + ')}</p>}
                        {item.freebie ? <p className="tag">{t.freebie}</p> : <p className="drawer-price">{brl(item.price)}</p>}
                        {savings?.items && item.listPrice && <p className="drawer-item-saving saving">{fill(t.itemSavings, { value: brl(item.listPrice - item.price) })}</p>}
                        {!item.freebie && (
                          <div className="stepper">
                            {!item.combo && (
                              <>
                                <button
                                  disabled={busy}
                                  aria-label={fill(t.decrease, { name })}
                                  onClick={() => run((api) => (item.quantity > 1 ? api.update(item, item.quantity - 1) : api.remove(item)))}
                                >
                                  −
                                </button>
                                <span role="status" aria-label={fill(t.quantity, { count: item.quantity })}>
                                  {item.quantity}
                                </span>
                                <button disabled={busy} aria-label={fill(t.increase, { name })} onClick={() => run((api) => api.update(item, item.quantity + 1))}>
                                  +
                                </button>
                              </>
                            )}
                            <button className="text-button" disabled={busy} onClick={() => run((api) => api.remove(item))}>
                              {t.remove}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <footer className="drawer-foot">
                {cart.discount > 0 && (
                  <p className="drawer-discount saving">
                    <span>{cart.discountLabel || t.discount}</span>
                    <span>−{brl(cart.discount)}</span>
                  </p>
                )}
                {savings?.total && cart.savings > 0 && (
                  <p className="drawer-savings saving">
                    <span>{t.savings}</span>
                    <span>{brl(cart.savings)}</span>
                  </p>
                )}
                <p className="drawer-total">
                  <span>{t.subtotal}</span>
                  <strong role="status">{brl(cart.total)}</strong>
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
