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
    <div className="max-w-xl mx-auto space-y-6 px-3 sm:px-4 md:px-0">
      <BackBar to={mode === 'card' ? '/' : `/decks/${deckId}`} title="Study Options" />
      <p className="text-base sm:text-lg text-muted-foreground animate-in fade-in-0 slide-in-from-top-2 duration-300 leading-relaxed">Choose optional assistance for this session. Settings apply only to this run.</p>

      <Reveal as="div" className="grid gap-5 playing-card p-5 sm:p-6" delay={60}>
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
        <Button onClick={start} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 w-full sm:w-auto min-h-[44px] text-base">Start</Button>
      </div>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" className="mt-1 w-5 h-5 cursor-pointer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block font-medium text-base sm:text-lg">{label}</span>
        <span className="block text-sm sm:text-base text-muted-foreground leading-relaxed">{description}</span>
      </span>
    </label>
  )
}
