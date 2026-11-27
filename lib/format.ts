export const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Como o checkout arredonda: em binário 2,425 × 100 dá 242,4999…, e 15 dígitos significativos o levam de volta a 242,5.
export const cents = (value: number) => Math.round(Number((value * 100).toPrecision(15))) / 100

/** '2025-03-11 14:02:11.000000' → '11/03/2025' */
export const day = (date: string) => date.slice(0, 10).split('-').reverse().join('/')

// O endereço vem como o lojista colou: página do vídeo, link curto, shorts ou o de incorporar.
export const youtubeId = (url: string) => url.match(/(?:youtube(?:-nocookie)?\.com\/(?:v\/|embed\/|shorts\/|watch\?(?:.*&)?v=)|youtu\.be\/)([\w-]{6,})/)?.[1] ?? null

// O editor da Yampi grava acentos e sinais como entidades (&ccedil;, &ndash;).
const MARKS: Record<string, string> = { acute: '\u0301', grave: '\u0300', circ: '\u0302', tilde: '\u0303', uml: '\u0308', cedil: '\u0327' }
const NAMED: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', hellip: '…', bull: '•',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', ordm: 'º', ordf: 'ª', deg: '°', sup2: '²',
}

export const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    // ponytail: uma entidade fora da lista segue como veio; para cobrir todas, use um pacote como `he`.
    .replace(/&(?:#(\d{1,7})|#x([\da-f]{1,6})|([a-z])(acute|grave|circ|tilde|uml|cedil)|(\w+));/gi, (entity, decimal, hex, letter, mark, name) => {
      if (letter) return (letter + MARKS[mark.toLowerCase()]).normalize('NFC')
      if (name) return NAMED[name] ?? entity
      const code = decimal ? Number(decimal) : Number.parseInt(hex, 16)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity
    })
    .replace(/\s+/g, ' ')
    .trim()

// Sai só o espaçamento do editor visual: o resto do HTML do lojista segue como veio, como na vitrine oficial.
export const prose = (html: string, level: 2 | 3) => {
  // Aqui dentro, e não no topo do arquivo, para não irem ao navegador junto com `brl`.
  const SPACE = String.raw`(?:\s|&nbsp;)*`
  const BREAKS = String.raw`(?:<br\s*\/?>${SPACE})+`
  const BLOCK = String.raw`<\/?(?:blockquote|div|h[1-6]|hr|li|ol|p|table|tbody|thead|tr|td|th|ul)\b[^>]*>`
  const HOLLOW = new RegExp(String.raw`<(span|strong|em|b|i|u|font|p|div)\b[^>]*>((?:\s|&nbsp;|<br\s*\/?>)*)<\/\1>`, 'gi')

  let clean = html
  // De dentro para fora, até não sobrar tag vazia.
  for (let before = ''; before !== clean; ) {
    before = clean
    clean = clean.replace(HOLLOW, (_, tag: string, inner: string) => (/^(p|div)$/i.test(tag) ? '' : inner))
  }

  return clean
    .replace(new RegExp(`(${BLOCK})${SPACE}${BREAKS}`, 'gi'), '$1') // quebras depois de um bloco
    .replace(new RegExp(`${BREAKS}(?=${BLOCK})`, 'gi'), '') // quebras antes de um bloco
    .replace(new RegExp(`^${SPACE}(?:${BREAKS})?|${BREAKS}$`, 'gi'), '') // quebras nas pontas
    .replace(new RegExp(String.raw`(?:<br\s*\/?>${SPACE}){3,}`, 'gi'), '<br><br>') // três ou mais viram um parágrafo
    .replace(/<(\/?)h[1-6]\b/gi, `<$1h${level}`)
}
