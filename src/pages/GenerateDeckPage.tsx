import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Segmented } from '@/components/ui/segmented'
import { useData } from '@/contexts/DataContext'
import { useToast } from '@/components/Toaster'
import { generateDeck, useAiAvailable } from '@/lib/ai'

const IDEAS = ['Periodic table: first 10 elements', 'Famous physics equations explained', 'Spanish greetings and phrases', 'Key dates of the French Revolution', 'Stoic philosophy quotes', 'Git commands every developer should know']

const DEALING = ['Shuffling the deck…', 'Cutting the cards…', 'Dealing you in…', 'Checking for aces up sleeves…']

export default function GenerateDeckPage() {
  const { createDeck, createCards } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const ai = useAiAvailable()
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState<'6' | '8' | '12'>('8')
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!loading) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1600)
    return () => window.clearInterval(id)
  }, [loading])

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim() || loading) return
    setLoading(true)
    setTick(0)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await generateDeck(topic.trim(), Number(count), controller.signal)
      const deck = createDeck({ name: result.name, description: result.description })
      createCards(deck.id, result.cards)
      toast({ kind: 'success', message: `Dealt “${result.name}” with ${result.cards.length} cards.` })
      navigate(`/decks/${deck.id}`, { replace: true })
    } catch (err) {
      if (controller.signal.aborted) return
      toast({ kind: 'error', message: err instanceof Error ? err.message : 'Could not generate a deck.' })
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader back="/" backLabel="Decks" title="Deal an AI deck" subtitle="Describe a topic and get a ready-to-play deck of cards." />
      {ai === false && (
        <div className="felt-panel mb-4 px-4 py-3 text-sm">
          AI generation isn&rsquo;t configured on this server yet. The owner can add a <code className="font-mono">GEMINI_API_KEY</code> secret to the Cloudflare Worker.
        </div>
      )}
      <form onSubmit={onGenerate} className="playing-card grid gap-5 p-5 sm:p-7" data-suit="♦">
        <div className="grid gap-2">
          <Label htmlFor="ai-topic" className="text-base font-semibold">
            Topic
          </Label>
          <Textarea
            id="ai-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. The planets of the solar system, in order"
            className="min-h-28 bg-card text-base"
            maxLength={500}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void onGenerate(e)
            }}
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                disabled={loading}
                onClick={() => setTopic(idea)}
                className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <span className="text-base font-semibold">Cards</span>
          <Segmented
            label="Number of cards"
            value={count}
            onChange={setCount}
            options={[
              { value: '6', label: '6' },
              { value: '8', label: '8' },
              { value: '12', label: '12' },
            ]}
          />
        </div>
        <Button type="submit" size="lg" disabled={loading || !topic.trim() || ai === false}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          <span aria-live="polite">{loading ? DEALING[tick % DEALING.length] : 'Generate deck'}</span>
        </Button>
        <p className="text-center text-xs text-muted-foreground">AI can make mistakes. Give the cards a quick check before memorizing them.</p>
      </form>
    </div>
  )
}
