import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import CardForm from '@/components/CardForm'
import { useData } from '@/contexts/DataContext'
import { useToast } from '@/components/Toaster'

export default function AddCardPage() {
  const { deckId } = useParams()
  const { state, createCard } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const deck = state.decks.find((d) => d.id === deckId)

  if (!deck) return <PageHeader back="/" backLabel="Decks" title="Deck not found" />
  const back = `/decks/${deck.id}`

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader back={back} backLabel={deck.name} title="New card" />
      <CardForm
        submitLabel="Add card"
        onCancel={() => navigate(back)}
        onSubmit={(draft) => {
          createCard({ deckId: deck.id, ...draft })
          navigate(back)
        }}
        onSubmitAnother={(draft) => {
          createCard({ deckId: deck.id, ...draft })
          toast({ kind: 'success', message: `Added “${draft.title || 'Untitled'}”.` })
        }}
      />
    </div>
  )
}
