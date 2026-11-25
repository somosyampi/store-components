// Os textos dos componentes. Cada componente traz os seus, em português e sem o vocabulário de
// um segmento ("produtos", "carrinho"), e o tema troca os que quiser pela prop `labels`:
//
//   <Listing labels={{ count_one: '{count} peça', count_other: '{count} peças' }} … />
//
// São sempre textos simples, com {chaves} onde entra um valor: um Server Component não
// consegue passar funções para um Client Component.

type Values = Record<string, string | number>

/** fill('Página {page} de {pages}', { page: 2, pages: 5 }) → 'Página 2 de 5' */
export const fill = (text: string, values: Values) =>
  text.replace(/\{(\w+)\}/g, (placeholder, key: string) => (Object.hasOwn(values, key) ? String(values[key]) : placeholder))

/** Singular ou plural, com {count} preenchido: plural('{count} item', '{count} itens', 1) → '1 item' */
export const plural = (one: string, other: string, count: number, values: Values = {}) => fill(count === 1 ? one : other, { ...values, count })
