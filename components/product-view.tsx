'use client'

import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { brl } from '../lib/format'
import { fill, plural } from '../lib/labels'
import { cashbackFor, tierOffer, type Cashback, type Tier } from '../lib/offers'
import type { Customization, Flag, Image as Photo, Installment, Prices, Ratings, Sku, Variation } from '../lib/types'
import { useCart } from './cart'
import { Flags } from './flags'
import { Groups, type Sibling } from './groups'
import { CloseIcon, PixIcon, SearchIcon } from './icons'
import { Price } from './price'
import { Rating, REVIEWS_ID, type RatingLabels } from './rating'

const LABELS = {
  zoom: 'Ampliar foto de {name}',
  thumb: 'Ver imagem {index} de {total}',
  photo: 'Foto de {name}',
  zoomed: 'Foto ampliada',
  zoomIn: 'Ampliar',
  closeZoom: 'Fechar foto',
  ref: 'Ref.',
  availability: 'Disponibilidade',
  warranty: 'Garantia',
  months_one: '{count} mês',
  months_other: '{count} meses',
  installments: 'ou {text}',
  allInstallments: 'Ver parcelas',
  installmentTotal: 'total de {value}',
  cashback: 'Ganhe {percent}% de cashback',
  lowStock_one: 'Resta {count} unidade',
  lowStock_other: 'Restam {count} unidades',
  pix: 'no Pix',
  saving: 'Economize {value}',
  off: '{percent}% off',
  tiers: 'Leve mais, pague menos',
  units: '{count} unidades',
  each: '{value} cada',
  groups: 'Outras opções',
  customize: 'Personalize o produto',
  customPrice: '+ {value}',
  customChoose: 'Selecione',
  customMax: 'Máximo de {count} caracteres',
  quantity: 'Quantidade',
  unavailable: 'Indisponível',
  choose: 'Selecione: {name}',
  add: 'Adicionar ao carrinho',
}
export type ProductViewLabels = typeof LABELS & RatingLabels

type Props = {
  name: string
  brand?: string
  images: Photo[]
  prices: Prices
  variations: Variation[]
  skus: Sku[]
  tiers: Tier[]
  flags?: Flag[]
  ratings?: Pick<Ratings, 'average_rating' | 'total'> | null
  /** Em meses. */
  warranty?: number
  /** De `checkoutPrices` (lib/prices.ts), não do catálogo. */
  installments?: Installment[]
  cashbacks?: Cashback[]
  /** Com até quantas unidades em estoque o SKU escolhido avisa que está acabando; 0 desliga. */
  lowStock?: number
  groups?: Sibling[]
  sizes?: string
  thumb?: { width: number; height: number }
  labels?: Partial<ProductViewLabels>
  children?: ReactNode
}

function pan(stage: HTMLElement, x: number, y: number) {
  stage.scrollLeft = (x / stage.clientWidth) * (stage.scrollWidth - stage.clientWidth)
  stage.scrollTop = (y / stage.clientHeight) * (stage.scrollHeight - stage.clientHeight)
}

const has = (sku: Sku, values: number[]) => values.every((value) => sku.combinations.split('-').includes(String(value)))

const allowed = (value: string, rule: Customization['allowed_values']) => (rule === 'letters' ? value.replace(/[^\p{L} ]/gu, '') : rule === 'numbers' ? value.replace(/\D/g, '') : value)

// À parte e sob <Suspense>: ler a URL na ProductView impediria o pré-render dela.
function SkuFromUrl({ skus, variations, onPick }: { skus: Sku[]; variations: Variation[]; onPick(values: number[]): void }) {
  const id = Number(useSearchParams().get('sku'))
  const applied = useRef(0)

  useEffect(() => {
    // Uma vez por SKU pedido: ao voltar a esta página, vale o que o visitante escolheu depois.
    if (!id || applied.current === id) return
    applied.current = id

    const values = skus.find((sku) => sku.id === id)?.combinations.split('-')
    if (values) onPick(variations.flatMap((variation) => variation.values.data.find((value) => values.includes(String(value.id)))?.id ?? []))
  }, [id, skus, variations, onPick])

  return null
}

/**
 * Classes: product, gallery, gallery-main, gallery-thumbs, zoom, zoom-stage (com data-in quando
 * ampliada), zoom-photo, zoom-controls, product-info, product-rating, product-facts, product-price, installments,
 * cashback, pix, options, tiers, tiers-title, customizations, stock-low, buy e as de Flags, Rating e Groups. De uso geral: eyebrow, note, saving, tag,
 * icon-button, button, sr-only. Enquanto está na tela, o <html> leva `data-buy-bar`.
 */
export function ProductView({
  name,
  brand,
  images,
  prices,
  variations,
  skus,
  tiers,
  flags,
  ratings,
  warranty = 0,
  installments = [],
  cashbacks,
  lowStock = 5,
  groups = [],
  sizes = '(min-width: 900px) 50vw, 100vw',
  thumb = { width: 64, height: 64 },
  labels,
  children,
}: Props) {
  const t = { ...LABELS, ...labels }
  const cart = useCart()
  const [picked, setPicked] = useState<number[]>([])
  const [active, setActive] = useState(0)
  // O campo de quantidade guarda texto: assim dá para apagar e digitar outro número.
  const [typed, setTyped] = useState('1')
  const quantity = Math.min(99, Math.max(1, Math.trunc(Number(typed)) || 1))
  const [zoom, setZoom] = useState<'off' | 'fit' | 'in'>('off')
  const viewer = useRef<HTMLDialogElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const toChoose = useRef<HTMLFieldSetElement>(null)
  const [custom, setCustom] = useState<Record<number, string>>({})
  const toCustomize = useRef<HTMLFieldSetElement>(null)

  // O Next mantém a página no DOM ao navegar: um <dialog> modal aberto nela bloquearia os cliques da seguinte.
  useLayoutEffect(() => {
    const dialog = viewer.current
    document.documentElement.dataset.buyBar = ''

    return () => {
      dialog?.close()
      delete document.documentElement.dataset.buyBar
    }
  }, [])

  function toggleZoom(x?: number, y?: number) {
    setZoom(zoom === 'in' ? 'fit' : 'in')
    // Só depois de a foto mudar de tamanho dá para posicioná-la.
    requestAnimationFrame(() => {
      const area = stage.current
      if (area) pan(area, x ?? area.clientWidth / 2, y ?? area.clientHeight / 2)
    })
  }

  const sku = picked.length === variations.length ? skus.find((candidate) => has(candidate, picked)) : undefined
  const pending = variations[picked.length]
  const unavailable = skus.every((candidate) => candidate.blocked_sale) || (!pending && (!sku || sku.blocked_sale))
  // Com todos os SKUs no mesmo preço vale o do produto, que o tema lê do checkout (lib/prices.ts).
  const ownPrices = skus.some((candidate) => candidate.prices.data.price !== skus[0].prices.data.price)
  const price = sku && ownPrices ? sku.prices.data : prices
  const photos = sku?.images.data.length ? sku.images.data : images
  const photo = photos[active] ?? photos[0]
  // Antes da escolha, a ficha mostra o primeiro SKU: ela não muda de altura ao escolher a variação.
  const facts = sku ?? skus[0]
  // ponytail: SKU com preço próprio fica sem parcelas: a API de preços do checkout responde pelo produto.
  const samePrice = price.price === prices.price
  const installmentText = samePrice ? prices.installments?.data?.text : undefined
  const cashback = cashbackFor(price.price, cashbacks)
  const stock = sku?.total_in_stock ?? 0
  const customizations = facts?.customizations?.data ?? []
  const optional = !!facts?.allow_sell_without_customization
  const offers = tiers.map((tier) => ({ tier, ...tierOffer(tier, price.price) })).filter((offer) => offer.saving > 0)
  const reached = offers.findLast((offer) => quantity >= offer.tier.quantity)
  const fields = customizations.map((item) => {
    const required = !optional && item.required
    const change = (value: string) => setCustom({ ...custom, [item.id]: value })
    const hint = [item.description, item.type === 'input' && item.max_chars > 0 && fill(t.customMax, { count: item.max_chars })].filter(Boolean).join(' · ')

    return (
      <label key={item.id}>
        <span>
          {item.name}
          {Number(item.price) > 0 && <span className="note"> {fill(t.customPrice, { value: brl(Number(item.price)) })}</span>}
        </span>
        {item.type === 'select' ? (
          <select value={custom[item.id] ?? ''} required={required} onChange={(event) => change(event.target.value)}>
            <option value="">{t.customChoose}</option>
            {item.values.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={custom[item.id] ?? ''}
            required={required}
            maxLength={item.max_chars || undefined}
            inputMode={item.allowed_values === 'numbers' ? 'numeric' : undefined}
            onChange={(event) => change(allowed(event.target.value, item.allowed_values))}
          />
        )}
        {hint && <span className="note">{hint}</span>}
      </label>
    )
  })

  return (
    <div className="product">
      <Suspense fallback={null}>
        <SkuFromUrl skus={skus} variations={variations} onPick={setPicked} />
      </Suspense>

      <div className="gallery">
        <button
          className="gallery-main"
          aria-label={fill(t.zoom, { name })}
          disabled={!photo}
          onClick={() => {
            setZoom('fit')
            viewer.current?.showModal()
          }}
        >
          {photo && <Image key={photo.url} src={photo.url} alt={name} fill sizes={sizes} loading="eager" fetchPriority="high" />}
          {photo && <SearchIcon />}
        </button>
        {photos.length > 1 && (
          <ul className="gallery-thumbs">
            {photos.map((item, index) => (
              <li key={item.url}>
                <button onClick={() => setActive(index)} aria-label={fill(t.thumb, { index: index + 1, total: photos.length })} aria-current={index === active}>
                  <Image src={item.url} alt="" width={thumb.width} height={thumb.height} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* A imagem ampliada só é pedida ao abrir. */}
        <dialog ref={viewer} className="zoom" aria-label={fill(t.photo, { name })} onClose={() => setZoom('off')}>
          {zoom !== 'off' && photo && (
            <div
              ref={stage}
              className="zoom-stage"
              data-in={zoom === 'in' || undefined}
              // Focável para as setas do teclado moverem a foto ampliada.
              tabIndex={0}
              role="group"
              aria-label={t.zoomed}
              onClick={(event) => toggleZoom(event.clientX, event.clientY)}
              onPointerMove={(event) => {
                if (zoom === 'in' && event.pointerType === 'mouse') pan(event.currentTarget, event.clientX, event.clientY)
              }}
            >
              <span className="zoom-photo">
                {/* ponytail: as fotos da Yampi têm até 1000px, então ampliar além de 2× só borra. */}
                <Image src={photo.url} alt={name} fill sizes={zoom === 'in' ? '200vw' : '100vw'} />
              </span>
            </div>
          )}
          <div className="zoom-controls">
            <button className="icon-button" aria-pressed={zoom === 'in'} aria-label={t.zoomIn} onClick={() => toggleZoom()}>
              {zoom === 'in' ? '−' : '+'}
            </button>
            <button className="icon-button" aria-label={t.closeZoom} onClick={() => viewer.current?.close()}>
              <CloseIcon />
            </button>
          </div>
        </dialog>
      </div>

      <div className="product-info">
        <Flags flags={flags} />
        {brand && <p className="eyebrow">{brand}</p>}
        <h1>{name}</h1>
        {ratings?.total ? (
          <a className="product-rating" href={`#${REVIEWS_ID}`}>
            <Rating value={ratings.average_rating} count={ratings.total} labels={labels} />
          </a>
        ) : null}

        {(facts?.sku || facts?.days_availability_formated || warranty > 0) && (
          <dl className="product-facts">
            {facts?.sku && (
              <div>
                <dt>{t.ref}</dt>
                <dd>{facts.sku}</dd>
              </div>
            )}
            {facts?.days_availability_formated && (
              <div>
                <dt>{t.availability}</dt>
                <dd>{facts.days_availability_formated}</dd>
              </div>
            )}
            {warranty > 0 && (
              <div>
                <dt>{t.warranty}</dt>
                <dd>{plural(t.months_one, t.months_other, warranty)}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="product-price">
          <Price prices={price} />
          {installmentText && <p className="note">{fill(t.installments, { text: installmentText })}</p>}
          {samePrice && installments.length > 1 && (
            <details className="installments">
              <summary>{t.allInstallments}</summary>
              <ul>
                {installments.map((row) => (
                  <li key={row.installment}>
                    {row.text}
                    {/* Sem juros o total é o próprio preço. */}
                    {Number(row.amount) > Number(row.base_value) && <span className="note"> {fill(t.installmentTotal, { value: row.amount_formated })}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {price.pix && price.pix.discount_percent > 0 && (
            <p className="pix">
              <PixIcon />
              <span>
                <strong>{brl(price.pix.price)}</strong> {t.pix}
                <span className="note saving">{fill(t.saving, { value: brl(price.price - price.pix.price) })}</span>
              </span>
              <span className="tag">{fill(t.off, { percent: price.pix.discount_percent })}</span>
            </p>
          )}
          {cashback > 0 && <p className="cashback">{fill(t.cashback, { percent: cashback })}</p>}
        </div>

        <Groups products={groups} title={t.groups} />

        {variations.map((variation, index) => (
          <fieldset key={variation.id} ref={index === picked.length ? toChoose : undefined} className="options" disabled={index > picked.length}>
            <legend>{variation.name}</legend>
            {variation.values.data.map((value) => {
              const choice = [...picked.slice(0, index), value.id]
              const available = skus.some((candidate) => !candidate.blocked_sale && has(candidate, choice))

              return (
                <button
                  key={value.id}
                  disabled={!available}
                  aria-pressed={picked[index] === value.id}
                  onClick={() => {
                    // Trocar uma variação limpa as seguintes, que dependem dela.
                    setPicked(choice)
                    setActive(0)
                    cart.warm()
                  }}
                >
                  {value.value}
                </button>
              )
            })}
          </fieldset>
        ))}

        {offers.length > 0 && (
          <div className="tiers">
            <p className="eyebrow tiers-title">{t.tiers}</p>
            <ul>
              {offers.map(({ tier, total, saving }) => (
                <li key={`${tier.quantity}-${tier.mode}-${tier.value}`}>
                  {/* Só a quantidade muda aqui: o desconto é o carrinho que aplica. */}
                  <button aria-pressed={reached?.tier === tier} onClick={() => setTyped(String(tier.quantity))}>
                    <span>
                      <strong>{fill(t.units, { count: tier.quantity })}</strong>
                      <span className="note">{fill(t.each, { value: brl(total / tier.quantity) })}</span>
                    </span>
                    <span className="saving">{fill(t.saving, { value: brl(saving) })}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opcional, fica recolhida, como na vitrine oficial; exigida para a compra, já vem aberta. */}
        {customizations.length > 0 &&
          (optional ? (
            <details className="customizations">
              <summary>{t.customize}</summary>
              {fields}
            </details>
          ) : (
            <fieldset ref={toCustomize} className="customizations">
              <legend>{t.customize}</legend>
              {fields}
            </fieldset>
          ))}

        {stock > 0 && stock <= lowStock && <p className="stock-low">{plural(t.lowStock_one, t.lowStock_other, stock)}</p>}

        <div className="buy" onPointerEnter={cart.warm}>
          <label>
            <span className="sr-only">{t.quantity}</span>
            <input
              type="number"
              min={1}
              max={99}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onBlur={() => setTyped(String(quantity))}
            />
          </label>
          <button
            className="button"
            disabled={cart.busy || unavailable}
            onClick={() => {
              if (sku) {
                // O <fieldset> não valida os campos que contém: quem acusa o que falta é o próprio campo.
                const missing = toCustomize.current?.querySelector<HTMLInputElement | HTMLSelectElement>(':invalid')
                if (missing) {
                  missing.reportValidity()
                  return
                }
                const answers = Object.fromEntries(customizations.map((item) => [item.id, (custom[item.id] ?? '').trim()]))
                const filled = Object.fromEntries(Object.entries(answers).filter(([, value]) => value))
                // Sem nada preenchido num SKU que exige personalização, vão os campos vazios: quem recusa é o checkout, com a mensagem dele.
                const customization = !customizations.length ? undefined : Object.keys(filled).length ? filled : optional ? undefined : answers
                return cart.add([{ skuId: sku.id, quantity, customization }])
              }
              toChoose.current?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
              toChoose.current?.querySelector<HTMLButtonElement>('button:enabled')?.focus({ preventScroll: true })
            }}
          >
            {unavailable ? t.unavailable : pending ? fill(t.choose, { name: pending.name }) : t.add}
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
