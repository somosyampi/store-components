'use client'

import Form from 'next/form'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useId, useState, type KeyboardEvent } from 'react'
import { suggest } from '../lib/search'
import { SearchIcon } from './icons'

const LABELS = {
  placeholder: 'Buscar',
  input: 'Buscar produtos',
  submit: 'Buscar',
  suggestions: 'Sugestões de busca',
  top: 'Mais buscados',
}
export type SearchLabels = typeof LABELS

type Props = {
  endpoint: string
  storeId: number
  complete?: boolean
  popular?: boolean
  labels?: Partial<SearchLabels>
}

// À parte e sob <Suspense>: ler a URL no próprio campo impediria o pré-render do cabeçalho.
function TermFromRoute({ onChange }: { onChange(term: string): void }) {
  const pathname = usePathname()
  const q = useSearchParams().get('q') ?? ''
  const term = pathname === '/busca' ? q : ''

  // A rota entra nas dependências para limpar também um texto digitado e não buscado.
  useEffect(() => onChange(term), [onChange, term, pathname])

  return null
}

/** Classes: search, suggestions. De uso geral: icon-button, eyebrow. */
export function SearchBox({ endpoint, storeId, complete = true, popular = true, labels }: Props) {
  const t = { ...LABELS, ...labels }
  const router = useRouter()
  const list = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [top, setTop] = useState<string[] | null>(null)
  const [completions, setCompletions] = useState<string[]>([])
  const term = q.trim()
  const typing = term.length > 1
  const terms = !open ? [] : typing ? (complete ? completions : []) : popular ? (top ?? []) : []

  useEffect(() => {
    if (!complete || !typing || !open) return

    const request = new AbortController()
    const timer = setTimeout(() => {
      suggest({ endpoint, storeId, signal: request.signal }, term)
        .then((found) => {
          setCompletions(found)
          setActive(-1)
        })
        // Sugestão é um extra: se falhar, a busca pelo formulário segue funcionando.
        .catch(() => {})
    }, 300)

    return () => {
      clearTimeout(timer)
      request.abort()
    }
  }, [complete, term, typing, open, endpoint, storeId])

  function onFocus() {
    setOpen(true)
    if (popular && top === null) {
      setTop([])
      suggest({ endpoint, storeId }).then(setTop, () => {})
    }
  }

  function go(suggestion: string) {
    setQ(suggestion)
    setOpen(false)
    router.push(`/busca?q=${encodeURIComponent(suggestion)}`)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      // Sem o preventDefault, o navegador apagaria o campo de uma vez e a lista reabriria.
      event.preventDefault()
      if (!terms.length) setQ('')
      setOpen(false)
      return
    }
    if (!terms.length) {
      if (event.key === 'ArrowDown') onFocus()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(active < terms.length - 1 ? active + 1 : 0)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(active > 0 ? active - 1 : terms.length - 1)
    }
    if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      go(terms[active])
    }
  }

  return (
    <Form action="/busca" className="search" role="search" onSubmit={() => setOpen(false)}>
      <Suspense fallback={null}>
        <TermFromRoute onChange={setQ} />
      </Suspense>
      <input
        type="search"
        name="q"
        value={q}
        onChange={(event) => {
          setQ(event.target.value)
          setOpen(true)
          setActive(-1)
          // Sugestões de um texto que já foi apagado não voltam quando se recomeça a digitar.
          if (event.target.value.trim().length <= 1) setCompletions([])
        }}
        onFocus={onFocus}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={t.placeholder}
        aria-label={t.input}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={terms.length > 0}
        aria-controls={terms.length > 0 ? list : undefined}
        aria-activedescendant={active >= 0 ? `${list}-${active}` : undefined}
        autoComplete="off"
        required
        minLength={2}
        maxLength={80}
      />
      <button className="icon-button" aria-label={t.submit}>
        <SearchIcon />
      </button>

      {terms.length > 0 && (
        <ul id={list} role="listbox" aria-label={typing ? t.suggestions : t.top} className="suggestions">
          {!typing && (
            // O nome da lista já diz o que ela é a quem usa leitor de tela.
            <li aria-hidden="true" className="eyebrow">
              {t.top}
            </li>
          )}
          {terms.map((suggestion, index) => {
            const completes = typing && suggestion.toLowerCase().startsWith(term.toLowerCase())

            return (
              <li
                key={suggestion}
                id={`${list}-${index}`}
                role="option"
                aria-selected={index === active}
                // mousedown (e não click) para agir antes de o campo perder o foco.
                onMouseDown={(event) => {
                  event.preventDefault()
                  if (event.button === 0) go(suggestion)
                }}
                onMouseEnter={() => setActive(index)}
              >
                {completes ? (
                  <>
                    {suggestion.slice(0, term.length)}
                    <b>{suggestion.slice(term.length)}</b>
                  </>
                ) : (
                  suggestion
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Form>
  )
}
