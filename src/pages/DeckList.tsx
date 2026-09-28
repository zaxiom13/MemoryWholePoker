import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Layers, Library, Play, Plus, Sparkles, X } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { Button } from '@/components/ui/button'
import HandBadge from '@/components/HandBadge'
import { useAiAvailable } from '@/lib/ai'
import { bestHand, suitFor } from '@/lib/records'
import { LEARNKIT_PACKS, deckForPack } from '@/lib/library'
import { setPrefs, usePrefs } from '@/lib/prefs'

export default function DeckList() {
  const { state, loadDemoData } = useData()
  const ai = useAiAvailable()
  const { libraryHintDismissed } = usePrefs()
  const { profile } = state
  const newPacks = LEARNKIT_PACKS.filter((p) => !deckForPack(state.decks, p)).length

  const deckCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of state.cards) counts[c.deckId] = (counts[c.deckId] ?? 0) + 1
    return counts
  }, [state.cards])

  const decks = useMemo(() => [...state.decks].sort((a, b) => b.createdAt - a.createdAt), [state.decks])

  return (
    <div>
      <section className="mb-7 sm:mb-9">
        <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">
          {profile.runs === 0 ? 'Pull up a chair.' : 'Welcome back to the table.'}
        </h1>
        <p className="mt-2 max-w-xl text-base text-muted-foreground sm:text-lg">
          Pick a deck, type it from memory, and see what hand you&rsquo;re dealt. Cleaner runs win better hands and more chips.
        </p>
        {profile.runs > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="felt-panel inline-flex items-center gap-2 px-3 py-1.5 font-semibold tabular-nums">
              <span className="chip-coin" aria-hidden /> {profile.chips.toLocaleString()} chips
            </span>
            <span className="felt-panel inline-flex items-center gap-2 px-3 py-1.5 font-semibold tabular-nums">
              <Flame className="size-4 text-orange-300" /> {profile.streak} day streak
              {profile.bestStreak > profile.streak && <span className="font-normal text-muted-foreground">(best {profile.bestStreak})</span>}
            </span>
            <span className="felt-panel inline-flex items-center gap-2 px-3 py-1.5 font-semibold tabular-nums">{profile.runs} runs</span>
          </div>
        )}
      </section>

      {newPacks > 0 && !libraryHintDismissed && (
        <div className="felt-panel mb-6 flex items-center gap-3 px-4 py-3">
          <Library className="size-5 shrink-0 text-gold" />
          <p className="flex-1 text-sm">
            <strong>New in the library:</strong> {newPacks} decks from LearnKit courses (physics, computing, history, Linux and more).
          </p>
          <Button size="sm" asChild>
            <Link to="/library">Browse</Link>
          </Button>
          <button className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-white/10" aria-label="Dismiss" onClick={() => setPrefs({ libraryHintDismissed: true })}>
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-xl font-semibold sm:text-2xl">Decks</h2>
        <Button variant="secondary" size="sm" asChild>
          <Link to="/library">
            <Library /> Library
          </Link>
        </Button>
        {state.cards.length > 0 && (
          <Button variant="secondary" size="sm" asChild>
            <Link to="/study/all/setup">
              <Layers /> Study all
            </Link>
          </Button>
        )}
        {ai !== false && (
          <Button variant="secondary" size="sm" asChild>
            <Link to="/decks/generate">
              <Sparkles /> AI deck
            </Link>
          </Button>
        )}
        <Button size="sm" asChild>
          <Link to="/decks/new">
            <Plus /> New deck
          </Link>
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="felt-panel px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex w-fit gap-1 text-4xl opacity-80" aria-hidden>
            ♠<span className="text-suit-red">♥</span>♣<span className="text-suit-red">♦</span>
          </div>
          <h2 className="text-2xl font-semibold">The table is empty</h2>
          <p className="mt-2 text-muted-foreground">Create a deck of things you want to know by heart: quotes, poems, speeches, facts.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/decks/new">
                <Plus /> New deck
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/library">
                <Library /> Browse the library
              </Link>
            </Button>
            <Button variant="ghost" onClick={loadDemoData}>
              Load sample decks
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d, i) => {
            const count = deckCounts[d.id] ?? 0
            const hand = bestHand(state.records, 'deck', d.id)
            return (
              <li key={d.id} className="deal-in" style={{ '--i': i } as React.CSSProperties}>
                <div className="playing-card lift relative flex h-full min-h-44 flex-col p-5 pt-7" data-suit={suitFor(d.id)}>
                  <Link to={`/decks/${d.id}`} className="rounded-md after:absolute after:inset-0 after:rounded-[inherit] after:content-['']">
                    <h3 className="text-xl font-semibold leading-snug">{d.name}</h3>
                  </Link>
                  {d.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>}
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      {count} card{count === 1 ? '' : 's'}
                    </span>
                    <HandBadge hand={hand} />
                    {count > 0 && (
                      <Link
                        to={`/study/deck/${d.id}/setup`}
                        className="relative z-10 ml-auto grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
                        aria-label={`Play ${d.name}`}
                        title="Play"
                      >
                        <Play className="size-5 translate-x-px fill-current" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
