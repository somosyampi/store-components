import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fill, plural } from './labels.ts'

test('textos: as chaves viram valores e o plural segue a quantidade', () => {
  assert.equal(fill('Página {page} de {pages}', { page: 2, pages: 5 }), 'Página 2 de 5')
  assert.equal(fill('Remover filtro {name}', { name: 'Marrom {x}' }), 'Remover filtro Marrom {x}')
  // Uma chave sem valor fica como está, à vista de quem escreveu o texto.
  assert.equal(fill('Olá, {nome}', {}), 'Olá, {nome}')
  assert.equal(fill('{toString}', {}), '{toString}')
  // Um preço leva "$", que não pode ser lido como padrão de substituição.
  assert.equal(fill('Economize {value}', { value: 'R$ 160,38 $& $1' }), 'Economize R$ 160,38 $& $1')

  assert.equal(plural('{count} produto', '{count} produtos', 1), '1 produto')
  assert.equal(plural('{count} produto', '{count} produtos', 0), '0 produtos')
  assert.equal(plural('Abrir {what}, {count} item', 'Abrir {what}, {count} itens', 3, { what: 'sacola' }), 'Abrir sacola, 3 itens')
})
