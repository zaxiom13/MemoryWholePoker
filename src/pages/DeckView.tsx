import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, MoreHorizontal, Pencil, Play, Plus, Sparkles, Trash2, Trophy } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/PageHeader'
import HandBadge from '@/components/HandBadge'
import ConfirmModal from '@/components/ConfirmModal'
import { useToast } from '@/components/Toaster'
import { generateMoreCards, useAiAvailable } from '@/lib/ai'
import { setPrefs, usePrefs } from '@/lib/prefs'
import { bestHand, bestTime, suitFor } from '@/lib/records'
import { formatTime } from '@/lib/scoring'
import { cn } from '@/lib/utils'

export default function DeckView() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const ai = useAiAvailable()
  const { hideAnswers } = usePrefs()
  const { state, deleteDeck, deleteCard, createCards, restore } = useData()
  const deck = state.decks.find((d) => d.id === deckId)
  const cards = useMemo(() => state.cards.filter((c) => c.deckId === deckId), [state.cards, deckId])

  const [generating, setGenerating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!deck) {
    return (
      <div>
        <PageHeader back="/" backLabel="Decks" title="Deck not found" subtitle="It may have been deleted in another tab." />
      </div>
    )
  }

  const deckBest = bestTime(state.records, 'deck', deck.id)
  const deckHand = bestHand(state.records, 'deck', deck.id)

  async function onGenerate() {
    if (!deck || generating) return
    setGenerating(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const fresh = await generateMoreCards(deck, cards.map((c) => ({ title: c.title, content: c.content })), 6, controller.signal)
      const added = createCards(deck.id, fresh)
      toast({ kind: 'success', message: `Dealt ${added.length} new card${added.length === 1 ? '' : 's'}.` })
    } catch (err) {
      if (controller.signal.aborted) return
      toast({ kind: 'error', message: err instanceof Error ? err.message : 'Could not generate cards.' })
    } finally {
      if (!controller.signal.aborted) setGenerating(false)
    }
  }

  function onDeleteCard(id: string, title: string) {
    const snapshot = deleteCard(id)
    toast({ message: `Deleted “${title || 'Untitled'}”.`, action: { label: 'Undo', onClick: () => restore(snapshot) } })
  }

  return (
    <div>
      <ConfirmModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${deck.name}”?`}
        description={`This removes the deck, its ${cards.length} card${cards.length === 1 ? '' : 's'} and their best times.`}
        confirmLabel="Delete deck"
        destructive
        onConfirm={() => {
          const snapshot = deleteDeck(deck.id)
          setConfirmDelete(false)
          navigate('/')
          toast({ message: `Deleted “${deck.name}”.`, action: { label: 'Undo', onClick: () => restore(snapshot) } })
        }}
      />

      <PageHeader
        back="/"
        backLabel="Decks"
        title={deck.name}
        subtitle={deck.description}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" aria-label="Deck options">
                <MoreHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem className="gap-2" onSelect={() => navigate(`/decks/${deck.id}/edit`)}>
                <Pencil className="size-4" /> Edit deck
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={() => navigate(`/decks/${deck.id}/times`)}>
                <Trophy className="size-4" /> Best times
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={() => setPrefs({ hideAnswers: !hideAnswers })}>
                {hideAnswers ? <Eye className="size-4" /> : <EyeOff className="size-4" />} {hideAnswers ? 'Show answers' : 'Hide answers'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" /> Delete deck
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {cards.length > 0 && (
          <Button size="lg" asChild>
            <Link to={`/study/deck/${deck.id}/setup`}>
              <Play className="fill-current" /> Play deck
            </Link>
          </Button>
        )}
        <Button variant="secondary" asChild>
          <Link to={`/decks/${deck.id}/cards/new`}>
            <Plus /> Add card
          </Link>
        </Button>
        {ai !== false && (
          <Button variant="secondary" onClick={() => void onGenerate()} disabled={generating}>
            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {generating ? 'Dealing…' : 'AI: more cards'}
          </Button>
        )}
        {(deckBest != null || deckHand) && (
          <Link to={`/decks/${deck.id}/times`} className="ml-auto inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <Trophy className="size-4 text-gold" />
            {deckBest != null && <span className="font-mono font-semibold tabular-nums">{formatTime(deckBest)}</span>}
          </Link>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="felt-panel px-6 py-10 text-center">
          <h2 className="text-xl font-semibold">No cards yet</h2>
          <p className="mt-2 text-muted-foreground">Each card is a prompt (the title) and the text you want to recall word for word.</p>
          <Button className="mt-5" asChild>
            <Link to={`/decks/${deck.id}/cards/new`}>
              <Plus /> Add your first card
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((c, i) => {
            const hand = bestHand(state.records, 'card', c.id)
            const best = bestTime(state.records, 'card', c.id)
            const hidden = hideAnswers && !revealed.has(c.id)
            return (
              <li key={c.id} className="deal-in" style={{ '--i': Math.min(i, 12) } as React.CSSProperties}>
                <div className="playing-card flex h-full flex-col p-5 pt-7" data-suit={suitFor(c.id)}>
                  <h3 className="text-lg font-semibold leading-snug">{c.title || 'Untitled'}</h3>
                  <button
                    type="button"
                    className={cn('mt-2 line-clamp-4 whitespace-pre-line text-left font-read text-[0.95rem] leading-relaxed text-muted-foreground transition-[filter]', hidden && 'select-none blur-[5px]')}
                    onClick={() =>
                      setRevealed((s) => {
                        const next = new Set(s)
                        if (next.has(c.id)) next.delete(c.id)
                        else next.add(c.id)
                        return next
                      })
                    }
                    aria-label={hidden ? 'Reveal answer' : undefined}
                    tabIndex={hideAnswers ? 0 : -1}
                  >
                    {c.content}
                  </button>
                  <div className="mt-auto flex items-center gap-1.5 pt-4">
                    <HandBadge hand={hand} />
                    {best != null && <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">{formatTime(best)}</span>}
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link to={`/cards/${c.id}/edit`} aria-label={`Edit ${c.title}`} title="Edit">
                          <Pencil />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => onDeleteCard(c.id, c.title)} aria-label={`Delete ${c.title}`} title="Delete">
                        <Trash2 />
                      </Button>
                      <Button size="icon-sm" asChild>
                        <Link to={`/study/card/${c.id}/setup`} aria-label={`Play ${c.title}`} title="Play">
                          <Play className="translate-x-px fill-current" />
                        </Link>
                      </Button>
                    </div>
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
