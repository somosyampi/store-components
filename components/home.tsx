import Image, { getImageProps } from 'next/image'
import Link from 'next/link'
import { useId, type CSSProperties } from 'react'
import type { Banner, Block, Curated, IconShape } from '../lib/home'
import { fill } from '../lib/labels'
import { toRoute } from '../lib/routes'
import type { Prices, Review } from '../lib/types'
import { Price } from './price'
import { Prose } from './prose'
import { Rating, type RatingLabels } from './rating'
import { RichText } from './rich-text'

// Arte sem dimensões no cadastro: vale esta proporção até a imagem carregar.
const PORTRAIT = { width: 800, height: 1000 }
const WIDE = { width: 1440, height: 560 }

const size = (banner: Banner, art: 'desktop' | 'mobile' = 'desktop', fallback = PORTRAIT) => ({
  width: Math.round(Number(banner.dimensions?.[art].width)) || fallback.width,
  height: Math.round(Number(banner.dimensions?.[art].height)) || fallback.height,
})

type ArtProps = { banner: Banner; storeUrl: string; sizes: string; priority?: boolean; className?: string }

function Art({ banner, storeUrl, sizes, priority = false, className }: ArtProps) {
  const common = { alt: banner.name, sizes, loading: priority ? 'eager' : 'lazy', fetchPriority: priority ? 'high' : undefined } as const
  const desktop = getImageProps({ ...common, src: banner.image_url, ...size(banner, 'desktop', WIDE) }).props
  const mobile = banner.mobile_image_url && getImageProps({ ...common, src: banner.mobile_image_url, ...size(banner, 'mobile') }).props

  const picture = (
    <picture className={className}>
      {/* Com `images.unoptimized`, o Next não gera `srcSet`: sem ele o navegador ignoraria a arte do celular. */}
      {mobile && <source media="(max-width: 699px)" srcSet={mobile.srcSet ?? mobile.src} sizes={sizes} width={mobile.width} height={mobile.height} />}
      <img {...desktop} />
    </picture>
  )

  return banner.link ? <Link href={toRoute(banner.link, storeUrl)}>{picture}</Link> : picture
}

const HERO_LABELS = { region: 'Destaques', slide: 'Ir para o banner {index} de {total}' }

type HeroProps = { banners: Banner[]; storeUrl: string; labels?: Partial<typeof HERO_LABELS> }

/** Classes: hero e, com mais de um banner, hero-carousel (com o total em `--slides`), hero-slides e hero-nav. */
export function Hero({ banners, storeUrl, labels }: HeroProps) {
  const id = useId()
  // O primeiro é o maior elemento da home (LCP): só ele carrega com prioridade.
  const slides = banners.map((banner, index) => <Art key={banner.id} banner={banner} storeUrl={storeUrl} sizes="100vw" priority={index === 0} className="hero" />)
  if (slides.length < 2) return slides[0] ?? null
  const t = { ...HERO_LABELS, ...labels }

  return (
    // ponytail: sem troca automática (o `slider_delay` do editor), que pede JavaScript; cada marcador é um link para a arte dele.
    <div className="hero-carousel" style={{ '--slides': banners.length } as CSSProperties}>
      <div className="hero-slides" role="region" aria-label={t.region} tabIndex={0}>
        {banners.map((banner, index) => (
          <div key={banner.id} id={`${id}-${index}`}>
            {slides[index]}
          </div>
        ))}
      </div>
      <nav className="hero-nav" aria-label={t.region}>
        {banners.map((banner, index) => (
          <a key={banner.id} href={`#${id}-${index}`} aria-label={fill(t.slide, { index: index + 1, total: banners.length })} />
        ))}
      </nav>
    </div>
  )
}

type BannersProps = { block: Extract<Block, { type: 'banners' }>; storeUrl: string; sizes?: string }

/** Classes: banners, com data-count, data-mosaic e data-flip. */
export function Banners({ block, storeUrl, sizes = '(min-width: 700px) 50vw, 100vw' }: BannersProps) {
  return (
    <section className="banners" data-count={block.banners.length} data-mosaic={block.mosaic || undefined} data-flip={block.flip || undefined}>
      {block.banners.map((banner) => (
        <Art key={banner.id} banner={banner} storeUrl={storeUrl} sizes={sizes} />
      ))}
    </section>
  )
}

// Foto ilustrativa: sem texto alternativo.
function Photo({ banner, sizes }: { banner: Banner; sizes: string }) {
  return (
    <span className="frame">
      <Image src={banner.image_url} alt="" {...size(banner)} sizes={sizes} />
    </span>
  )
}

type StoryProps = { block: Extract<Block, { type: 'story' }>; storeUrl: string; sizes?: { one: string; pair: string } }

/** Classes: story, story-flip, story-media, story-pair, frame, story-text e a de Prose. De uso geral: button, button-ghost. */
export function Story({ block, storeUrl, sizes = { one: '(min-width: 900px) 50vw, 100vw', pair: '(min-width: 900px) 25vw, 45vw' } }: StoryProps) {
  const pair = block.banners.length > 1

  return (
    <section className={block.flip ? 'story story-flip' : 'story'}>
      <div className={pair ? 'story-media story-pair' : 'story-media'}>
        {block.banners.map((banner) => (
          <Photo key={banner.id} banner={banner} sizes={pair ? sizes.pair : sizes.one} />
        ))}
      </div>
      <div className="story-text">
        <h2>
          {block.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        {typeof block.text === 'string' ? <Prose html={block.text} /> : <RichText value={block.text} />}
        {block.cta && (
          <Link href={toRoute(block.cta.link, storeUrl)} className="button button-ghost">
            {block.cta.label}
          </Link>
        )}
      </div>
    </section>
  )
}

type FeatureProps = {
  block: Extract<Block, { type: 'feature' }>
  /** Só os produtos que o tema encontrou no catálogo, com o preço final de cada um. */
  picks: (Curated & { prices: Prices })[]
  eyebrow?: string
  sizes?: { banner: string; pick: string }
}

/** Classes: feature, feature-flip, feature-media, frame, feature-text, picks, pick-media, pick-name e a de Price. De uso geral: eyebrow. */
export function Feature({ block, picks, eyebrow = 'Em destaque', sizes = { banner: '(min-width: 900px) 42vw, 100vw', pick: '72px' } }: FeatureProps) {
  return (
    <section className={block.flip ? 'feature feature-flip' : 'feature'}>
      {block.banner && (
        <div className="feature-media">
          <Photo banner={block.banner} sizes={sizes.banner} />
        </div>
      )}
      <div className="feature-text">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{block.title}</h2>
        <p>{block.text}</p>
        <ul className="picks">
          {picks.map((pick) => (
            <li key={pick.slug}>
              <Link href={`/produto/${pick.slug}`}>
                <span className="pick-media">{pick.image && <Image src={pick.image} alt="" fill sizes={sizes.pick} />}</span>
                <span className="pick-name">{pick.name}</span>
              </Link>
              <Price prices={pick.prices} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export type CategoryTile = { id: number; name: string; href: string; cover: string | null }

type CategoriesProps = { title?: string; categories: CategoryTile[]; names?: boolean; sizes?: string }

/** Classes: categories, category-cover, category-name. De uso geral: sr-only. */
export function Categories({ title, categories, names = true, sizes = '(min-width: 900px) 16vw, 40vw' }: CategoriesProps) {
  if (!categories.length) return null

  return (
    <section className="categories">
      {title && <h2>{title}</h2>}
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            <Link href={category.href}>
              <span className="category-cover">{category.cover && <Image src={category.cover} alt="" fill sizes={sizes} />}</span>
              {/* Sem capa, o nome é tudo o que identifica a categoria. */}
              <span className={names || !category.cover ? 'category-name' : 'sr-only'}>{category.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

type PerksProps = {
  block: Extract<Block, { type: 'perks' }>
  /** O desenho de cada ícone, pelo nome do arquivo: o tema o lê de `PERK_ICONS` com `iconShape` (lib/home.ts). */
  icons?: Record<string, IconShape | null>
}

/** Classes: perks, com as cores do editor em `--perk-icon` e `--perk-text`, e perk-icon. */
export function Perks({ block, icons = {} }: PerksProps) {
  return (
    <ul className="perks" style={{ '--perk-icon': block.colors.icon ?? undefined, '--perk-text': block.colors.text ?? undefined } as CSSProperties}>
      {block.items.map((item, index) => {
        const shape = icons[item.icon]

        return (
          <li key={index}>
            {shape && (
              <svg className="perk-icon" viewBox={shape.viewBox} fill="currentColor" aria-hidden="true">
                {shape.paths.map(({ d, evenodd }) => (
                  <path key={d} d={d} fillRule={evenodd ? 'evenodd' : undefined} clipRule={evenodd ? 'evenodd' : undefined} />
                ))}
              </svg>
            )}
            {typeof item.text === 'string' ? (
              <span dangerouslySetInnerHTML={{ __html: item.text }} />
            ) : (
              <span>
                <RichText value={item.text} inline />
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

type CalloutProps = { block: Extract<Block, { type: 'callout' }>; storeUrl: string; label?: string }

/**
 * Classes: callout, com data-align, data-narrow e as cores do editor em `--callout-background`, `--callout-text` e
 * `--callout-button`, e a de Prose. De uso geral: button, button-ghost.
 */
export function Callout({ block, storeUrl, label = 'Clique para conferir' }: CalloutProps) {
  const { background, text, button } = block.colors
  const colors = { '--callout-background': background ?? undefined, '--callout-text': text ?? undefined, '--callout-button': button ?? undefined } as CSSProperties

  return (
    <section className="callout" data-align={block.align} data-narrow={block.narrow || undefined} style={colors}>
      {block.title.length > 0 && (
        <h2>
          {block.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
      )}
      {typeof block.text === 'string' ? <Prose html={block.text} /> : <RichText value={block.text} />}
      {block.cta && (
        <Link href={toRoute(block.cta.link, storeUrl)} className="button button-ghost">
          {block.cta.label || label}
        </Link>
      )}
    </section>
  )
}

export type Testimonial = Pick<Review, 'rating' | 'name' | 'message'> & { product?: { name: string; slug: string } | null }

type TestimonialsProps = { title?: string; reviews: Testimonial[]; visible?: number; labels?: Partial<RatingLabels> }

/** Classes: testimonials, com quantas o lojista quer por vez em `--visible`, testimonial e as de Rating. De uso geral: byline. */
export function Testimonials({ title, reviews, visible = 4, labels }: TestimonialsProps) {
  if (!reviews.length) return null

  return (
    <section className="testimonials" style={{ '--visible': visible } as CSSProperties}>
      {title && <h2>{title}</h2>}
      <ul>
        {reviews.map((review, index) => (
          <li key={index} className="testimonial">
            <Rating value={review.rating} labels={labels} />
            <blockquote>{review.message}</blockquote>
            <p className="byline">
              <strong>{review.name}</strong> {review.product && <Link href={`/produto/${review.product.slug}`}>{review.product.name}</Link>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
