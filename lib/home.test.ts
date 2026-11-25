import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toBanners, toBlocks, toChrome, type Section } from './home.ts'

const raw = (id: number, extra = {}) => ({ id, name: `Banner ${id}`, link: null, image_url: `//images.yampi.me/${id}.png`, mobile_image_url: null, dimensions: null, active: true, expired: false, type: 'image', ...extra })
const section = (section_alias: string, params: Record<string, unknown>, visible = true): Section => ({
  section_alias,
  visible,
  params: { data: Object.entries(params).map(([alias, value]) => (Array.isArray(value) ? { alias, value: null, resource: { data: value } } : { alias, value, resource: null })) },
})

test('banners: só os ativos, de imagem e dentro do prazo, com o protocolo no endereço', () => {
  const banners = toBanners([raw(1, { mobile_image_url: '//images.yampi.me/1-m.png' }), raw(2, { active: false }), raw(3, { expired: true }), raw(4, { type: 'video' })])

  assert.deepEqual(banners, [{ id: 1, name: 'Banner 1', link: null, image_url: 'https://images.yampi.me/1.png', mobile_image_url: 'https://images.yampi.me/1-m.png', dimensions: null }])
})

test('seções da home: cada tipo conhecido vira um bloco, na ordem do editor', () => {
  const banners = toBanners([raw(1), raw(2), raw(3)])
  const blocks = toBlocks(
    [
      section('header', {}),
      section('main_banner', { resource: [{ id: 1 }, { id: 2 }] }),
      section('text_button_2_banners', {
        title_text: '<p>Feita à mão</p><p>em couro</p>',
        description_text: '<p>Texto.</p>',
        number_banner: '2',
        text_position: 'left',
        resource: [{ id: 2 }, { id: 3 }, { id: 1 }],
        show_cta_text_button_2_banners: true,
        text_in_button: 'Conheça',
        link_in_button_text_button_2_banners: 'https://loja.com.br/sobre',
      }),
      section('grid_collection', {
        grid_collection_title_text: 'Clássicos',
        grid_collection_subtitle_text: 'Os de sempre.',
        grid_collection_resource_banner: [{ id: 99 }],
        grid_collection_banner_position: 'right',
        grid_collection_resource_products: [{ name: 'Maleta', slug: 'maleta', firstImage: { data: { thumb: { url: 'https://img/maleta.png' } } } }, { name: 'Carteira', slug: 'carteira' }],
      }),
      section('collection', { resource: [{ name: 'Bolsas', slug: 'bolsas' }] }),
      section('collection', { resource: [{ name: 'Oculta', slug: 'oculta' }] }, false),
    ],
    banners,
  )

  assert.deepEqual(blocks, [
    { type: 'hero', banner: banners[0] },
    { type: 'story', title: ['Feita à mão', 'em couro'], text: '<p>Texto.</p>', banners: [banners[1], banners[2]], flip: true, cta: { label: 'Conheça', link: 'https://loja.com.br/sobre' } },
    { type: 'feature', title: 'Clássicos', text: 'Os de sempre.', banner: null, flip: true, picks: [{ name: 'Maleta', slug: 'maleta', image: 'https://img/maleta.png' }, { name: 'Carteira', slug: 'carteira', image: null }] },
    { type: 'shelf', name: 'Bolsas', slug: 'bolsas' },
  ])
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
