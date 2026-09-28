import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import DeckForm from '@/components/DeckForm'
import { useData } from '@/contexts/DataContext'

export default function NewDeckPage() {
  const { createDeck } = useData()
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader back="/" backLabel="Decks" title="New deck" />
      <DeckForm
        submitLabel="Create deck"
        onCancel={() => navigate('/')}
        onSubmit={(draft) => {
          const deck = createDeck(draft)
          navigate(`/decks/${deck.id}/cards/new`, { replace: true })
        }}
      />
    </div>
  )
}
