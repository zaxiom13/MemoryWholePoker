import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Download, Upload } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import ConfirmModal from '@/components/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/Toaster'
import { useData } from '@/contexts/DataContext'
import { setPrefs, usePrefs } from '@/lib/prefs'
import { HANDS } from '@/lib/scoring'
import { parseImport, serializeExport } from '@/lib/storage'
import type { AppStateShape } from '@/types'

export default function AboutPage() {
  const { state, importData, resetAll } = useData()
  const prefs = usePrefs()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [pending, setPending] = useState<AppStateShape | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  function onExport() {
    const blob = new Blob([serializeExport(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memorywholed-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast({ kind: 'success', message: 'Backup downloaded.' })
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 10_000_000) throw new Error('That file is too large.')
      setPending(parseImport(await file.text()))
    } catch (err) {
      toast({ kind: 'error', message: err instanceof Error ? err.message : 'Could not read that file.' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function applyImport(mode: 'merge' | 'replace') {
    if (!pending) return
    const added = importData(pending, mode)
    setPending(null)
    toast({ kind: 'success', message: mode === 'replace' ? `Restored ${added.decks} decks.` : `Added ${added.decks} decks and ${added.cards} cards.` })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader back="/" backLabel="Decks" title="How to play" />

      <Section title="The game" suit="♠">
        <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-muted-foreground">
          <li>Each card has a <strong>prompt</strong> and the <strong>text</strong> you want to know by heart.</li>
          <li>Pick your house rules, then type the text from memory. Correct letters lock in; a wrong letter shows in red until you delete it.</li>
          <li>Stuck? Take a <strong>hint</strong> (the 💡 button, or <Kbd>Tab</Kbd>) to fill in the next word. Hints cost you, but less than giving up.</li>
          <li>Finish to be dealt a poker hand based on your accuracy and hints, and win chips. Play daily to build a streak.</li>
        </ol>
      </Section>

      <Section title="Hand rankings" suit="♥">
        <p className="mb-3 text-sm text-muted-foreground">Helpers never lower your score, they cap the best hand you can reach. A Royal Flush needs a perfect run with no help at all.</p>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {HANDS.map((h) => (
            <li key={h.id} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <span className="w-24 shrink-0 font-display tracking-tight">
                {h.cards.map((c, i) => (
                  <span key={i} className={/[♥♦]/.test(c) ? 'text-suit-red' : ''}>
                    {c.slice(-1)}
                  </span>
                ))}
              </span>
              <span className="flex-1 font-semibold">{h.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">×{h.mult}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Settings" suit="♣">
        <div className="divide-y">
          <SettingRow label="Sound effects" description="Soft clicks, chimes and chip sounds.">
            <Switch checked={prefs.sound} onCheckedChange={(sound) => setPrefs({ sound })} aria-label="Sound effects" />
          </SettingRow>
          <SettingRow label="Vibration" description="A small buzz on mistakes (supported phones only).">
            <Switch checked={prefs.haptics} onCheckedChange={(haptics) => setPrefs({ haptics })} aria-label="Vibration" />
          </SettingRow>
          <SettingRow label="Hide answers in decks" description="Blur card text in deck view so you don't peek. Tap a card to reveal.">
            <Switch checked={prefs.hideAnswers} onCheckedChange={(hideAnswers) => setPrefs({ hideAnswers })} aria-label="Hide answers in decks" />
          </SettingRow>
        </div>
      </Section>

      <Section title="Your data" suit="♦">
        <p className="mb-4 text-sm text-muted-foreground">
          Everything is stored on this device only. Export a backup to move it to another device or keep it safe.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download /> Export backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload /> Import backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <Button variant="ghost" asChild>
            <Link to="/library">Deck library</Link>
          </Button>
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmReset(true)}>
            Erase everything
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground tabular-nums">
          {state.decks.length} decks · {state.cards.length} cards · {state.records.length} records
        </p>
      </Section>

      <ConfirmModal
        open={pending != null}
        onOpenChange={(open) => !open && setPending(null)}
        title="Import backup"
        description={pending ? `This file has ${pending.decks.length} decks and ${pending.cards.length} cards. Merge them with what you have, or replace everything?` : ''}
        confirmLabel="Merge"
        onConfirm={() => applyImport('merge')}
        secondary={{ label: 'Replace all', onClick: () => applyImport('replace'), destructive: true }}
      />
      <ConfirmModal
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Erase everything?"
        description="All decks, cards, times and chips on this device will be deleted. Consider exporting a backup first."
        confirmLabel="Erase"
        destructive
        onConfirm={() => {
          resetAll()
          setConfirmReset(false)
          toast({ message: 'All data erased.' })
        }}
      />
    </div>
  )
}

function Section({ title, suit, children }: { title: string; suit: string; children: ReactNode }) {
  return (
    <section className="playing-card p-5 sm:p-7" data-suit={suit}>
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function SettingRow({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      {children}
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-b-2 bg-card px-1.5 py-0.5 font-mono text-xs">{children}</kbd>
}
