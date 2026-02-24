import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackBar from '@/components/BackBar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useData } from '@/contexts/DataContext'
import { generateDeckWithAI } from '@/lib/gemini'
import LoadingModal from '@/components/LoadingModal'

export default function GenerateDeckPage() {
  const { createDeck, createCard } = useData()
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    try {
      const result = await generateDeckWithAI(topic)
      const deck = createDeck({ name: result.name, description: result.description })
      for (const card of result.cards) createCard({ deckId: deck.id, title: card.title, content: card.content })
      navigate(`/decks/${deck.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate deck'
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <LoadingModal open={loading} message="Generating deck with AI..." />
      <div className="max-w-xl mx-auto space-y-6 px-3 sm:px-4 md:px-0">
        <BackBar to="/" title="Generate Deck with AI" />
        <form onSubmit={onGenerate} className="playing-card p-5 sm:p-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ai-topic" className="text-base">Topic</Label>
            <Textarea id="ai-topic" rows={6} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. World capitals, Shakespeare quotes, Biology basics..." className="text-base min-h-[120px]" />
          </div>
          <p className="text-sm text-muted-foreground">
            Set <code>VITE_GEMINI_API_KEY</code> in your environment.
          </p>
          <div className="flex gap-2.5">
            <Button variant="outline" type="button" onClick={() => navigate('/')} disabled={loading} className="min-h-[44px]">Cancel</Button>
            <Button type="submit" disabled={loading} className="min-h-[44px]">{loading ? 'Generating...' : 'Generate'}</Button>
          </div>
        </form>
      </div>
    </>
  )
}
