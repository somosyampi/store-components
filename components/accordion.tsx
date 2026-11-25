import type { ReactNode } from 'react'

/** Classe: accordion. */
export function Accordion({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="accordion" open={open}>
      <summary>
        <h2>{title}</h2>
      </summary>
      {children}
    </details>
  )
}
