import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { STORAGE_KEY, emptyState, nextStreak, storage } from '@/lib/storage'
import { CLASSIC_PACKS, buildDemoState, packToDeck } from '@/lib/demoData'
import { deckForPack, type Pack } from '@/lib/library'
import type { AppStateShape, Card, Deck, TimeRecord, UUID } from '@/types'

/** What was removed by a delete, so it can be undone. */
export type Snapshot = { decks: Deck[]; cards: Card[]; records: TimeRecord[] }

type NewRecord = Omit<TimeRecord, 'id' | 'completedAt'>

type DataContextType = {
  state: AppStateShape
  storageError: string | null

  createDeck: (input: { name: string; description?: string }) => Deck
  updateDeck: (id: UUID, input: { name?: string; description?: string }) => void
  deleteDeck: (id: UUID) => Snapshot

  createCard: (input: { deckId: UUID; title: string; content: string }) => Card
  createCards: (deckId: UUID, cards: Array<{ title: string; content: string }>) => Card[]
  updateCard: (id: UUID, input: { title?: string; content?: string }) => void
  deleteCard: (id: UUID) => Snapshot

  restore: (snapshot: Snapshot) => void

  addTimeRecord: (input: NewRecord) => TimeRecord
  getBestTimes: (scope: 'card' | 'deck', scopeId: UUID) => TimeRecord[]
  completeRun: (input: { chips: number }) => void

  loadDemoData: () => void
  /** Adds library packs that aren't already on the table. Returns the decks added. */
  addPacks: (packs: Pack[]) => Deck[]
  importData: (incoming: AppStateShape, mode: 'merge' | 'replace') => { decks: number; cards: number }
  resetAll: () => void
}

/** Best times kept per card / deck. */
const KEEP_RECORDS = 5

const DataContext = createContext<DataContextType | null>(null)

function initialState(): AppStateShape {
  const loaded = storage.load()
  if (loaded.seeded) return loaded
  // First visit: deal some demo decks so there's something to play right away.
  return { ...loaded, ...buildDemoState(), seeded: true }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppStateShape>(initialState)
  const [storageError, setStorageError] = useState<string | null>(null)
  const skipNextSave = useRef(false)
  // Latest committed state, for actions that need to report what they changed.
  const stateRef = useRef(state)

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setStorageError(storage.save(state))
  }, [state])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue == null) return
      skipNextSave.current = true
      setState(storage.load())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const createDeck: DataContextType['createDeck'] = useCallback((input) => {
    const now = storage.now()
    const description = input.description?.trim()
    const deck: Deck = { id: storage.uuid(), name: input.name.trim(), description: description || undefined, createdAt: now, updatedAt: now }
    setState((s) => ({ ...s, decks: [...s.decks, deck] }))
    return deck
  }, [])

  const updateDeck: DataContextType['updateDeck'] = useCallback((id, input) => {
    setState((s) => ({
      ...s,
      decks: s.decks.map((d) => (d.id === id ? { ...d, ...input, updatedAt: storage.now() } : d)),
    }))
  }, [])

  const deleteDeck: DataContextType['deleteDeck'] = useCallback((id) => {
    const s = stateRef.current
    const cardIds = new Set(s.cards.filter((c) => c.deckId === id).map((c) => c.id))
    const isGone = (r: TimeRecord) => (r.scope === 'deck' && r.scopeId === id) || (r.scope === 'card' && cardIds.has(r.scopeId))
    const snapshot: Snapshot = {
      decks: s.decks.filter((d) => d.id === id),
      cards: s.cards.filter((c) => cardIds.has(c.id)),
      records: s.records.filter(isGone),
    }
    setState((cur) => ({
      ...cur,
      decks: cur.decks.filter((d) => d.id !== id),
      cards: cur.cards.filter((c) => c.deckId !== id),
      records: cur.records.filter((r) => !isGone(r)),
    }))
    return snapshot
  }, [])

  const createCards: DataContextType['createCards'] = useCallback((deckId, inputs) => {
    const now = storage.now()
    const cards: Card[] = inputs
      .filter((c) => c.content.trim())
      .map((c, i) => ({ id: storage.uuid(), deckId, title: c.title.trim() || 'Untitled', content: c.content.trim(), createdAt: now + i, updatedAt: now }))
    if (cards.length === 0) return []
    setState((s) => ({
      ...s,
      cards: [...s.cards, ...cards],
      // A deck time only means something for the exact set of cards it was set with.
      records: s.records.filter((r) => !(r.scope === 'deck' && r.scopeId === deckId)),
    }))
    return cards
  }, [])

  const createCard: DataContextType['createCard'] = useCallback(
    (input) => createCards(input.deckId, [input])[0],
    [createCards]
  )

  const updateCard: DataContextType['updateCard'] = useCallback((id, input) => {
    setState((s) => {
      const existing = s.cards.find((c) => c.id === id)
      if (!existing) return s
      const contentChanged = input.content != null && input.content !== existing.content
      const cards = s.cards.map((c) => (c.id === id ? { ...c, ...input, updatedAt: storage.now() } : c))
      const records = contentChanged
        ? s.records.filter((r) => !(r.scope === 'card' && r.scopeId === id) && !(r.scope === 'deck' && r.scopeId === existing.deckId))
        : s.records
      return { ...s, cards, records }
    })
  }, [])

  const deleteCard: DataContextType['deleteCard'] = useCallback((id) => {
    const existing = stateRef.current.cards.find((c) => c.id === id)
    if (!existing) return { decks: [], cards: [], records: [] }
    const isGone = (r: TimeRecord) => (r.scope === 'card' && r.scopeId === id) || (r.scope === 'deck' && r.scopeId === existing.deckId)
    const snapshot: Snapshot = { decks: [], cards: [existing], records: stateRef.current.records.filter(isGone) }
    setState((cur) => ({ ...cur, cards: cur.cards.filter((c) => c.id !== id), records: cur.records.filter((r) => !isGone(r)) }))
    return snapshot
  }, [])

  const restore: DataContextType['restore'] = useCallback((snap) => {
    setState((s) => {
      const deckIds = new Set(s.decks.map((d) => d.id))
      const cardIds = new Set(s.cards.map((c) => c.id))
      const recordIds = new Set(s.records.map((r) => r.id))
      return {
        ...s,
        decks: [...s.decks, ...snap.decks.filter((d) => !deckIds.has(d.id))],
        cards: [...s.cards, ...snap.cards.filter((c) => !cardIds.has(c.id))].sort((a, b) => a.createdAt - b.createdAt),
        records: [...s.records, ...snap.records.filter((r) => !recordIds.has(r.id))],
      }
    })
  }, [])

  const addTimeRecord: DataContextType['addTimeRecord'] = useCallback((input) => {
    const rec: TimeRecord = { ...input, id: storage.uuid(), completedAt: storage.now() }
    setState((s) => {
      const same = (r: TimeRecord) => r.scope === rec.scope && r.scopeId === rec.scopeId
      const top = [...s.records.filter(same), rec].sort((a, b) => a.elapsedMs - b.elapsedMs).slice(0, KEEP_RECORDS)
      return { ...s, records: [...s.records.filter((r) => !same(r)), ...top] }
    })
    return rec
  }, [])

  const getBestTimes: DataContextType['getBestTimes'] = useCallback(
    (scope, scopeId) =>
      state.records
        .filter((r) => r.scope === scope && r.scopeId === scopeId)
        .sort((a, b) => a.elapsedMs - b.elapsedMs),
    [state.records]
  )

  const completeRun: DataContextType['completeRun'] = useCallback(({ chips }) => {
    setState((s) => ({
      ...s,
      profile: { ...s.profile, ...nextStreak(s.profile), chips: s.profile.chips + Math.max(0, Math.round(chips)), runs: s.profile.runs + 1 },
    }))
  }, [])

  const addPacks: DataContextType['addPacks'] = useCallback((packs) => {
    const existing = stateRef.current.decks
    const now = storage.now()
    const built = packs.filter((p) => !deckForPack(existing, p)).map((p, i) => packToDeck(p, now + i * 1000))
    if (built.length === 0) return []
    setState((s) => {
      const fresh = built.filter((b) => !s.decks.some((d) => d.packId === b.deck.packId))
      return {
        ...s,
        decks: [...s.decks, ...fresh.map((b) => b.deck)],
        cards: [...s.cards, ...fresh.flatMap((b) => b.cards)],
      }
    })
    return built.map((b) => b.deck)
  }, [])

  const loadDemoData: DataContextType['loadDemoData'] = useCallback(() => {
    addPacks(CLASSIC_PACKS)
  }, [addPacks])

  const importData: DataContextType['importData'] = useCallback((incoming, mode) => {
    if (mode === 'replace') {
      setState({ ...incoming, seeded: true })
      return { decks: incoming.decks.length, cards: incoming.cards.length }
    }
    const cur = stateRef.current
    const deckIds = new Set(cur.decks.map((d) => d.id))
    const cardIds = new Set(cur.cards.map((c) => c.id))
    const decks = incoming.decks.filter((d) => !deckIds.has(d.id))
    const cards = incoming.cards.filter((c) => !cardIds.has(c.id))
    setState((s) => {
      const have = { decks: new Set(s.decks.map((d) => d.id)), cards: new Set(s.cards.map((c) => c.id)), records: new Set(s.records.map((r) => r.id)) }
      return {
        ...s,
        decks: [...s.decks, ...incoming.decks.filter((d) => !have.decks.has(d.id))],
        cards: [...s.cards, ...incoming.cards.filter((c) => !have.cards.has(c.id))],
        records: [...s.records, ...incoming.records.filter((r) => !have.records.has(r.id))],
      }
    })
    return { decks: decks.length, cards: cards.length }
  }, [])

  const resetAll: DataContextType['resetAll'] = useCallback(() => {
    setState({ ...emptyState(), seeded: true })
  }, [])

  const value = useMemo(
    () => ({
      state,
      storageError,
      createDeck,
      updateDeck,
      deleteDeck,
      createCard,
      createCards,
      updateCard,
      deleteCard,
      restore,
      addTimeRecord,
      getBestTimes,
      completeRun,
      loadDemoData,
      addPacks,
      importData,
      resetAll,
    }),
    [state, storageError, createDeck, updateDeck, deleteDeck, createCard, createCards, updateCard, deleteCard, restore, addTimeRecord, getBestTimes, completeRun, loadDemoData, addPacks, importData, resetAll]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
