import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import DeckForm from '@/components/DeckForm'
import { useData } from '@/contexts/DataContext'
import { useToast } from '@/components/Toaster'

export default function EditDeckPage() {
  const { deckId } = useParams()
  const { state, updateDeck } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const deck = state.decks.find((d) => d.id === deckId)

  if (!deck) return <PageHeader back="/" backLabel="Decks" title="Deck not found" />

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader back={`/decks/${deck.id}`} backLabel={deck.name} title="Edit deck" />
      <DeckForm
        key={deck.id}
        initial={{ name: deck.name, description: deck.description ?? '' }}
        submitLabel="Save"
        onCancel={() => navigate(`/decks/${deck.id}`)}
        onSubmit={(draft) => {
          updateDeck(deck.id, { name: draft.name, description: draft.description || undefined })
          toast({ kind: 'success', message: 'Deck saved.' })
          navigate(`/decks/${deck.id}`)
        }}
      />
    </div>
  )
}
