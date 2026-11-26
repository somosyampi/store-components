import { plain } from './format.ts'
import type { RichText } from './rich-text.ts'

type Size = { width: string; height: string }

export type Banner = {
  id: number
  name: string
  link: string | null
  image_url: string
  mobile_image_url: string | null
  /** Em pixels, como texto ("1440.00"); artes antigas vêm com "0.00". */
  dimensions: { desktop: Size; mobile: Size } | null
}

export type Curated = { name: string; slug: string; image: string | null }

type Cta = { label: string; link: string }

type Colors<Key extends string> = Record<Key, string | null>

export type Block =
  | { type: 'hero'; banners: Banner[] }
  | { type: 'story'; title: string[]; text: string | RichText; banners: Banner[]; flip: boolean; cta: Cta | null }
  | { type: 'feature'; title: string; text: string; banner: Banner | null; flip: boolean; slugs: string[] }
  | { type: 'shelf'; name: string; slug: string }
  | { type: 'banners'; banners: Banner[]; mosaic: boolean; flip: boolean }
  | { type: 'categories'; title: string; ids: number[]; names: boolean }
  | { type: 'perks'; items: { icon: string; text: string | RichText }[]; colors: Colors<'icon' | 'text'> }
  | { type: 'callout'; title: string[]; text: string | RichText; cta: Cta | null; align: 'left' | 'center' | 'right'; narrow: boolean; colors: Colors<'background' | 'text' | 'button'> }
  | { type: 'testimonials'; title: string; ids: number[]; visible: number }
  | { type: 'video'; title: string; url: string }

/** GET …/catalog/banners */
type RawBanner = Banner & { active: boolean; expired: boolean; type: string }

// As imagens chegam sem protocolo (`//images.yampi.me/...`).
export const https = (url: string) => url.replace(/^\/\//, 'https://')

export const toBanners = (banners: RawBanner[]): Banner[] =>
  banners
    .filter((banner) => banner.active && !banner.expired && banner.type === 'image' && banner.image_url)
    .map(({ id, name, link, image_url, mobile_image_url, dimensions }) => ({
      id,
      name,
      link,
      image_url: https(image_url),
      mobile_image_url: mobile_image_url && https(mobile_image_url),
      dimensions,
    }))

/** GET …/store/data?only=params&cache=true, em `page.data` */
export type Section = { section_alias: string; visible: boolean; params: Record<string, unknown> }

type Catalog = { banners: Banner[]; collections: { id: number; name: string; slug: string }[] }

const BANNERS: Record<string, number> = { banner_1: 1, banner_2: 2, banner_3: 3 }

const list = (value: unknown): unknown[] => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// O título vem em parágrafos: cada um é uma linha.
const lines = (html: string) => html.split('</p>').map(plain).filter(Boolean)

export function toBlocks(sections: Section[], { banners, collections }: Catalog): Block[] {
  return sections.flatMap((section): Block[] => {
    if (!section.visible) return []

    const { params } = section
    const text = (alias: string) => (typeof params[alias] === 'string' ? (params[alias] as string).trim() : '')
    const resource = (alias: string) => (params[alias] ?? {}) as { ids?: unknown; slugs?: unknown }
    const ids = (alias: string) => list(resource(alias).ids).map(Number).filter(Boolean)
    // A seção só traz o id do banner: a arte e as dimensões vêm de catalog/banners.
    const pictures = (alias: string) => ids(alias).flatMap((id) => banners.find((banner) => banner.id === id) ?? [])
    const color = (alias: string) => text(alias) || null

    switch (section.section_alias) {
      case 'main_banner': {
        const slides = pictures('resource')
        return slides.length ? [{ type: 'hero', banners: slides }] : []
      }

      case 'banner_1':
      case 'banner_2':
      case 'banner_3': {
        const shown = pictures('resource').slice(0, BANNERS[section.section_alias])
        return shown.length ? [{ type: 'banners', banners: shown, mosaic: text('banner_style') === 'mosaic', flip: text('banner_position') === 'right' }] : []
      }

      case 'text_button_2_banners':
        return [
          {
            type: 'story',
            title: lines(text('title_text')),
            text: text('description_text'),
            banners: pictures('resource').slice(0, Number(params.number_banner) || 1),
            flip: text('text_position') === 'left',
            cta: params.show_cta_text_button_2_banners && text('text_in_button') ? { label: text('text_in_button'), link: text('link_in_button_text_button_2_banners') || '/' } : null,
          },
        ]

      case 'grid_collection':
        return [
          {
            type: 'feature',
            title: text('grid_collection_title_text'),
            text: text('grid_collection_subtitle_text'),
            banner: pictures('grid_collection_resource_banner')[0] ?? null,
            flip: text('grid_collection_banner_position') === 'right',
            slugs: list(resource('grid_collection_resource_products').slugs).map(String),
          },
        ]

      case 'collection':
        return ids('resource')
          .slice(0, 1)
          .flatMap((id) => collections.find((collection) => collection.id === id) ?? [])
          .map(({ name, slug }) => ({ type: 'shelf', name, slug }))

      case 'categories_highlight': {
        const chosen = list(params.highlighted_category).map(Number).filter(Boolean)
        return chosen.length ? [{ type: 'categories', title: text('title'), ids: chosen, names: !!params.show_categories_names }] : []
      }

      case 'highlights': {
        const items = (list(params.icons_with_text) as { icon?: string; text?: string; order?: number }[])
          .filter((item) => item.icon && item.text)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((item) => ({ icon: item.icon as string, text: item.text as string }))
        return items.length ? [{ type: 'perks', items, colors: { icon: color('icon_color'), text: color('text_color') } }] : []
      }

      case 'text_button': {
        const align = text('content_alignment')
        return [
          {
            type: 'callout',
            title: lines(text('title_text')),
            text: text('description_text'),
            // Sem texto no botão, a vitrine oficial escreve um padrão; aqui o rótulo fica com o componente.
            cta: params.show_button ? { label: text('text_in_button'), link: text('link_in_button') || '/' } : null,
            align: align === 'left' || align === 'right' ? align : 'center',
            narrow: text('width_section') !== 'complete',
            colors: { background: color('background_color'), text: color('text_color'), button: color('button_color') },
          },
        ]
      }

      case 'top_ratings': {
        const chosen = ids('rating')
        return chosen.length ? [{ type: 'testimonials', title: text('title'), ids: chosen, visible: Number(params.visible_quantity) || 4 }] : []
      }

      case 'video_home':
        return text('link') ? [{ type: 'video', title: text('title'), url: text('link') }] : []

      default:
        return []
    }
  })
}

export const PERK_ICONS = 'https://icons.yampi.me/rocket-icons'

export type IconShape = { viewBox: string; paths: { d: string; evenodd: boolean }[] }

// Os ícones do editor são SVGs sem cor, só de <path>: saem daqui o enquadramento e os traçados, para redesenhá-los sem inserir HTML de fora.
export function iconShape(svg: string): IconShape | null {
  const viewBox = svg.match(/viewBox="([\d\s.-]+)"/)?.[1]
  const paths = [...svg.matchAll(/<path\b([^>]*)>/g)].flatMap(([, attributes]) => {
    const d = attributes.match(/\sd="([^"]+)"/)?.[1]
    return d ? { d, evenodd: attributes.includes('fill-rule="evenodd"') } : []
  })

  return viewBox && paths.length ? { viewBox, paths } : null
}

/** O que o lojista configurou para o topo e o rodapé da loja, nas seções `header` e `footer`. */
export type Chrome = {
  notice: { text: string; link: string | null; background: string | null; color: string | null; onlyHome: boolean } | null
  topbar: { whatsapp: boolean; phone: boolean; tracking: string | null } | null
  footer: { whatsapp: boolean; phone: boolean; email: boolean; social: string[] }
}

const NETWORKS = ['facebook', 'instagram', 'youtube', 'pinterest', 'tiktok', 'twitter']

export function toChrome(sections: Section[]): Chrome {
  const params = (alias: string) => sections.find((section) => section.section_alias === alias)?.params ?? {}
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
  const header = params('header')
  const footer = params('footer')
  const notice = header.highlightbar_enabled ? text(header.highlightbar_text) : null
  const tracking = text(header.topbar_tracking_url)

  return {
    notice: notice
      ? { text: notice, link: text(header.highlightbar_link), background: text(header.highlightbar_background), color: text(header.highlightbar_text_color), onlyHome: !!header.highlightbar_only_home }
      : null,
    topbar:
      header.topbar_enabled && (header.topbar_show_whatsapp || header.topbar_show_phone || tracking)
        ? { whatsapp: !!header.topbar_show_whatsapp, phone: !!header.topbar_show_phone, tracking }
        : null,
    footer: {
      whatsapp: !!(footer.support_enabled && footer.show_whatsapp),
      phone: !!(footer.support_enabled && footer.show_phone),
      email: !!(footer.support_enabled && footer.show_email),
      social: footer.social_enabled ? NETWORKS.filter((network) => footer[`show_${network}`]) : [],
    },
  }
}
