/**
 * Dados estruturados (schema.org) para buscadores. O `<` é escapado para que nenhum texto
 * vindo da loja consiga fechar a tag <script>.
 */
export const JsonLd = ({ data }: { data: object }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c') }} />
)
