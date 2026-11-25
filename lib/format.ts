export const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// O editor da Yampi grava acentos e sinais como entidades (&ccedil;, &atilde;, &ndash;). As
// letras acentuadas seguem um padrão — letra + marca — e as demais ficam numa lista curta.
const MARKS: Record<string, string> = { acute: '\u0301', grave: '\u0300', circ: '\u0302', tilde: '\u0303', uml: '\u0308', cedil: '\u0327' }
const NAMED: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', hellip: '…', bull: '•',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', ordm: 'º', ordf: 'ª', deg: '°', sup2: '²',
}

/** Texto puro a partir de um HTML curto (títulos de seção e descrições de SEO chegam com tags e entidades). */
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

/**
 * Prepara o HTML cadastrado pelo lojista (descrição, páginas) para a página. Ele vem de um
 * editor visual, que espaça o texto com quebras de linha e blocos vazios: isso sai, e o
 * ritmo vertical fica por conta do CSS (`.prose`). Os títulos são rebaixados para `level`,
 * mantendo a hierarquia de headings válida. Fora isso o HTML é exibido como está, com a
 * mesma confiança que a vitrine oficial dá a ele.
 */
export const prose = (html: string, level: 2 | 3) => {
  // As expressões ficam aqui dentro, e não no topo do arquivo, para não irem junto com `brl`
  // para o JavaScript do navegador (só o servidor chama esta função).
  const SPACE = String.raw`(?:\s|&nbsp;)*`
  const BREAKS = String.raw`(?:<br\s*\/?>${SPACE})+`
  const BLOCK = String.raw`<\/?(?:blockquote|div|h[1-6]|hr|li|ol|p|table|tbody|thead|tr|td|th|ul)\b[^>]*>`
  /** Tag que só embrulha espaços e quebras de linha. */
  const HOLLOW = new RegExp(String.raw`<(span|strong|em|b|i|u|font|p|div)\b[^>]*>((?:\s|&nbsp;|<br\s*\/?>)*)<\/\1>`, 'gi')

  let clean = html
  // De dentro para fora: um <span> vazio some e deixa a quebra; parágrafos e divs vazios
  // (os "espaçadores") somem inteiros.
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
