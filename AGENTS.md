# store-components

Componentes React sem estilo, e a lógica que eles usam, para lojas construídas sobre as APIs
públicas da Yampi. Os temas (aplicações Next.js, como o `headless-store`) instalam este pacote
direto do GitHub, por tag, e dão a ele o visual e o vocabulário de cada loja.

A licença é a MIT ([`LICENSE`](LICENSE)). O repositório ainda não tem README, por decisão: não
crie um sem pedirem.

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

1. **Nenhum CSS.** Nem arquivo de estilo, nem `style` embutido; a exceção é o que é dado da
   loja, como a cor de uma amostra de filtro. Recurso nativo antes de JavaScript:
   `<dialog>`, Popover API, links e formulários.
2. **Classes estáveis.** Cada componente diz no docblock as classes que emite (`Classes: …`,
   ou `Classe: …` quando é uma só). Elas são a API de estilo: mantenha a lista em dia.
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
7. **Rotas fixas.** O pacote gera links para `/produto/{slug}`, `/busca`, `/categoria/…`,
   `/colecao/…` e `/promocao/…`, e o tema precisa ter essas rotas. O esquema de URLs das
   vitrines (filtros, ordenação e página na query string) está em `lib/routes.ts`.

## Lógica (`lib/`)

- Sem dependências. Contas e transformações (`offers`, `prices`, `routes`, `cart`, `format`,
  `labels`, `schema`) são funções puras, com o teste ao lado (`*.test.ts`, rodado por
  `node --test`).
- As contas de `offers.ts` repetem as do checkout da Yampi: os valores esperados nos testes
  são os que o checkout cobrou. `cart.ts` lê a resposta do checkout, e o teste usa o formato
  dela.
- Só dois módulos chamam a rede. `search.ts` usa o serviço de busca da Yampi: a rota
  `/products` com termo registra o termo entre os "mais buscados" da loja, em produção. Por
  isso as sugestões usam `/products/suggestions`, e um teste só busca termos que a loja já
  tem (na loja modelo, "bolsa"). `prices.ts` usa a API de preços do checkout, a fonte do
  preço e das parcelas de um produto: a parcela que a API principal devolve no detalhe do
  produto não considera as promoções da loja.
- Os dados estruturados de `schema.ts` seguem a documentação do Google para lojas: página de
  compra usa `Offer`, e variações são um `ProductGroup` com um endereço por variante.

## Código

- Identificadores em inglês; comentários e textos em português.
- O mínimo que resolve: sem abstração para um uso só e sem prop que nenhum tema pediu.
- Antes de usar uma API do Next, leia a documentação da versão instalada, em
  `node_modules/next/dist/docs/`: ela mudou em relação às versões anteriores.

## Comentários

O padrão é não comentar. Nome, tipo e código dizem o que é feito; um comentário só entra para
dizer o que eles não conseguem, e são três os casos:

1. **O porquê de algo que parece estranho ou errado a quem lê:** um comportamento da API da
   Yampi, do navegador, do React ou do Next, ou uma decisão que alguém desfaria sem saber o
   motivo (`// mousedown (e não click) para agir antes de o campo perder o foco.`).
2. **`ponytail:`** num atalho deliberado, com o limite dele e o caminho para ampliar.
3. **A linha `Classes:`** de cada componente exportado, com as variáveis CSS e os atributos
   `data-*` que ele emite. É o docblock inteiro do componente.

Cada comentário cabe em uma linha; só a lista de classes pode ocupar mais. Não escreva:

- docblock que descreve o componente, a função ou o tipo, ou que repete o nome e a assinatura;
- descrição de prop, campo, parâmetro ou retorno. A exceção é o que o tipo não mostra e muda
  o uso: uma unidade (`/** Em meses. */`) ou um formato que a API devolve;
- cabeçalho de arquivo contando o que o módulo faz;
- comentário que narra o código (`// busca os produtos`) ou a história de uma mudança;
- comentário em teste dizendo o que ele verifica: isso é o nome do teste;
- explicação longa. Ela vai para a mensagem de commit e a descrição do pull request; o que
  vale para o repositório inteiro, para este arquivo.

Na dúvida, não comente. Antes de abrir um pull request, releia cada comentário do diff com
esse filtro; ao mexer num arquivo, apague os comentários dele que não passam.

## Antes de publicar

- `npm test` e `npm run typecheck` precisam passar.
- Mudou um componente? Instale a cópia local num tema e confira no navegador as páginas que
  o usam: `npm install --install-links ../store-components`. Se a versão não mudou, apague
  antes `node_modules/@yampi/store-components`, ou o npm mantém a cópia antiga.
- Esse comando deixa o `package.json` do tema apontando para `file:../store-components`. Não
  faça commit dele assim: o tema só entra no repositório apontando para uma tag.

## Versões, tags e releases

Os temas instalam uma tag, nunca a `main`. Toda mudança que um tema possa receber (em
`components/`, em `lib/` ou na licença) sai como uma versão nova, com tag e release, e não
fica na `main` sem elas:

1. `npm version X.Y.Z --no-git-tag-version` ajusta `package.json` e `package-lock.json`.
2. Faça o commit, marque-o com a tag `vX.Y.Z` e envie a `main` e a tag.
3. Crie a release da tag no GitHub (`gh release create vX.Y.Z`). As notas têm estas seções,
   nesta ordem e sem as que ficarem vazias: **Mudanças incompatíveis** (dizendo o que o tema
   precisa trocar), **Novidades**, **Correções**, **Sem mudança de comportamento** e, sempre,
   **Como atualizar um tema**, com o comando do passo 4.
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
