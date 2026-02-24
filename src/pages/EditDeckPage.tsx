import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BackBar from '@/components/BackBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useData } from '@/contexts/DataContext'

export default function EditDeckPage() {
  const { deckId } = useParams()
  const { state, updateDeck } = useData()
  const navigate = useNavigate()
  const deck = state.decks.find((d) => d.id === deckId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!deck) return
    setName(deck.name)
    setDescription(deck.description ?? '')
  }, [deck])

  if (!deck || !deckId) return <p className="text-sm text-muted-foreground">Deck not found.</p>
  const resolvedDeckId = deckId

  function saveDeck(e: React.FormEvent) {
    e.preventDefault()
    const nextName = name.trim()
    if (!nextName) return
    const nextDescription = description.trim()
    const normalizedDescription = nextDescription ? nextDescription : undefined
    updateDeck(resolvedDeckId, { name: nextName, description: normalizedDescription })
    navigate(`/decks/${resolvedDeckId}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 px-3 sm:px-4 md:px-0">
      <BackBar to={`/decks/${resolvedDeckId}`} title={`Edit Deck - ${deck.name}`} />
      <form onSubmit={saveDeck} className="playing-card p-5 sm:p-6 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="deck-name" className="text-base">Name</Label>
          <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} className="text-base" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="deck-description" className="text-base">Description</Label>
          <Textarea
            id="deck-description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-base min-h-[120px]"
          />
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" type="button" onClick={() => navigate(`/decks/${resolvedDeckId}`)} className="min-h-[44px]">Cancel</Button>
          <Button type="submit" className="min-h-[44px]" disabled={!name.trim()}>Save</Button>
        </div>
      </form>
    </div>
  )
}
