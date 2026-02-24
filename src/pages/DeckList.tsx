import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/contexts/DataContext'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Trophy, Sparkles, Layers } from 'lucide-react'
import Reveal from '@/components/Reveal'
import ConfirmModal from '@/components/ConfirmModal'

export default function DeckList() {
  const { state, deleteDeck, loadDemoData } = useData()
  const [deckIdToDelete, setDeckIdToDelete] = useState<string | null>(null)

  const deckCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of state.cards) counts[c.deckId] = (counts[c.deckId] ?? 0) + 1
    return counts
  }, [state.cards])

  return (
    <div className="space-y-6 px-3 sm:px-4 md:px-0">
      <ConfirmModal
        open={deckIdToDelete != null}
        onOpenChange={(open) => {
          if (!open) setDeckIdToDelete(null)
        }}
        title="Delete deck?"
        description="This will delete the deck and all of its cards."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deckIdToDelete) return
          deleteDeck(deckIdToDelete)
          setDeckIdToDelete(null)
        }}
        destructive
      />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl sm:text-4xl font-bold animate-in fade-in-0 slide-in-from-top-2 duration-300">Decks</h1>
        <div className="decklist-actions ml-auto flex flex-row gap-2 w-auto shrink-0">
          <Button variant="outline" className="decklist-action-btn flex items-center justify-center gap-2 w-full sm:w-auto text-black" asChild>
            <Link to="/study/all/setup" aria-label="Study All" role="button">
              <Layers className="h-4 w-4" />
              <span className="decklist-action-label">Study All</span>
            </Link>
          </Button>
          <Button className="decklist-action-btn flex items-center justify-center gap-2 w-full sm:w-auto" asChild>
            <Link to="/decks/new" aria-label="New Deck" role="button">
              <Plus className="h-4 w-4" />
              <span className="decklist-action-label">New Deck</span>
            </Link>
          </Button>
          <Button variant="outline" className="decklist-action-btn flex items-center justify-center gap-2 w-full sm:w-auto text-black" asChild>
            <Link to="/decks/generate" aria-label="Generate with AI" role="button">
              <Sparkles className="h-4 w-4" />
              <span className="decklist-action-label">Generate with AI</span>
            </Link>
          </Button>
        </div>
      </div>

      {state.decks.length === 0 ? (
        <div className="text-center py-10 sm:py-12 rounded-lg border bg-card playing-card animate-in fade-in-0 zoom-in-95 duration-300 mx-1">
          <h2 className="text-xl sm:text-2xl text-muted-foreground font-semibold">No decks yet.</h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">Create a new deck to get started.</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3 px-4 sm:px-0">
            <Button asChild className="flex items-center justify-center gap-2 min-h-[44px]"><Link to="/decks/new"><Plus className="h-4 w-4" /> New Deck</Link></Button>
            <Button variant="outline" onClick={loadDemoData} className="text-black min-h-[44px]">Load Default Decks</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {state.decks.map((d, i) => {
            const count = deckCounts[d.id] ?? 0
            return (
              <Reveal
                key={d.id}
                as="div"
                delay={i * 60}
                className="playing-card action-card action-pressable p-5 sm:p-6 flex flex-col justify-between text-black"
              >
                <Link to={`/decks/${d.id}`} className="block">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold truncate text-black">{d.name}</h2>
                    <p className="text-sm sm:text-base mt-2.5 line-clamp-3 min-h-[3.5rem] sm:min-h-[4rem] text-black/80 leading-relaxed">{d.description}</p>
                    <p className="text-sm mt-4 text-black/70 font-medium">{count} card{count !== 1 && 's'}</p>
                  </div>
                </Link>
                <div className="flex justify-end gap-2 mt-4">
                  <Button size="icon" variant="ghost" className="chip" title="Best Times" asChild>
                    <Link to={`/decks/${d.id}/times`}>
                      <Trophy className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="icon" variant="ghost" className="chip" title="Delete Deck" onClick={(e) => { e.stopPropagation(); setDeckIdToDelete(d.id) }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}
