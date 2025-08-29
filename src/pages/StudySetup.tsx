import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { AssistanceOptions } from '@/types'
import { defaultAssistance } from '@/types'
import BackBar from '@/components/BackBar'
import Reveal from '@/components/Reveal'

export default function StudySetup() {
  const navigate = useNavigate()
  const { cardId, deckId } = useParams()
  const mode = cardId ? 'card' : 'deck'
  const [opts, setOpts] = useState<AssistanceOptions>({ ...defaultAssistance })

  function start() {
    const base = mode === 'card' ? `/study/card/${cardId}` : `/study/deck/${deckId}`
    navigate(base, { state: { options: opts } })
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <BackBar to={mode === 'card' ? '/' : `/decks/${deckId}`} title="Study Options" />
      <p className="text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-top-2 duration-300">Choose optional assistance for this session. Settings apply only to this run.</p>

      <Reveal as="div" className="grid gap-3 playing-card p-4" delay={60}>
        <ToggleRow
          label="Ghost Text"
          description="Faintly show the next few characters inline as you type."
          checked={opts.ghostText}
          onChange={(v) => setOpts((o) => ({ ...o, ghostText: v }))}
        />
        <ToggleRow
          label="See Full Text"
          description="Display the entire prose for reference during typing."
          checked={opts.fullText}
          onChange={(v) => setOpts((o) => ({ ...o, fullText: v }))}
        />
        <ToggleRow
          label="Autocorrect"
          description="Ignore case mismatches; auto-insert punctuation after a correct preceding character."
          checked={opts.autocorrect}
          onChange={(v) => setOpts((o) => ({ ...o, autocorrect: v }))}
        />
      </Reveal>

      <div>
        <Button onClick={start} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">Start</Button>
      </div>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}
