import Image, { getImageProps } from 'next/image'
import Link from 'next/link'
import type { Banner, Block, Curated } from '../lib/home'
import { toRoute } from '../lib/routes'
import type { Prices } from '../lib/types'
import { Price } from './price'
import { Prose } from './prose'

// Sem as dimensões, assume uma arte 4:5.
const size = (banner: Banner, art: 'desktop' | 'mobile' = 'desktop') => ({
  width: Math.round(Number(banner.dimensions?.[art].width)) || 800,
  height: Math.round(Number(banner.dimensions?.[art].height)) || 1000,
})

/** Classe: hero. */
export function Hero({ banner, storeUrl }: { banner: Banner; storeUrl: string }) {
  // É o maior elemento da home (LCP): carrega com prioridade.
  const common = { alt: banner.name, sizes: '100vw', loading: 'eager', fetchPriority: 'high' } as const
  const desktop = getImageProps({ ...common, src: banner.image_url, ...size(banner) }).props
  const mobile = banner.mobile_image_url && getImageProps({ ...common, src: banner.mobile_image_url, ...size(banner, 'mobile') }).props

  const picture = (
    <picture className="hero">
      {mobile && <source media="(max-width: 699px)" srcSet={mobile.srcSet} sizes="100vw" width={mobile.width} height={mobile.height} />}
      <img {...desktop} />
    </picture>
  )

  return banner.link ? <Link href={toRoute(banner.link, storeUrl)}>{picture}</Link> : picture
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
        <Prose html={block.text} />
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
