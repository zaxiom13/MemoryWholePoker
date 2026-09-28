import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ghost, Play, Shuffle, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Segmented } from '@/components/ui/segmented'
import PageHeader from '@/components/PageHeader'
import { useData } from '@/contexts/DataContext'
import { getPrefs, sessionToParams, setPrefs } from '@/lib/prefs'
import { HANDS, assistanceCap } from '@/lib/scoring'
import { isWhitespace, isWordChar, wordInitials } from '@/lib/studyInput'
import type { RevealMode, SessionOptions } from '@/types'

const REVEAL_OPTIONS: Array<{ value: RevealMode; label: string; description: string }> = [
  { value: 'none', label: 'None', description: 'Pure recall. Nothing is shown ahead of your cursor.' },
  { value: 'blanks', label: 'Blanks', description: 'See the shape of each word, but none of its letters.' },
  { value: 'initials', label: 'Initials', description: 'First letter of every word: a classic memorization technique.' },
  { value: 'full', label: 'Full', description: 'Type over the full text. Great for a first read-through.' },
]

const SAMPLE = 'To be, or not to be, that is the question.'

export default function StudySetup() {
  const navigate = useNavigate()
  const { cardId, deckId } = useParams()
  const { state } = useData()
  const mode = cardId ? 'card' : deckId ? 'deck' : 'all'
  const [opts, setOpts] = useState<SessionOptions>(() => getPrefs().session)

  const card = cardId ? state.cards.find((c) => c.id === cardId) : undefined
  const deck = deckId ? state.decks.find((d) => d.id === deckId) : card ? state.decks.find((d) => d.id === card.deckId) : undefined
  const count = mode === 'card' ? 1 : mode === 'deck' ? state.cards.filter((c) => c.deckId === deckId).length : state.cards.length
  const backTo = deck ? `/decks/${deck.id}` : '/'
  const cap = HANDS[assistanceCap(opts)]
  const sample = card?.content.split('\n')[0].slice(0, 80) || SAMPLE

  function update(patch: Partial<SessionOptions>) {
    setOpts((o) => ({ ...o, ...patch }))
  }

  function start() {
    setPrefs({ session: opts })
    const base = mode === 'card' ? `/study/card/${cardId}` : mode === 'deck' ? `/study/deck/${deckId}` : '/study/all'
    navigate(base + sessionToParams(opts))
  }

  if ((mode === 'card' && !card) || (mode === 'deck' && !deck)) {
    return <PageHeader back="/" title="Not found" subtitle="That card or deck no longer exists." />
  }

  const heading = mode === 'card' ? card!.title : mode === 'deck' ? deck!.name : 'Every deck'

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader back={backTo} title={heading} subtitle={`${count} card${count === 1 ? '' : 's'} · pick your house rules`} />

      <div className="playing-card space-y-6 p-5 sm:p-7" data-suit="♣">
        <section>
          <h2 className="mb-1 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground">Show ahead</h2>
          <Segmented label="Show ahead" value={opts.reveal} onChange={(reveal) => update({ reveal })} options={REVEAL_OPTIONS} className="mt-2" />
          <p className="mt-2 text-sm text-muted-foreground">{REVEAL_OPTIONS.find((o) => o.value === opts.reveal)?.description}</p>
          <RevealPreview text={sample} reveal={opts.reveal} />
        </section>

        <div className="space-y-1 border-t pt-4">
          <ToggleRow
            icon={<Ghost />}
            label="Ghost text"
            description="Pause for a moment and the next word fades in."
            checked={opts.ghostText}
            onChange={(ghostText) => update({ ghostText })}
          />
          <ToggleRow
            icon={<WandSparkles />}
            label="Lenient typing"
            description="Ignore capitals and accents; punctuation types itself. Handy on phones."
            checked={opts.autocorrect}
            onChange={(autocorrect) => update({ autocorrect })}
          />
          {mode !== 'card' && (
            <ToggleRow icon={<Shuffle />} label="Shuffle cards" description="Deal the cards in a random order." checked={opts.shuffle} onChange={(shuffle) => update({ shuffle })} />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
          <span className="text-muted-foreground">Best hand possible</span>
          <span className="font-semibold">
            <span className={cap.cards[0].match(/[♥♦]/) ? 'text-suit-red' : ''}>{cap.cards[0]}</span> {cap.name}
          </span>
        </div>
      </div>

      <div className="safe-bottom sticky bottom-0 z-10 -mx-4 mt-6 bg-gradient-to-t from-[var(--felt)] via-[color-mix(in_oklch,var(--felt)_85%,transparent)] to-transparent px-4 pt-6">
        <Button size="lg" className="w-full text-base" onClick={start} disabled={count === 0}>
          <Play className="fill-current" /> Deal me in
        </Button>
      </div>
    </div>
  )
}

function ToggleRow({ icon, label, description, checked, onChange }: { icon: ReactNode; label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = label.replace(/\s+/g, '-').toLowerCase()
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-primary [&_svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} id={`${id}-label`} className="block cursor-pointer font-semibold">
          {label}
        </label>
        <p id={`${id}-desc`} className="text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-labelledby={`${id}-label`} aria-describedby={`${id}-desc`} />
    </div>
  )
}

function RevealPreview({ text, reveal }: { text: string; reveal: RevealMode }) {
  const typed = Math.min(text.length, Math.max(6, text.indexOf(' ', 8)))
  const initials = useMemo(() => wordInitials(text), [text])
  const rest = text.slice(typed)
  return (
    <div className="study-type mt-3 rounded-xl border border-dashed px-4 py-3 !text-lg" aria-hidden>
      <span className="t-correct">{text.slice(0, typed)}</span>
      <span className="caret" />
      {reveal !== 'none' &&
        [...rest].map((ch, i) => {
          const k = typed + i
          if (isWhitespace(ch)) return <span key={k}>{ch}</span>
          const cls = reveal === 'full' || !isWordChar(ch) || (reveal === 'initials' && initials[k]) ? 't-hint' : 't-blank'
          return (
            <span key={k} className={cls}>
              {ch}
            </span>
          )
        })}
    </div>
  )
}
