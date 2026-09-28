import { Link } from 'react-router-dom'
import { Check, Library, Plus } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/Toaster'
import { useData } from '@/contexts/DataContext'
import { CLASSIC_PACKS } from '@/lib/demoData'
import { LEARNKIT_PACKS, deckForPack, learnkitCourses, type Pack } from '@/lib/library'
import { setPrefs } from '@/lib/prefs'

export default function LibraryPage() {
  const { state, addPacks } = useData()
  const toast = useToast()
  const missingLearnkit = LEARNKIT_PACKS.filter((p) => !deckForPack(state.decks, p))

  function add(packs: Pack[]) {
    const added = addPacks(packs)
    setPrefs({ libraryHintDismissed: true })
    if (added.length === 0) return
    const cards = packs.filter((p) => added.some((d) => d.packId === p.id)).reduce((n, p) => n + p.cards.length, 0)
    toast({ kind: 'success', message: added.length === 1 ? `Added “${added[0].name}” (${cards} cards).` : `Added ${added.length} decks (${cards} cards).` })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back="/" backLabel="Decks" title="Deck library" subtitle="Ready-made decks to add to your table. Adding makes your own copy, so edit freely." />

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h2 className="flex items-center gap-2 text-2xl font-semibold">
              <Library className="size-5 text-gold" /> From LearnKit
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each course gives you its <strong className="text-foreground">key ideas</strong> (one passage per lesson) and its <strong className="text-foreground">terms</strong> (flashcards: type the definition).
            </p>
          </div>
          {missingLearnkit.length > 0 && (
            <Button size="sm" onClick={() => add(missingLearnkit)}>
              <Plus /> Add all {missingLearnkit.length}
            </Button>
          )}
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {learnkitCourses().map((c, i) => (
            <li key={c.course} className="playing-card deal-in min-w-0 p-4" style={{ '--i': i } as React.CSSProperties}>
              <h3 className="flex items-center gap-2 text-lg font-semibold leading-snug">
                <span aria-hidden>{c.icon}</span>
                {c.title}
              </h3>
              <ul className="mt-2 divide-y">
                {c.packs.map((p) => (
                  <PackRow key={p.id} pack={p} label={p.name.endsWith(': terms') ? 'Terms' : 'Key ideas'} onAdd={() => add([p])} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Classics</h2>
        <ul className="playing-card divide-y px-4 py-1">
          {CLASSIC_PACKS.map((p) => (
            <PackRow key={p.id} pack={p} label={p.name} onAdd={() => add([p])} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function PackRow({ pack, label, onAdd }: { pack: Pack; label: string; onAdd: () => void }) {
  const { state } = useData()
  const deck = deckForPack(state.decks, pack)
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{label}</div>
        <div className="truncate text-sm text-muted-foreground">
          {pack.cards.length} cards · {pack.cards.slice(0, 3).map(([t]) => t).join(', ')}
        </div>
      </div>
      {deck ? (
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/decks/${deck.id}`}>
            <Check className="text-success" /> Open
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={onAdd} aria-label={`Add ${pack.name}`}>
          <Plus /> Add
        </Button>
      )}
    </li>
  )
}
