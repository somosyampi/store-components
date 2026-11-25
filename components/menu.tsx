'use client'

import type { ReactNode } from 'react'

type Props = {
  /** Id do menu: é o alvo (`popoverTarget`) do botão que o abre no celular. */
  id?: string
  label?: string
  children: ReactNode
}

/** Navegação principal, como popover nativo: o tema decide se é barra (desktop) ou gaveta (celular). Classe: menu. */
export function Menu({ id = 'menu', label = 'Categorias', children }: Props) {
  return (
    <nav
      id={id}
      popover="auto"
      aria-label={label}
      className="menu"
      // O menu mora no layout, que não remonta ao navegar: fecha ao escolher um link.
      onClick={(event) => {
        const menu = event.currentTarget
        if ((event.target as Element).closest('a') && menu.matches(':popover-open')) menu.hidePopover()
      }}
    >
      {children}
    </nav>
  )
}
