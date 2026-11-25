# store-components

Componentes React sem estilo, e a lógica que eles usam, para lojas construídas sobre as APIs
públicas da Yampi. Os temas (aplicações Next.js, como o `headless-store`) instalam este pacote
direto do GitHub, por tag, e dão a ele o visual e o vocabulário de cada loja.

## Como o pacote é consumido

- O pacote é `@yampi/store-components`, em TypeScript e sem build: o tema o lista em
  `transpilePackages` e o Next o compila junto.
- Não há arquivo de índice. O tema importa por caminho, e todo arquivo novo já é público:
  `@yampi/store-components/<componente>` para `components/*.tsx` e
  `@yampi/store-components/lib/<módulo>` para `lib/*.ts`.
- `next` e `react` são `peerDependencies`. Não adicione dependências de runtime.

## O contrato com os temas

O tema escreve o CSS e escolhe os textos. O pacote entrega marcação, comportamento e
acessibilidade. Por isso:

1. **Nenhum CSS.** Nada de estilo de aparência embutido. Recurso nativo antes de JavaScript:
   `<dialog>`, Popover API, links e formulários.
2. **Classes estáveis.** Cada componente lista no docblock as classes que emite
   (`Classes: …`). Elas são a API de estilo: mantenha a lista em dia.
3. **Textos neutros e trocáveis.** Em português e sem o vocabulário de um segmento
   ("produtos" e "carrinho", nunca "peças" ou "sacola"). Ficam num objeto de textos por
   componente e o tema troca os que quiser pela prop `labels`. São sempre strings, com
   `{chaves}` no lugar dos valores e pares `_one`/`_other` para o plural (`fill` e `plural`,
   em `lib/labels.ts`): um Server Component não passa funções a um Client Component.
4. **Medidas do layout são props.** `sizes` das imagens e tamanho de miniaturas dependem do
   CSS do tema; o pacote só oferece um padrão neutro.
5. **Dados no formato da API da Yampi** (`lib/types.ts`), só com os campos que o componente
   lê. Quem busca o catálogo é o tema. As exceções são as chamadas que o navegador faz por
   conta do próprio componente: carrinho no checkout e sugestões de busca.
6. **Server Components por padrão.** `'use client'` só onde há interação. Ler a URL num
   Client Component (`useSearchParams`) só num componente filho, sob `<Suspense>`, para não
   impedir o pré-render de quem o usa.
7. **Rotas fixas**, definidas em `lib/routes.ts`: `/produto/{slug}`, `/busca`,
   `/categoria/…`, `/colecao/…` e `/promocao/…`.

## Lógica (`lib/`)

- Funções puras e sem dependências, com o teste ao lado (`*.test.ts`, rodado por
  `node --test`).
- As contas de `offers.ts` e a leitura do carrinho em `cart.ts` repetem o checkout da Yampi:
  os valores esperados nos testes são os que o checkout cobrou.
- Os dados estruturados de `schema.ts` seguem a documentação do Google para lojas: página de
  compra usa `Offer`, e variações são um `ProductGroup` com um endereço por variante.

## Código e comentários

- Identificadores em inglês; comentários e textos em português.
- Comente o porquê que não é óbvio (um comportamento da API, do navegador ou do React), não
  o que o nome já diz. Cada componente tem um docblock curto, que termina na linha `Classes:`.
- Atalho deliberado leva `ponytail:`, com o limite dele e o caminho para ampliar.
- O mínimo que resolve: sem abstração para um uso só e sem prop que nenhum tema pediu.
- Antes de usar uma API do Next, leia a documentação da versão instalada, em
  `node_modules/next/dist/docs/`: ela mudou em relação às versões anteriores.

## Antes de publicar

- `npm test` e `npm run typecheck` precisam passar.
- Mudou um componente? Instale a cópia local num tema e confira no navegador as páginas que
  o usam: `npm install --install-links ../store-components`. Se a versão não mudou, apague
  antes `node_modules/@yampi/store-components`, ou o npm mantém a cópia antiga.

## Versões, tags e releases

Os temas instalam uma tag, nunca a `main`. Toda mudança em `components/` ou `lib/` que um
tema possa receber sai como uma versão nova:

1. Ajuste `version` no `package.json` e rode `npm install --package-lock-only`.
2. Faça o commit, marque-o com a tag `vX.Y.Z` e envie a `main` e a tag.
3. Crie a release da tag no GitHub (`gh release create vX.Y.Z`), com as notas nesta ordem:
   **Mudanças incompatíveis** (dizendo o que o tema precisa trocar), **Novidades** e
   **Correções**. Deixe de fora a seção que não tiver item.
4. Em cada tema: `npm install @yampi/store-components@github:somosyampi/store-components#vX.Y.Z`.

Como numerar:

- É **incompatível** remover ou renomear um arquivo de `components/` ou `lib/`, um export,
  uma prop, uma chave de `labels`, uma classe ou um atributo `data-*`; mudar a marcação de
  um jeito que quebre o CSS de um tema; ou mudar uma rota.
- Enquanto a versão for `0.x`, mudança incompatível sobe o número do meio (`0.2.0` →
  `0.3.0`) e todo o resto sobe o último (`0.2.0` → `0.2.1`). A partir da `1.0.0` vale o
  SemVer completo: incompatível, novidade, correção.
- Uma tag publicada não muda de lugar. Para corrigir uma versão, publique outra.
- O que não chega ao pacote instalado (este arquivo, os testes) não pede versão nova.

## Commits

Em português, um assunto por commit. A primeira linha é curta e no presente ("Põe…",
"Enxuga…"); o corpo diz o que mudou e por quê.
