'use client'

import Image from 'next/image'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { brl } from '../lib/format'
import { fill } from '../lib/labels'
import { tierOffer, type Tier } from '../lib/offers'
import type { Image as Photo, Prices, Sku, Variation } from '../lib/types'
import { useCart } from './cart'
import { CloseIcon, PixIcon, SearchIcon } from './icons'
import { Price } from './price'

const LABELS = {
  zoom: 'Ampliar foto de {name}',
  thumb: 'Ver imagem {index} de {total}',
  photo: 'Foto de {name}',
  zoomed: 'Foto ampliada',
  zoomIn: 'Ampliar',
  closeZoom: 'Fechar foto',
  installments: 'ou {text}',
  pix: 'no Pix',
  saving: 'Economize {value}',
  off: '{percent}% off',
  tiers: 'Leve mais, pague menos',
  units: '{count} unidades',
  each: '{value} cada',
  quantity: 'Quantidade',
  unavailable: 'Indisponível',
  choose: 'Selecione: {name}',
  add: 'Adicionar ao carrinho',
}
export type ProductViewLabels = typeof LABELS

type Props = {
  name: string
  brand?: string
  images: Photo[]
  prices: Prices
  variations: Variation[]
  skus: Sku[]
  /** Faixas de desconto por quantidade ("leve 2 com 5% off"). */
  tiers: Tier[]
  /** Largura da foto principal em cada largura de tela (atributo `sizes`), conforme o layout do tema. */
  sizes?: string
  /** Tamanho pedido para as miniaturas, na proporção das fotos do tema. */
  thumb?: { width: number; height: number }
  labels?: Partial<ProductViewLabels>
  /** Blocos renderizados no servidor (kits, descrição, detalhes) exibidos abaixo do botão de compra. */
  children?: ReactNode
}

/**
 * Com a foto ampliada, mostra a região dela que corresponde ao ponto (x, y) da tela: é o que
 * faz a foto acompanhar o ponteiro no desktop e abrir no lugar tocado no celular.
 */
function pan(stage: HTMLElement, x: number, y: number) {
  stage.scrollLeft = (x / stage.clientWidth) * (stage.scrollWidth - stage.clientWidth)
  stage.scrollTop = (y / stage.clientHeight) * (stage.scrollHeight - stage.clientHeight)
}

/** O SKU contém todos os valores de variação escolhidos? */
const has = (sku: Sku, values: number[]) => values.every((value) => sku.combinations.split('-').includes(String(value)))

/**
 * A compra de um produto: galeria com zoom, preço (com Pix e parcelas), variações, desconto por
 * quantidade e o botão que leva ao carrinho. Precisa estar dentro de <CartProvider>.
 *
 * Enquanto está na tela, marca o <html> com `data-buy-bar`: se o tema prende o botão de compra
 * ao pé da tela, é por esse atributo que o CSS abre espaço para ele no fim da página.
 *
 * Classes: `product`, `gallery`, `gallery-main`, `gallery-thumbs`, `zoom`, `zoom-stage` (com
 * `data-in` quando ampliada), `zoom-photo`, `zoom-controls`, `product-info`, `product-price`,
 * `pix`, `options`, `tiers`, `tiers-title`, `buy`; e as de uso geral `eyebrow`, `note`,
 * `saving`, `tag`, `icon-button`, `button` e `sr-only`.
 */
export function ProductView({ name, brand, images, prices, variations, skus, tiers, sizes = '(min-width: 900px) 50vw, 100vw', thumb = { width: 64, height: 64 }, labels, children }: Props) {
  const t = { ...LABELS, ...labels }
  const cart = useCart()
  // Valor escolhido em cada variação, na ordem em que a loja as cadastrou (ex.: cor, depois tamanho).
  const [picked, setPicked] = useState<number[]>([])
  const [active, setActive] = useState(0)
  // O que está no campo de quantidade, como texto: assim dá para apagar e digitar outro número.
  const [typed, setTyped] = useState('1')
  const quantity = Math.min(99, Math.max(1, Math.trunc(Number(typed)) || 1))
  // Zoom das fotos: fechado, foto inteira na tela ou ampliada.
  const [zoom, setZoom] = useState<'off' | 'fit' | 'in'>('off')
  const viewer = useRef<HTMLDialogElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const toChoose = useRef<HTMLFieldSetElement>(null)

  // Ao navegar, o Next mantém esta página no DOM, escondida, para voltar a ela com o estado
  // intacto. Duas coisas não podem ficar para trás: o zoom aberto (um <dialog> modal
  // escondido deixa a página seguinte sem responder a cliques) e o aviso de que há um botão
  // de compra na tela, que o CSS do tema pode usar para dar espaço ao rodapé.
  useLayoutEffect(() => {
    const dialog = viewer.current
    document.documentElement.dataset.buyBar = ''

    return () => {
      dialog?.close()
      delete document.documentElement.dataset.buyBar
    }
  }, [])

  /** Amplia ou reduz a foto, mostrando o ponto (x, y) da tela — o centro, sem um ponto dado. */
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
  // Nada à venda (todos os SKUs bloqueados), ou a combinação escolhida não pode ser comprada.
  const unavailable = skus.every((candidate) => candidate.blocked_sale) || (!pending && (!sku || sku.blocked_sale))
  const price = sku?.prices.data ?? prices
  const photos = sku?.images.data.length ? sku.images.data : images
  const photo = photos[active] ?? photos[0]
  // A API só informa o parcelamento no preço do produto, não no de cada SKU: ele vale
  // enquanto o SKU escolhido custar o mesmo.
  // ponytail: SKU com preço próprio fica sem a linha de parcelas; para exibi-la, consulte
  // GET /{alias}/public/catalog/products/{id}/installments?amount={preço}.
  const installments = price.price === prices.price ? prices.installments?.data?.text : undefined
  // As faixas valem sobre o preço em exibição; só entram as que de fato baixam o total.
  const offers = tiers.map((tier) => ({ tier, ...tierOffer(tier, price.price) })).filter((offer) => offer.saving > 0)
  const reached = offers.findLast((offer) => quantity >= offer.tier.quantity)

  return (
    <div className="product">
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

        {/* Zoom: a foto em tela cheia. Tocar (ou clicar) amplia e mostra o ponto tocado; ampliada,
            ela rola com o dedo e acompanha o ponteiro do mouse. A imagem só é pedida ao abrir. */}
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
        {brand && <p className="eyebrow">{brand}</p>}
        <h1>{name}</h1>

        <div className="product-price">
          <Price prices={price} />
          {installments && <p className="note">{fill(t.installments, { text: installments })}</p>}
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
        </div>

        {variations.map((variation, index) => (
          <fieldset key={variation.id} ref={index === picked.length ? toChoose : undefined} className="options" disabled={index > picked.length}>
            <legend>{variation.name}</legend>
            {variation.values.data.map((value) => {
              // Uma opção existe se algum SKU à venda a combina com o que já foi escolhido antes dela.
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
                  {/* Escolher a faixa ajusta a quantidade; o carrinho aplica o desconto. */}
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

        <div className="buy" onPointerEnter={cart.warm}>
          <label>
            <span className="sr-only">{t.quantity}</span>
            <input
              type="number"
              min={1}
              max={99}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              // Ao sair do campo, ele mostra a quantidade que de fato vai para o carrinho (de 1 a 99).
              onBlur={() => setTyped(String(quantity))}
            />
          </label>
          <button
            className="button"
            disabled={cart.busy || unavailable}
            onClick={() => {
              if (sku) return cart.add([{ skuId: sku.id, quantity }])
              // Falta escolher uma variação: leva até ela (com o botão preso ao pé da tela, as
              // opções podem estar fora de vista).
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
