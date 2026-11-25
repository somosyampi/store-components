import { plain } from './format.ts'

type Size = { width: string; height: string }

export type Banner = {
  id: number
  name: string
  link: string | null
  image_url: string
  mobile_image_url: string | null
  /** Em pixels, como texto ("1440.00"). */
  dimensions: { desktop: Size; mobile: Size } | null
}

/** Sem preço: a seção traz o de cadastro de cada SKU, sem as promoções da loja. */
export type Curated = { name: string; slug: string; image: string | null }

export type Block =
  | { type: 'hero'; banner: Banner }
  | { type: 'story'; title: string[]; text: string; banners: Banner[]; flip: boolean; cta: { label: string; link: string } | null }
  | { type: 'feature'; title: string; text: string; banner: Banner | null; flip: boolean; picks: Curated[] }
  | { type: 'shelf'; name: string; slug: string }

/** GET …/catalog/banners */
type RawBanner = Banner & { active: boolean; expired: boolean; type: string }

// As imagens chegam sem protocolo (`//images.yampi.me/...`).
const https = (url: string) => url.replace(/^\/\//, 'https://')

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

type Param = { alias: string; value: unknown; resource: { data: unknown } | null }

/** GET …/store/data, em `page.data` */
export type Section = { section_alias: string; visible: boolean; params: { data: Param[] } }

// ponytail: só as seções `main_banner`, `text_button_2_banners`, `grid_collection` e `collection`; as demais são ignoradas.
export function toBlocks(sections: Section[], banners: Banner[]): Block[] {
  return sections.flatMap((section): Block[] => {
    if (!section.visible) return []

    const param = (alias: string) => section.params.data.find((candidate) => candidate.alias === alias)
    const text = (alias: string) => {
      const value = param(alias)?.value
      return typeof value === 'string' ? value : ''
    }
    const items = <T>(alias: string) => (param(alias)?.resource?.data ?? []) as T[]
    // A seção só traz o id do banner: as dimensões da arte vêm de catalog/banners.
    const pictures = (alias: string) => items<{ id: number }>(alias).flatMap((item) => banners.find((banner) => banner.id === item.id) ?? [])

    switch (section.section_alias) {
      case 'main_banner':
        return pictures('resource')
          .slice(0, 1)
          .map((banner) => ({ type: 'hero', banner }))

      case 'text_button_2_banners':
        return [
          {
            type: 'story',
            // O título vem em parágrafos: cada um é uma linha.
            title: text('title_text').split('</p>').map(plain).filter(Boolean),
            text: text('description_text'),
            banners: pictures('resource').slice(0, Number(text('number_banner')) || 1),
            flip: text('text_position') === 'left',
            cta:
              param('show_cta_text_button_2_banners')?.value && text('text_in_button')
                ? { label: text('text_in_button'), link: text('link_in_button_text_button_2_banners') || '/' }
                : null,
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
            picks: items<{ name: string; slug: string; firstImage?: { data?: { thumb?: { url: string } } } }>('grid_collection_resource_products').map(
              ({ name, slug, firstImage }) => ({ name, slug, image: firstImage?.data?.thumb?.url ?? null }),
            ),
          },
        ]

      case 'collection':
        return items<{ name: string; slug: string }>('resource')
          .slice(0, 1)
          .map(({ name, slug }) => ({ type: 'shelf', name, slug }))

      default:
        return []
    }
  })
}

/** O que o lojista configurou para o topo e o rodapé da loja, nas seções `header` e `footer`. */
export type Chrome = {
  notice: { text: string; link: string | null; background: string | null; color: string | null; onlyHome: boolean } | null
  topbar: { whatsapp: boolean; phone: boolean; tracking: string | null } | null
  footer: { whatsapp: boolean; phone: boolean; email: boolean; social: string[] }
}

const NETWORKS = ['facebook', 'instagram', 'youtube', 'pinterest', 'tiktok', 'twitter']

export function toChrome(sections: Section[]): Chrome {
  const params = (alias: string) => Object.fromEntries(sections.find((section) => section.section_alias === alias)?.params.data.map((param) => [param.alias, param.value]) ?? [])
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
