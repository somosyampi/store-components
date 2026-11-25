import type { CSSProperties } from 'react'
import { day } from '../lib/format'
import { fill, plural } from '../lib/labels'
import type { Ratings, Review } from '../lib/types'
import { Rating, REVIEWS_ID, type RatingLabels } from './rating'

const LABELS = { title: 'Avaliações', stars_one: '{count} estrela', stars_other: '{count} estrelas', photo: 'Foto enviada por {name}' }
export type ReviewsLabels = typeof LABELS & RatingLabels

type Props = { ratings: Ratings; reviews: Review[]; labels?: Partial<ReviewsLabels> }

/**
 * Classes: reviews, reviews-summary, reviews-average, reviews-bars, reviews-bar (com a fração de cada nota em
 * `--share`, de 0 a 1), review, review-photos e as de Rating. De uso geral: byline.
 */
export function Reviews({ ratings, reviews, labels }: Props) {
  if (!ratings.total) return null
  const t = { ...LABELS, ...labels }

  return (
    <section className="reviews" id={REVIEWS_ID}>
      <h2>{t.title}</h2>

      <div className="reviews-summary">
        <strong className="reviews-average">{Number(ratings.average_rating).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
        <Rating value={ratings.average_rating} count={ratings.total} labels={labels} />
        <ul className="reviews-bars">
          {[5, 4, 3, 2, 1].map((stars) => (
            <li key={stars}>
              <span>{plural(t.stars_one, t.stars_other, stars)}</span>
              <span className="reviews-bar" style={{ '--share': (ratings.grouped_rating[stars] ?? 0) / ratings.total } as CSSProperties} />
              <span>{ratings.grouped_rating[stars] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul>
        {reviews.map((review, index) => (
          <li key={index} className="review">
            <p className="byline">
              <strong>{review.name}</strong> <time dateTime={review.created_at.date.slice(0, 10)}>{day(review.created_at.date)}</time>
            </p>
            <Rating value={review.rating} labels={labels} />
            <p>{review.message}</p>
            {review.photos?.data.length ? (
              <ul className="review-photos">
                {review.photos.data.map((photo) => (
                  <li key={photo.url}>
                    {/* <img> simples: as fotos ficam num host que o tema pode não ter liberado para o next/image. */}
                    <img src={photo.url} alt={fill(t.photo, { name: review.name })} loading="lazy" />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
