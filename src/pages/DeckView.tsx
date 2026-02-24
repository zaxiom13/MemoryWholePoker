import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '@/contexts/DataContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import BackBar from '@/components/BackBar'
import LoadingModal from '@/components/LoadingModal'
import ConfirmModal from '@/components/ConfirmModal'
import MessageModal from '@/components/MessageModal'
import { generateMoreCardsWithGemini } from '@/lib/gemini'
import { Trash2, Plus, Sparkles, Pencil, BookOpen, Loader2, Menu } from 'lucide-react'
import Reveal from '@/components/Reveal'

export default function DeckView() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const { state, deleteDeck, createCard, deleteCard } = useData()
  const deck = state.decks.find((d) => d.id === deckId)
  const cards = useMemo(() => state.cards.filter((c) => c.deckId === deckId), [state.cards, deckId])

  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [deleteDeckOpen, setDeleteDeckOpen] = useState(false)
  const [cardIdToDelete, setCardIdToDelete] = useState<string | null>(null)

  async function onGenerateCards() {
    if (!deck) return
    setGenLoading(true)
    try {
      const newCards = await generateMoreCardsWithGemini(deck.name, cards)
      for (const c of newCards) {
        const t = c.title?.trim() || 'Untitled'
        const cnt = c.content?.trim() || ''
        if (cnt) createCard({ deckId: deck.id, title: t, content: cnt })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate cards'
      setGenError(message)
    } finally {
      setGenLoading(false)
    }
  }

  if (!deck) return <p className="text-sm text-muted-foreground">Deck not found.</p>

  return (
    <>
      <LoadingModal open={genLoading} message="Generating cards with AI..." />
      <MessageModal
        open={genError != null}
        onOpenChange={(open) => {
          if (!open) setGenError(null)
        }}
        title="Could not generate cards"
        message={genError ?? ''}
      />
      <ConfirmModal
        open={deleteDeckOpen}
        onOpenChange={setDeleteDeckOpen}
        title="Delete deck?"
        description="This will delete the deck and all of its cards."
        confirmLabel="Delete"
        onConfirm={() => {
          deleteDeck(deck.id)
          setDeleteDeckOpen(false)
          navigate('/')
        }}
        destructive
      />
      <ConfirmModal
        open={cardIdToDelete != null}
        onOpenChange={(open) => {
          if (!open) setCardIdToDelete(null)
        }}
        title="Delete card?"
        description="This card will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!cardIdToDelete) return
          deleteCard(cardIdToDelete)
          setCardIdToDelete(null)
        }}
        destructive
      />
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 md:px-0">
        <BackBar
          to="/"
          title={deck.name}
          actionsPlacement="right"
          hideBackLabel
          actions={(
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="chip h-7 w-7 sm:h-8 sm:w-8 px-0"
                  title="Deck Actions"
                  aria-label="Deck Actions"
                >
                  <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuItem className="gap-2" onSelect={() => navigate(`/decks/${deck.id}/edit`)}>
                  <Pencil className="h-4 w-4" />
                  <span>Edit Deck</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => navigate(`/study/deck/${deck.id}/setup`)}
                  disabled={cards.length === 0}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Study Deck</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => navigate(`/decks/${deck.id}/cards/new`)}>
                  <Plus className="h-4 w-4" />
                  <span>Add Card</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => void onGenerateCards()} disabled={genLoading}>
                  {genLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>{genLoading ? 'Generating cards...' : 'Generate with AI'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  onSelect={() => setDeleteDeckOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Deck</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />

      <div className="flex items-start justify-between">
        <div className="pt-0 pb-2 max-w-3xl animate-in fade-in-0 slide-in-from-top-2 duration-300 w-full">
          <p className="mt-1 text-black/80 min-h-[1.25rem] text-sm sm:text-base leading-relaxed">
            {deck.description ?? 'Add a description'}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg sm:text-xl">Cards</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {cards.map((c, i) => (
            <Reveal
              as="li"
              key={c.id}
              delay={i * 60}
              className="playing-card action-card action-pressable p-5 sm:p-6 flex flex-col justify-between text-black"
            >
              <div>
                <div className="text-lg sm:text-xl font-bold truncate text-black">{c.title}</div>
                <p className="text-sm sm:text-base mt-2.5 line-clamp-4 min-h-[3.5rem] sm:min-h-[4.5rem] text-black/80 whitespace-pre-wrap leading-relaxed">
                  {c.content}
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button className="chip text-sm" asChild>
                  <Link to={`/study/card/${c.id}/setup`}>Study</Link>
                </Button>
                <Button variant="outline" className="chip text-sm" asChild>
                  <Link to={`/cards/${c.id}/edit`}><Pencil className="h-4 w-4" /> Edit</Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="chip"
                  title="Delete Card"
                  onClick={() => setCardIdToDelete(c.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Reveal>
          ))}
          {cards.length === 0 && <li className="text-base text-muted-foreground">No cards yet.</li>}
        </ul>
      </section>
      </div>
    </>
  )
}
