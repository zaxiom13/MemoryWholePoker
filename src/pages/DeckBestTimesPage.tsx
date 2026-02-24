import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Ghost, Eye, WandSparkles } from 'lucide-react'
import BackBar from '@/components/BackBar'
import { useData } from '@/contexts/DataContext'

export default function DeckBestTimesPage() {
  const { deckId } = useParams()
  const { state, getBestTimes } = useData()
  const deck = state.decks.find((d) => d.id === deckId)
  const cards = useMemo(() => state.cards.filter((c) => c.deckId === deckId), [state.cards, deckId])

  if (!deck || !deckId) return <p className="text-sm text-muted-foreground">Deck not found.</p>

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-3 sm:px-4 md:px-0">
      <BackBar to="/" title={`Best Times - ${deck.name}`} />
      <div className="playing-card p-4 sm:p-5 space-y-4">
        <div>
          <div className="text-sm font-medium mb-1">Deck</div>
          {renderDeckTimes(getBestTimes('deck', deckId))}
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Cards</div>
          {cards.length === 0 ? (
            <div className="text-sm text-black/70">No cards yet.</div>
          ) : (
            <ul className="grid gap-2">
              {cards
                .map((c) => ({ id: c.id, title: c.title, times: getBestTimes('card', c.id) }))
                .filter((x) => x.times.length > 0)
                .map((x) => (
                  <li key={x.id} className="playing-card p-3">
                    <div className="font-medium text-black">{x.title}</div>
                    {renderTimesList(x.times)}
                  </li>
                ))}
              {cards.every((c) => getBestTimes('card', c.id).length === 0) && (
                <div className="text-sm text-black/70">No times recorded yet.</div>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function format(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function renderFlags(a: { ghostText: boolean; fullText: boolean; autocorrect: boolean }) {
  if (!a.ghostText && !a.fullText && !a.autocorrect) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground align-middle ml-1">
      {a.ghostText && <span title="Ghost Text" aria-label="Ghost Text"><Ghost className="h-3.5 w-3.5" /></span>}
      {a.fullText && <span title="See Full Text" aria-label="See Full Text"><Eye className="h-3.5 w-3.5" /></span>}
      {a.autocorrect && <span title="Autocorrect" aria-label="Autocorrect"><WandSparkles className="h-3.5 w-3.5" /></span>}
    </span>
  )
}

function renderTimesList(times: { id: string; elapsedMs: number; assistance: { ghostText: boolean; fullText: boolean; autocorrect: boolean } }[]) {
  return (
    <ol className="text-xs list-decimal list-inside text-black/80">
      {times.map((r) => (
        <li key={r.id}>
          {format(r.elapsedMs)} {renderFlags(r.assistance)}
        </li>
      ))}
    </ol>
  )
}

function renderDeckTimes(times: { id: string; elapsedMs: number; assistance: { ghostText: boolean; fullText: boolean; autocorrect: boolean } }[]) {
  if (times.length === 0) return <div className="text-sm text-black/70">No deck times yet.</div>
  return (
    <div className="text-sm text-black/80">
      Best: {format(times[0].elapsedMs)} {renderFlags(times[0].assistance)}
      {times.length > 1 && <div className="mt-1">{renderTimesList(times)}</div>}
    </div>
  )
}
