import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '@/contexts/DataContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import BackBar from '@/components/BackBar'
import LoadingModal from '@/components/LoadingModal'
import { generateMoreCardsWithGemini } from '@/lib/gemini'
import { Trash2, Menu, Plus, Sparkles } from 'lucide-react'
import Reveal from '@/components/Reveal'

export default function DeckView() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const { state, updateDeck, deleteDeck, createCard, updateCard, deleteCard } = useData()
  const deck = state.decks.find((d) => d.id === deckId)
  const cards = useMemo(() => state.cards.filter((c) => c.deckId === deckId), [state.cards, deckId])

  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [genLoading, setGenLoading] = useState(false)

  if (!deck) return <p className="text-sm text-muted-foreground">Deck not found.</p>

  function addCard(e: React.FormEvent) {
    e.preventDefault()
    if (!deck || !newTitle.trim() || !newContent.trim()) return
    createCard({ deckId: deck.id, title: newTitle.trim(), content: newContent })
    setNewTitle('')
    setNewContent('')
  }

  return (
    <>
      <LoadingModal open={genLoading} message="Generating cards with AI..." />
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 md:px-0">
        <BackBar
          to="/"
          title={deck.name}
          titleEditable
          onTitleChange={(val) => { if (val && val !== deck.name) updateDeck(deck.id, { name: val }) }}
        />
      <div className="flex flex-row items-center justify-between gap-3 sm:gap-4 flex-nowrap">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0 flex-1">
          {/* Primary flow: Study */}
          <Button disabled={cards.length === 0} className="chip text-base" asChild>
            <Link to={`/study/deck/${deck.id}/setup`} className="truncate whitespace-nowrap">Study Deck</Link>
          </Button>
        </div>

        {/* Hamburger menu for deck actions - moved to right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="chip" title="Deck Actions">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Card
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="mx-3 sm:mx-4 max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">New Card</DialogTitle>
                  </DialogHeader>
                  <form id="add-card" onSubmit={addCard} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title" className="text-base">Title</Label>
                      <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="text-base" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="content" className="text-base">Content</Label>
                      <Textarea id="content" value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={7} className="resize-none text-base min-h-[140px]" />
                    </div>
                  </form>
                  <DialogFooter className="flex-col sm:flex-row gap-2.5">
                    <Button variant="outline" onClick={() => setAddOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
                    <Button type="submit" form="add-card" onClick={() => setAddOpen(false)} className="w-full sm:w-auto min-h-[44px]">Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenuItem
                onSelect={async () => {
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
                    alert(message)
                  } finally {
                    setGenLoading(false)
                  }
                }}
                disabled={genLoading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {genLoading ? 'Generating…' : 'Generate with AI'}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onSelect={() => {
                  if (confirm('Delete deck and all cards?')) { 
                    deleteDeck(deck.id); 
                    navigate('/') 
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Deck
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div className="py-2 max-w-3xl animate-in fade-in-0 slide-in-from-top-2 duration-300 w-full">
          <p
            className="mt-1 text-black/80 outline-none focus:ring-2 ring-primary/30 rounded-sm min-h-[1.5rem] text-base sm:text-lg leading-relaxed"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.currentTarget as HTMLElement).blur()
              }
            }}
            onBlur={(e) => {
              const next = e.currentTarget.textContent?.trim()
              const normalized = next ? next : undefined
              if (normalized !== deck.description) updateDeck(deck.id, { description: normalized })
            }}
          >
            {deck.description ?? 'Add a description'}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg sm:text-xl">Cards</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
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
                <EditCardButton
                  title={c.title}
                  content={c.content}
                  onSave={(t, cnt) => updateCard(c.id, { title: t, content: cnt })}
                  className="chip text-sm"
                />
                <Button size="icon" variant="ghost" className="chip" title="Delete Card" onClick={() => deleteCard(c.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Reveal>
          ))}
          {cards.length === 0 && <li className="text-base text-muted-foreground">No cards yet.</li>}
        </ul>
      </section>

      {/* add card handled by dialog above */}
      </div>
    </>
  )
}

function EditCardButton({ title, content, onSave, className }: { title: string; content: string; onSave: (title: string, content: string) => void; className?: string }) {
  const [open, setOpen] = useState(false)
  const [t, setT] = useState(title)
  const [cnt, setCnt] = useState(content)
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setT(title); setCnt(content) } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>Edit</Button>
      </DialogTrigger>
      <DialogContent className="mx-3 sm:mx-4 max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit Card</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="t" className="text-base">Title</Label>
            <Input id="t" value={t} onChange={(e) => setT(e.target.value)} className="text-base" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c" className="text-base">Content</Label>
            <Textarea id="c" rows={9} value={cnt} onChange={(e) => setCnt(e.target.value)} className="text-base min-h-[180px]" />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2.5">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
          <Button onClick={() => { onSave(t, cnt); setOpen(false) }} className="w-full sm:w-auto min-h-[44px]">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
