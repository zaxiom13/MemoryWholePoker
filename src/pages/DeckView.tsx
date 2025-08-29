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
import { generateCardsWithGemini } from '@/lib/gemini'
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
  const [genOpen, setGenOpen] = useState(false)
  const [genPrompt, setGenPrompt] = useState('Generate 5 concise flashcards about ...')
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
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-2 sm:px-0">
      <BackBar
        to="/"
        title={deck.name}
        titleEditable
        onTitleChange={(val) => { if (val && val !== deck.name) updateDeck(deck.id, { name: val }) }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary flow: Study */}
          <Button disabled={cards.length === 0} className="chip" asChild>
            <Link to={`/study/deck/${deck.id}/setup`}>Study Deck</Link>
          </Button>
        </div>

        {/* Hamburger menu for deck actions - moved to right side */}
        <div className="flex items-center gap-2">
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
                <DialogContent className="mx-4">
                  <DialogHeader>
                    <DialogTitle>New Card</DialogTitle>
                  </DialogHeader>
                  <form id="add-card" onSubmit={addCard} className="grid gap-3">
                    <div className="grid gap-1">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="content">Content</Label>
                      <Textarea id="content" value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={6} className="resize-none" />
                    </div>
                  </form>
                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setAddOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                    <Button type="submit" form="add-card" onClick={() => setAddOpen(false)} className="w-full sm:w-auto">Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={genOpen} onOpenChange={setGenOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate with AI
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Generate Cards with Gemini</DialogTitle>
                  </DialogHeader>
                  <form
                    id="gen-cards"
                    className="grid gap-3"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!deck) return
                      setGenLoading(true)
                      try {
                        const cards = await generateCardsWithGemini(genPrompt)
                        for (const c of cards) {
                          const t = c.title?.trim() || 'Untitled'
                          const cnt = c.content?.trim() || ''
                          if (cnt) createCard({ deckId: deck.id, title: t, content: cnt })
                        }
                        setGenOpen(false)
                      } catch (err: any) {
                        alert(err?.message || 'Failed to generate cards')
                      } finally {
                        setGenLoading(false)
                      }
                    }}
                  >
                    <div className="grid gap-1">
                      <Label htmlFor="gen-prompt">Prompt</Label>
                      <Textarea id="gen-prompt" rows={6} value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set your API key in <code>src/AI_KEY.ts</code> or <code>.env</code> as <code>VITE_GEMINI_API_KEY</code>.
                    </p>
                  </form>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGenOpen(false)} disabled={genLoading}>Cancel</Button>
                    <Button type="submit" form="gen-cards" disabled={genLoading}>{genLoading ? 'Generating…' : 'Generate'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

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
        <div className="py-2 max-w-3xl animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <p
            className="mt-1 text-black/80 outline-none focus:ring-2 ring-primary/30 rounded-sm min-h-[1.5rem]"
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

      <section className="space-y-3">
        <h2 className="font-semibold">Cards</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {cards.map((c, i) => (
            <Reveal as="li" key={c.id} delay={i * 60} className="playing-card p-4 sm:p-6 flex flex-col justify-between hover:shadow-lg hover:scale-[1.01] transition text-black">
              <div>
                <div className="text-base sm:text-lg font-bold truncate text-black">{c.title}</div>
                <p className="text-xs sm:text-sm mt-2 line-clamp-4 min-h-[3rem] sm:min-h-[4rem] text-black/80 whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>
              <div className="flex justify-end gap-1 sm:gap-2 mt-3 sm:mt-4">
                <Button className="chip" asChild>
                  <Link to={`/study/card/${c.id}/setup`}>Study</Link>
                </Button>
                <EditCardButton
                  title={c.title}
                  content={c.content}
                  onSave={(t, cnt) => updateCard(c.id, { title: t, content: cnt })}
                  className="chip"
                />
                <Button size="icon" variant="ghost" className="chip" title="Delete Card" onClick={() => deleteCard(c.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Reveal>
          ))}
          {cards.length === 0 && <li className="text-sm text-muted-foreground">No cards yet.</li>}
        </ul>
      </section>

      {/* add card handled by dialog above */}
    </div>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="t">Title</Label>
            <Input id="t" value={t} onChange={(e) => setT(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="c">Content</Label>
            <Textarea id="c" rows={8} value={cnt} onChange={(e) => setCnt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { onSave(t, cnt); setOpen(false) }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
