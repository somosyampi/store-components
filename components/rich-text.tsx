import { Fragment, createElement } from 'react'
import type { RichText as Value, Run } from '../lib/rich-text'

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, index) => {
    const bold = run.bold ? <strong>{run.text}</strong> : run.text
    const text = run.italic ? <em>{bold}</em> : bold
    return run.link ? (
      <a key={index} href={run.link}>
        {text}
      </a>
    ) : (
      <Fragment key={index}>{text}</Fragment>
    )
  })
}

const spaced = (groups: Run[][]) => groups.flatMap((runs, index) => (index ? [{ text: ' ' }, ...runs] : runs))

/** Classe: prose, fora do modo `inline`. */
export function RichText({ value, inline = false }: { value: Value; inline?: boolean }) {
  if (inline) return <Runs runs={spaced(value.flatMap((block) => (block.type === 'paragraph' ? [block.children] : block.items)))} />

  return (
    <div className="prose">
      {value.map((block, index) =>
        block.type === 'paragraph' ? (
          <p key={index}>
            <Runs runs={block.children} />
          </p>
        ) : (
          createElement(
            block.ordered ? 'ol' : 'ul',
            { key: index },
            block.items.map((runs, item) => (
              <li key={item}>
                <Runs runs={runs} />
              </li>
            )),
          )
        ),
      )}
    </div>
  )
}
