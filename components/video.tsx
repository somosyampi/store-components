import Image from 'next/image'
import { youtubeId } from '../lib/format'

const LABELS = { play: 'Assistir ao vídeo', title: 'Vídeo' }

type Props = { url: string; title?: string; sizes?: string; labels?: Partial<typeof LABELS> }

/** Classes: video, video-poster. O tema libera `i.ytimg.com` em `images.remotePatterns`. */
export function Video({ url, title, sizes = '(min-width: 900px) 60vw, 100vw', labels }: Props) {
  const id = youtubeId(url)
  if (!id) return null
  const t = { ...LABELS, ...labels }

  return (
    // <details>: o player do YouTube, com os scripts dele, só é pedido quando o visitante abre o vídeo.
    <details className="video">
      <summary aria-label={t.play}>
        <Image className="video-poster" src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" width={480} height={360} sizes={sizes} />
      </summary>
      <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title || t.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
    </details>
  )
}
