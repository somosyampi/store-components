import { prose } from '../lib/format'

/** Classe: prose. */
export const Prose = ({ html, level = 3 }: { html: string; level?: 2 | 3 }) => <div className="prose" dangerouslySetInnerHTML={{ __html: prose(html, level) }} />
