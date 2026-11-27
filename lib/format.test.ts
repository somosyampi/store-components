import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cents, plain, prose, youtubeId } from './format.ts'

test('centavos: o meio centavo sobe, como no checkout', () => {
  assert.deepEqual([cents(2.425), cents(1.005), cents(2.5 * 0.97), cents(544.401), cents(1603.8 * 0.95)], [2.43, 1.01, 2.43, 544.4, 1523.61])
})

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

test('vídeo: o id sai de qualquer endereço do YouTube', () => {
  for (const url of ['https://www.youtube.com/watch?v=Usl7BziqXqM', 'https://www.youtube.com/watch?feature=share&v=Usl7BziqXqM', 'https://youtu.be/Usl7BziqXqM?t=10', 'https://www.youtube.com/shorts/Usl7BziqXqM', 'https://www.youtube.com/embed/Usl7BziqXqM']) {
    assert.equal(youtubeId(url), 'Usl7BziqXqM', url)
  }
  assert.equal(youtubeId('https://vimeo.com/123456'), null)
})
