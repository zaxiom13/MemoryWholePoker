import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '@/contexts/DataContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus, Trophy, Sparkles } from 'lucide-react'
import Reveal from '@/components/Reveal'
import LoadingModal from '@/components/LoadingModal'
import { generateDeckWithAI } from '@/lib/gemini'

export default function DeckList() {
  const { state, createDeck, deleteDeck, loadDemoData, getBestTimes, createCard } = useData()
  const [open, setOpen] = useState(false)
  const [bestOpenId, setBestOpenId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
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

  async function onGenerateAI(e: React.FormEvent) {
    e.preventDefault()
    if (!aiTopic.trim()) return
    setAiLoading(true)
    try {
      const result = await generateDeckWithAI(aiTopic)
      const deck = createDeck({ name: result.name, description: result.description })
      for (const card of result.cards) {
        createCard({ deckId: deck.id, title: card.title, content: card.content })
      }
      setAiTopic('')
      setAiOpen(false)
      navigate(`/decks/${deck.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate deck'
      alert(message)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <>
      <LoadingModal open={aiLoading} message="Generating deck with AI..." />
      <div className="space-y-6 px-3 sm:px-4 md:px-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold animate-in fade-in-0 slide-in-from-top-2 duration-300">Decks</h1>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center justify-center gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> New Deck</Button>
            </DialogTrigger>
            <DialogContent className="mx-3 sm:mx-4 max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Create Deck</DialogTitle>
              </DialogHeader>
              <form id="new-deck" onSubmit={onCreate} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="deck-name" className="text-base">Name</Label>
                  <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sonnets" className="text-base" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deck-desc" className="text-base">Description (optional)</Label>
                  <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="text-base min-h-[100px]" />
                </div>
              </form>
              <DialogFooter className="flex-col sm:flex-row gap-2.5">
                <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
                <Button type="submit" form="new-deck" className="w-full sm:w-auto min-h-[44px]">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto text-black"><Sparkles className="h-4 w-4" /> Generate with AI</Button>
            </DialogTrigger>
            <DialogContent className="mx-3 sm:mx-4 max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Generate Deck with AI</DialogTitle>
              </DialogHeader>
              <form id="gen-deck" onSubmit={onGenerateAI} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ai-topic" className="text-base">Topic</Label>
                  <Textarea id="ai-topic" rows={5} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="e.g. World capitals, Shakespeare quotes, Biology basics..." className="text-base min-h-[120px]" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Set <code>VITE_GEMINI_API_KEY</code> in your environment (e.g., Netlify env var).
                </p>
              </form>
              <DialogFooter className="flex-col sm:flex-row gap-2.5">
                <Button variant="outline" onClick={() => setAiOpen(false)} disabled={aiLoading} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
                <Button type="submit" form="gen-deck" disabled={aiLoading} className="w-full sm:w-auto min-h-[44px]">{aiLoading ? 'Generating…' : 'Generate'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {state.decks.length === 0 ? (
        <div className="text-center py-10 sm:py-12 rounded-lg border bg-card playing-card animate-in fade-in-0 zoom-in-95 duration-300 mx-1">
          <h2 className="text-xl sm:text-2xl text-muted-foreground font-semibold">No decks yet.</h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">Create a new deck to get started.</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3 px-4 sm:px-0">
            <Button onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 min-h-[44px]"><Plus className="h-4 w-4" /> New Deck</Button>
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
                  <Dialog open={bestOpenId === d.id} onOpenChange={(v) => setBestOpenId(v ? d.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="chip" title="Best Times">
                        <Trophy className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl mx-3 sm:mx-4 max-w-[calc(100vw-1.5rem)] sm:max-w-xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">Best Times — {d.name}</DialogTitle>
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
    </>
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
