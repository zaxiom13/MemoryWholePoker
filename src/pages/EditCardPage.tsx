import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BackBar from '@/components/BackBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useData } from '@/contexts/DataContext'

export default function EditCardPage() {
  const { cardId } = useParams()
  const { state, updateCard } = useData()
  const navigate = useNavigate()
  const card = state.cards.find((c) => c.id === cardId)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!card) return
    setTitle(card.title)
    setContent(card.content)
  }, [card])

  if (!card || !cardId) return <p className="text-sm text-muted-foreground">Card not found.</p>
  const resolvedCardId = cardId
  const deckId = card.deckId

  function saveCard(e: React.FormEvent) {
    e.preventDefault()
    updateCard(resolvedCardId, { title, content })
    navigate(`/decks/${deckId}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 px-3 sm:px-4 md:px-0">
      <BackBar to={`/decks/${deckId}`} title={`Edit Card - ${card.title}`} />
      <form onSubmit={saveCard} className="playing-card p-5 sm:p-6 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="t" className="text-base">Title</Label>
          <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} className="text-base" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c" className="text-base">Content</Label>
          <Textarea id="c" rows={9} value={content} onChange={(e) => setContent(e.target.value)} className="text-base min-h-[180px]" />
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" type="button" onClick={() => navigate(`/decks/${deckId}`)} className="min-h-[44px]">Cancel</Button>
          <Button type="submit" className="min-h-[44px]">Save</Button>
        </div>
      </form>
    </div>
  )
}
