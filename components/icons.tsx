// Ícones dos componentes: traço simples, na cor do texto. Tamanho e espessura são do tema,
// pela classe `icon` — por exemplo `.icon { width: 22px; height: 22px; stroke-width: 1.3 }`.

const svg = {
  className: 'icon',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  'aria-hidden': true,
} as const

export const SearchIcon = () => (
  <svg {...svg}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
)

export const BagIcon = () => (
  <svg {...svg}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
)

export const CloseIcon = () => (
  <svg {...svg}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

/** A marca do Pix em contorno, numa área de 24×24. */
export const PixIcon = () => (
  <svg {...svg} strokeLinejoin="round">
    <path d="M12 3 21 12l-9 9-9-9zM7.9 7.1l4.1 4.1 4.1-4.1M7.9 16.9l4.1-4.1 4.1 4.1" />
  </svg>
)
