import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Eye, Ghost, Play, Type, WandSparkles } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import HandBadge from '@/components/HandBadge'
import { useData } from '@/contexts/DataContext'
import { formatTime } from '@/lib/scoring'
import type { AssistanceOptions, TimeRecord } from '@/types'

export default function DeckBestTimesPage() {
  const { deckId } = useParams()
  const { state, getBestTimes } = useData()
  const deck = state.decks.find((d) => d.id === deckId)
  const cards = useMemo(() => state.cards.filter((c) => c.deckId === deckId), [state.cards, deckId])

  if (!deck) return <PageHeader back="/" backLabel="Decks" title="Deck not found" />

  const deckTimes = getBestTimes('deck', deck.id)
  const cardRows = cards.map((c) => ({ card: c, times: getBestTimes('card', c.id) }))
  const played = cardRows.filter((r) => r.times.length > 0)
  const unplayed = cardRows.length - played.length

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back={`/decks/${deck.id}`} backLabel={deck.name} title="Best times" subtitle="Your top runs, fastest first." />

      <section className="playing-card mb-5 p-5 sm:p-6" data-suit="♠">
        <h2 className="mb-3 text-lg font-semibold">Whole deck</h2>
        {deckTimes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No full-deck runs yet.{' '}
            {cards.length > 0 && (
              <Link to={`/study/deck/${deck.id}/setup`} className="font-semibold text-primary underline-offset-4 hover:underline">
                Play the deck
              </Link>
            )}
          </p>
        ) : (
          <RecordList records={deckTimes} />
        )}
      </section>

      <section className="playing-card p-5 sm:p-6" data-suit="♥">
        <h2 className="mb-3 text-lg font-semibold">Cards</h2>
        {played.length === 0 ? (
          <p className="text-sm text-muted-foreground">No card runs yet.</p>
        ) : (
          <ul className="divide-y">
            {played.map(({ card, times }) => (
              <li key={card.id} className="py-3 first:pt-0 last:pb-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{card.title || 'Untitled'}</span>
                  <Link to={`/study/card/${card.id}/setup`} className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground" aria-label={`Play ${card.title}`}>
                    <Play className="size-3.5 translate-x-px fill-current" />
                  </Link>
                </div>
                <RecordList records={times.slice(0, 3)} compact />
              </li>
            ))}
          </ul>
        )}
        {unplayed > 0 && played.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {unplayed} card{unplayed === 1 ? '' : 's'} not played yet.
          </p>
        )}
      </section>
    </div>
  )
}

function RecordList({ records, compact }: { records: TimeRecord[]; compact?: boolean }) {
  return (
    <ol className={compact ? 'space-y-1' : 'space-y-2'}>
      {records.map((r, i) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="w-5 text-muted-foreground tabular-nums">{i + 1}.</span>
          <span className="font-mono font-semibold tabular-nums">{formatTime(r.elapsedMs)}</span>
          {r.wpm != null && <span className="text-muted-foreground tabular-nums">{r.wpm} wpm</span>}
          {r.accuracy != null && <span className="text-muted-foreground tabular-nums">{r.accuracy}%</span>}
          <HandBadge hand={r.hand} />
          <Assists a={r.assistance} />
          {!compact && <span className="ml-auto text-xs text-muted-foreground">{new Date(r.completedAt).toLocaleDateString()}</span>}
        </li>
      ))}
    </ol>
  )
}

function Assists({ a }: { a: AssistanceOptions }) {
  if (a.reveal === 'none' && !a.ghostText && !a.autocorrect) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      {a.reveal === 'full' && <Eye className="size-3.5" aria-label="Full text" />}
      {(a.reveal === 'initials' || a.reveal === 'blanks') && <Type className="size-3.5" aria-label={a.reveal === 'initials' ? 'First letters' : 'Blanks'} />}
      {a.ghostText && <Ghost className="size-3.5" aria-label="Ghost text" />}
      {a.autocorrect && <WandSparkles className="size-3.5" aria-label="Lenient" />}
    </span>
  )
}
