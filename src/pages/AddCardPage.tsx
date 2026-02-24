import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BackBar from '@/components/BackBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useData } from '@/contexts/DataContext'

export default function AddCardPage() {
  const { deckId } = useParams()
  const { state, createCard } = useData()
  const navigate = useNavigate()
  const deck = state.decks.find((d) => d.id === deckId)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  if (!deck || !deckId) return <p className="text-sm text-muted-foreground">Deck not found.</p>
  const resolvedDeckId = deckId

  function addCard(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    createCard({ deckId: resolvedDeckId, title: title.trim(), content })
    navigate(`/decks/${resolvedDeckId}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 px-3 sm:px-4 md:px-0">
      <BackBar to={`/decks/${resolvedDeckId}`} title={`New Card - ${deck.name}`} />
      <form onSubmit={addCard} className="playing-card p-5 sm:p-6 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="title" className="text-base">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="text-base" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="content" className="text-base">Content</Label>
          <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="resize-none text-base min-h-[160px]" />
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" type="button" onClick={() => navigate(`/decks/${resolvedDeckId}`)} className="min-h-[44px]">Cancel</Button>
          <Button type="submit" className="min-h-[44px]">Add</Button>
        </div>
      </form>
    </div>
  )
}
