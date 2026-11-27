'use client'

import Image from 'next/image'
import { youtubeId } from '../lib/format'

const LABELS = { play: 'Assistir ao vídeo', title: 'Vídeo' }
export type VideoLabels = typeof LABELS

type Props = { url: string; title?: string; sizes?: string; labels?: Partial<VideoLabels> }

/** Classes: video, video-poster. O tema libera `i.ytimg.com` em `images.remotePatterns`. */
export function Video({ url, title, sizes = '(min-width: 900px) 60vw, 100vw', labels }: Props) {
  const id = youtubeId(url)
  if (!id) return null
  const t = { ...LABELS, ...labels }
  const embed = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`

  return (
    // <details>: o player do YouTube, com os scripts dele, só é pedido quando o visitante abre o vídeo.
    <details
      className="video"
      // Fechado, o <details> só esconde o iframe, e o vídeo seguiria tocando: o iframe fica em branco até abrir de novo.
      onToggle={(event) => {
        const frame = event.currentTarget.querySelector('iframe')
        const src = event.currentTarget.open ? embed : 'about:blank'
        if (frame && frame.src !== src) frame.src = src
      }}
    >
      <summary aria-label={t.play}>
        <Image className="video-poster" src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" width={480} height={360} sizes={sizes} />
      </summary>
      <iframe src={embed} title={title || t.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
    </details>
  )
}
