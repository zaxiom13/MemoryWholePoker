import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '@/contexts/DataContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus, Trophy } from 'lucide-react'
import Reveal from '@/components/Reveal'

export default function DeckList() {
  const { state, createDeck, deleteDeck, loadDemoData, getBestTimes } = useData()
  const [open, setOpen] = useState(false)
  const [bestOpenId, setBestOpenId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const navigate = useNavigate()

  const deckCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of state.cards) counts[c.deckId] = (counts[c.deckId] ?? 0) + 1
    return counts
  }, [state.cards])

  function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const deck = createDeck({ name, description })
    setName('')
    setDescription('')
    setOpen(false)
    navigate(`/decks/${deck.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold animate-in fade-in-0 slide-in-from-top-2 duration-300">Decks</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center justify-center gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> New Deck</Button>
            </DialogTrigger>
            <DialogContent className="mx-4">
              <DialogHeader>
                <DialogTitle>Create Deck</DialogTitle>
              </DialogHeader>
              <form id="new-deck" onSubmit={onCreate} className="grid gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="deck-name">Name</Label>
                  <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sonnets" />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="deck-desc">Description (optional)</Label>
                  <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
                </div>
              </form>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" form="new-deck" className="w-full sm:w-auto">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={loadDemoData} className="text-black w-full sm:w-auto">Load Default Decks</Button>
        </div>
      </div>

      {state.decks.length === 0 ? (
        <div className="text-center py-8 sm:py-12 rounded-lg border bg-card playing-card animate-in fade-in-0 zoom-in-95 duration-300 mx-2 sm:mx-0">
          <h2 className="text-lg sm:text-xl text-muted-foreground">No decks yet.</h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">Create a new deck to get started.</p>
          <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2">
            <Button onClick={() => setOpen(true)} className="flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> New Deck</Button>
            <Button variant="outline" onClick={loadDemoData} className="text-black">Load Default Decks</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {state.decks.map((d, i) => {
            const count = deckCounts[d.id] ?? 0
            return (
              <Reveal key={d.id} as="div" delay={i * 60} className="playing-card p-4 sm:p-6 flex flex-col justify-between hover:shadow-lg hover:scale-[1.01] transition text-black">
                <Link to={`/decks/${d.id}`} className="block">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold truncate text-black">{d.name}</h2>
                    <p className="text-xs sm:text-sm mt-2 line-clamp-3 min-h-[3rem] sm:min-h-[3.5rem] text-black/80">{d.description}</p>
                    <p className="text-xs mt-3 sm:mt-4 text-black/70">{count} card{count !== 1 && 's'}</p>
                  </div>
                </Link>
                <div className="flex justify-end gap-1 mt-3 sm:mt-4">
                  <Dialog open={bestOpenId === d.id} onOpenChange={(v) => setBestOpenId(v ? d.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="chip" title="Best Times">
                        <Trophy className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>Best Times — {d.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium mb-1">Deck</div>
                          {renderDeckTimes(getBestTimes('deck', d.id))}
                        </div>
                        <div>
                          <div className="text-sm font-medium mb-1">Cards</div>
                          {state.cards.filter((c) => c.deckId === d.id).length === 0 ? (
                            <div className="text-sm text-black/70">No cards yet.</div>
                          ) : (
                            <ul className="grid gap-2">
                              {state.cards
                                .filter((c) => c.deckId === d.id)
                                .map((c) => ({ id: c.id, title: c.title, times: getBestTimes('card', c.id) }))
                                .filter((x) => x.times.length > 0)
                                .map((x) => (
                                  <li key={x.id} className="playing-card p-3">
                                    <div className="font-medium text-black">{x.title}</div>
                                    {renderTimesList(x.times)}
                                  </li>
                                ))}
                              {state.cards.filter((c) => c.deckId === d.id).every((c) => getBestTimes('card', c.id).length === 0) && (
                                <div className="text-sm text-black/70">No times recorded yet.</div>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="icon" variant="ghost" className="chip" title="Delete Deck" onClick={(e) => { e.stopPropagation(); if (confirm('Delete deck and all cards?')) deleteDeck(d.id) }}>
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

function format(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function renderFlags(a: { ghostText: boolean; fullText: boolean; autocorrect: boolean }) {
  const flags = [a.ghostText && 'ghost', a.fullText && 'full', a.autocorrect && 'auto'].filter(Boolean) as string[]
  return flags.length ? <span className="text-xs text-muted-foreground">[{flags.join(', ')}]</span> : null
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
      {times.length > 1 && (
        <div className="mt-1">
          {renderTimesList(times)}
        </div>
      )}
    </div>
  )
}
