import Image from 'next/image'
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import type { Category } from '../lib/types'
import { CartButton } from './cart'
import { CloseIcon, MenuIcon } from './icons'
import { Menu } from './menu'
import { SearchBox } from './search'

const LABELS = { openMenu: 'Abrir menu', closeMenu: 'Fechar menu' }
export type HeaderLabels = typeof LABELS

type Props = {
  name: string
  logo?: string | null
  logoSizes?: string
  categories: Category[]
  promotions?: { name: string; slug: string }[]
  search: ComponentProps<typeof SearchBox>
  cart?: ComponentProps<typeof CartButton>
  labels?: Partial<HeaderLabels>
  children?: ReactNode
}

/** Classes: header, bar, menu-open, logo, menu-close, menu-sale e as de SearchBox, CartButton e Menu. De uso geral: icon-button. */
export function Header({ name, logo, logoSizes = '180px', categories, promotions = [], search, cart, labels, children }: Props) {
  const t = { ...LABELS, ...labels }

  return (
    <header className="header">
      {children}

      <div className="bar">
        <button className="icon-button menu-open" popoverTarget="menu" aria-label={t.openMenu}>
          <MenuIcon />
        </button>

        <Link href="/" className="logo">
          {logo ? <Image src={logo} alt={name} fill sizes={logoSizes} loading="eager" /> : name}
        </Link>

        <SearchBox {...search} />

        <CartButton {...cart} />
      </div>

      <Menu>
        <button className="icon-button menu-close" popoverTarget="menu" popoverTargetAction="hide" aria-label={t.closeMenu}>
          <CloseIcon />
        </button>
        <ul>
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/categoria/${category.slug}`}>{category.name}</Link>
              {category.children?.data.length ? (
                <ul>
                  {category.children.data.map((child) => (
                    <li key={child.id}>
                      <Link href={`/categoria/${category.slug}/${child.slug}`}>{child.name}</Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
          {promotions.map((promotion) => (
            <li key={promotion.slug}>
              <Link href={`/promocao/${promotion.slug}`} className="menu-sale">
                {promotion.name}
              </Link>
            </li>
          ))}
        </ul>
      </Menu>
    </header>
  )
}
