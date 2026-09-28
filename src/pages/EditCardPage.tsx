import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import CardForm from '@/components/CardForm'
import { useData } from '@/contexts/DataContext'
import { useToast } from '@/components/Toaster'

export default function EditCardPage() {
  const { cardId } = useParams()
  const { state, updateCard } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const card = state.cards.find((c) => c.id === cardId)
  const deck = card ? state.decks.find((d) => d.id === card.deckId) : undefined

  if (!card) return <PageHeader back="/" backLabel="Decks" title="Card not found" />
  const back = `/decks/${card.deckId}`

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader back={back} backLabel={deck?.name ?? 'Deck'} title="Edit card" />
      <CardForm
        key={card.id}
        initial={{ title: card.title, content: card.content }}
        submitLabel="Save"
        onCancel={() => navigate(back)}
        onSubmit={(draft) => {
          const hadTimes = draft.content !== card.content && state.records.some((r) => r.scope === 'card' && r.scopeId === card.id)
          updateCard(card.id, draft)
          toast({ kind: 'success', message: hadTimes ? 'Card saved. Its best times were reset since the text changed.' : 'Card saved.' })
          navigate(back)
        }}
      />
    </div>
  )
}
