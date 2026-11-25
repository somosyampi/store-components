import assert from 'node:assert/strict'
import { test } from 'node:test'
import { plain, prose } from './format.ts'

test('HTML do lojista: saem as quebras e os blocos vazios usados como espaçamento', () => {
  const html =
    '<span style="color: #7e8c8d;"><span><br /></span></span>\n' +
    '<table border="1"><tbody><tr><td>Nota</td></tr></tbody></table>\n<span><br /></span><br />' +
    'Texto <strong>forte</strong>.<br /><br />\n<hr /><br />\n' +
    '<h1>Título<br /><br /></h1>\n<div>Um</div>\n<div>&nbsp;</div>\n<div><br />Dois<br />linha</div><br /><br />' +
    'Três<br /><br /><br /><br />Quatro<br /><br />'

  assert.equal(
    prose(html, 2),
    '<table border="1"><tbody><tr><td>Nota</td></tr></tbody></table>Texto <strong>forte</strong>.<hr />' +
      '<h2>Título</h2>\n<div>Um</div>\n\n<div>Dois<br />linha</div>Três<br><br>Quatro',
  )

  assert.equal(prose('<p>Um parágrafo.</p><h4>Sub</h4><p>Outro, com<br>quebra.</p>', 3), '<p>Um parágrafo.</p><h3>Sub</h3><p>Outro, com<br>quebra.</p>')
})

test('texto puro: saem as tags e as entidades viram letras', () => {
  assert.equal(
    plain('<p>Cole&ccedil;&atilde;o&nbsp;de <b>VER&Atilde;O</b> &amp; inverno &#8211; 50&#37; &ordm; &lt;novo&gt; &#x1F45C; &inexistente; &#99999999;</p>'),
    'Coleção de VERÃO & inverno – 50% º <novo> 👜 &inexistente; &#99999999;',
  )
  assert.equal(plain('Tom &amp;amp; Jerry'), 'Tom &amp; Jerry')
})
