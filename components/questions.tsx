import { day } from '../lib/format'
import type { Question } from '../lib/types'

const LABELS = { title: 'Dúvidas' }
export type QuestionsLabels = typeof LABELS

type Props = { questions: Question[]; labels?: Partial<QuestionsLabels> }

const When = ({ date }: { date: string }) => <time dateTime={date.slice(0, 10)}>{day(date)}</time>

/** Classes: questions, question, answer. */
export function Questions({ questions, labels }: Props) {
  if (!questions.length) return null
  const t = { ...LABELS, ...labels }

  return (
    <section className="questions">
      <h2>{t.title}</h2>
      <ul>
        {questions.map((question, index) => (
          <li key={index} className="question">
            <p>
              <strong>{question.name}</strong> <When date={question.created_at.date} />
            </p>
            {/* `message`, e não `message_with_links`: na dúvida, aquele é HTML montado a partir do texto do visitante. */}
            <p>{question.message}</p>
            {question.answer && (
              <div className="answer">
                <p>
                  <strong>{question.answer.name}</strong> <When date={question.answer.created_at.date} />
                </p>
                {question.answer.message_with_links ? <p dangerouslySetInnerHTML={{ __html: question.answer.message_with_links }} /> : <p>{question.answer.message}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
