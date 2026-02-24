import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackBar from '@/components/BackBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useData } from '@/contexts/DataContext'

export default function NewDeckPage() {
  const { createDeck } = useData()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const deck = createDeck({ name, description })
    navigate(`/decks/${deck.id}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 px-3 sm:px-4 md:px-0">
      <BackBar to="/" title="Create Deck" />
      <form onSubmit={onCreate} className="playing-card p-5 sm:p-6 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="deck-name" className="text-base">Name</Label>
          <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sonnets" className="text-base" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="deck-desc" className="text-base">Description (optional)</Label>
          <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="text-base min-h-[100px]" />
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" type="button" onClick={() => navigate('/')} className="min-h-[44px]">Cancel</Button>
          <Button type="submit" className="min-h-[44px]">Create</Button>
        </div>
      </form>
    </div>
  )
}
