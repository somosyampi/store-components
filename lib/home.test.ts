import assert from 'node:assert/strict'
import { test } from 'node:test'
import { iconShape, toBanners, toBlocks, toChrome, type Section } from './home.ts'

const raw = (id: number, extra = {}) => ({ id, name: `Banner ${id}`, link: null, image_url: `//images.yampi.me/${id}.png`, mobile_image_url: null, dimensions: null, active: true, expired: false, type: 'image', ...extra })
const section = (section_alias: string, params: Record<string, unknown>, visible = true): Section => ({ section_alias, visible, params })
const ids = (...values: number[]) => ({ ids: values, type: 'banner', dimensions: [], first_banner: [] })

test('banners: só os ativos, de imagem e dentro do prazo, com o protocolo no endereço', () => {
  const banners = toBanners([raw(1, { mobile_image_url: '//images.yampi.me/1-m.png' }), raw(2, { active: false }), raw(3, { expired: true }), raw(4, { type: 'video' })])

  assert.deepEqual(banners, [{ id: 1, name: 'Banner 1', link: null, image_url: 'https://images.yampi.me/1.png', mobile_image_url: 'https://images.yampi.me/1-m.png', dimensions: null }])
})

test('seções da home: cada tipo conhecido vira um bloco, na ordem do editor', () => {
  const banners = toBanners([raw(1), raw(2), raw(3)])
  const collections = [{ id: 7, name: 'Bolsas', slug: 'bolsas' }]
  const blocks = toBlocks(
    [
      section('header', {}),
      section('main_banner', { resource: ids(1, 2), slider_delay: 5 }),
      section('text_button_2_banners', {
        title_text: '<p>Feita à mão</p><p>em couro</p>',
        description_text: '<p>Texto.</p>',
        number_banner: '2',
        text_position: 'left',
        resource: ids(2, 3, 1),
        show_cta_text_button_2_banners: true,
        text_in_button: 'Conheça',
        link_in_button_text_button_2_banners: 'https://loja.com.br/sobre',
      }),
      section('grid_collection', {
        grid_collection_title_text: 'Clássicos',
        grid_collection_subtitle_text: 'Os de sempre.',
        grid_collection_resource_banner: ids(99),
        grid_collection_banner_position: 'right',
        grid_collection_resource_products: { slugs: ['maleta', 'carteira'], type: 'grid_collection' },
      }),
      section('collection', { resource: ids(7) }),
      section('collection', { resource: ids(8) }),
      section('collection', { resource: ids(7) }, false),
      section('banner_2', { resource: ids(3, 1, 2) }),
      section('banner_3', { resource: ids(1, 2, 3), banner_style: 'mosaic', banner_position: 'right' }),
      section('banner_1', { resource: ids(99) }),
      section('categories_highlight', { highlighted_category: '[12,34]', title: 'Categorias', show_categories_names: true }),
      section('highlights', { icons_with_text: '[{"icon":"lock.svg","text":"Loja segura","order":1},{"icon":"truck.svg","text":"<strong>Envio</strong> rápido","order":0}]', icon_color: '#705BC2', text_color: '' }),
      section('text_button', { title_text: '<p>Feito para durar</p>', description_text: '<p>Texto.</p>', show_button: true, text_in_button: '', link_in_button: '', content_alignment: 'left', width_section: 'complete', background_color: '#f5f5f5' }),
      section('top_ratings', { rating: ids(5, 6), title: 'Avaliações', visible_quantity: 3 }),
      section('video_home', { title: 'Veja', link: ' https://youtu.be/abc123XYZ ' }),
      section('video_home', { title: 'Sem vídeo', link: null }),
    ],
    { banners, collections },
  )

  assert.deepEqual(blocks, [
    { type: 'hero', banners: [banners[0], banners[1]] },
    { type: 'story', title: ['Feita à mão', 'em couro'], text: '<p>Texto.</p>', banners: [banners[1], banners[2]], flip: true, cta: { label: 'Conheça', link: 'https://loja.com.br/sobre' } },
    { type: 'feature', title: 'Clássicos', text: 'Os de sempre.', banner: null, flip: true, slugs: ['maleta', 'carteira'] },
    { type: 'shelf', name: 'Bolsas', slug: 'bolsas' },
    { type: 'banners', banners: [banners[2], banners[0]], mosaic: false, flip: false },
    { type: 'banners', banners: [banners[0], banners[1], banners[2]], mosaic: true, flip: true },
    { type: 'categories', title: 'Categorias', ids: [12, 34], names: true },
    { type: 'perks', items: [{ icon: 'truck.svg', text: '<strong>Envio</strong> rápido' }, { icon: 'lock.svg', text: 'Loja segura' }], colors: { icon: '#705BC2', text: null } },
    { type: 'callout', title: ['Feito para durar'], text: '<p>Texto.</p>', cta: { label: '', link: '/' }, align: 'left', narrow: false, colors: { background: '#f5f5f5', text: null, button: null } },
    { type: 'testimonials', title: 'Avaliações', ids: [5, 6], visible: 3 },
    { type: 'video', title: 'Veja', url: 'https://youtu.be/abc123XYZ' },
  ])
})

test('ícone de benefício: do SVG saem só o enquadramento e os traçados', () => {
  const svg = '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" onload="alert(1)"><script>alert(1)</script>\n<path fill-rule="evenodd" clip-rule="evenodd" d="M18 9Z"/><path d="M1 1L2 2"/></svg>'

  assert.deepEqual(iconShape(svg), { viewBox: '0 0 36 36', paths: [{ d: 'M18 9Z', evenodd: true }, { d: 'M1 1L2 2', evenodd: false }] })
  assert.equal(iconShape('<html>não é um ícone</html>'), null)
})

test('topo e rodapé: o aviso, os contatos e as redes que o lojista ligou', () => {
  const header = { highlightbar_enabled: true, highlightbar_text: ' Frete grátis acima de R$ 300 ', highlightbar_link: null, highlightbar_background: '#222222', highlightbar_text_color: '#FFFFFF', highlightbar_only_home: false, topbar_enabled: true, topbar_show_whatsapp: true, topbar_show_phone: false, topbar_tracking_url: 'https://rastreio.com.br' }
  const footer = { support_enabled: true, show_whatsapp: true, show_phone: true, show_email: false, social_enabled: true, show_instagram: true, show_facebook: false, show_tiktok: true }

  assert.deepEqual(toChrome([section('header', header), section('footer', footer)]), {
    notice: { text: 'Frete grátis acima de R$ 300', link: null, background: '#222222', color: '#FFFFFF', onlyHome: false },
    topbar: { whatsapp: true, phone: false, tracking: 'https://rastreio.com.br' },
    footer: { whatsapp: true, phone: true, email: false, social: ['instagram', 'tiktok'] },
  })

  const off = toChrome([section('header', { ...header, highlightbar_enabled: false, topbar_enabled: false }), section('footer', { ...footer, support_enabled: false, social_enabled: false })])
  assert.deepEqual(off, { notice: null, topbar: null, footer: { whatsapp: false, phone: false, email: false, social: [] } })
  assert.deepEqual(toChrome([]), off)
})
