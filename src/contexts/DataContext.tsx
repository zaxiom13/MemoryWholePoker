import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { storage } from '@/lib/storage'
import type { AppStateShape, AssistanceOptions, Card, Deck, TimeRecord, UUID } from '@/types'

type DataContextType = {
  state: AppStateShape
  createDeck: (input: { name: string; description?: string }) => Deck
  updateDeck: (id: UUID, input: { name?: string; description?: string }) => void
  deleteDeck: (id: UUID) => void

  createCard: (input: { deckId: UUID; title: string; content: string }) => Card
  updateCard: (id: UUID, input: { title?: string; content?: string }) => void
  deleteCard: (id: UUID) => void

  addTimeRecord: (input: { scope: 'card' | 'deck'; scopeId: UUID; elapsedMs: number; assistance: AssistanceOptions }) => void
  getBestTimes: (scope: 'card' | 'deck', scopeId: UUID) => TimeRecord[]
  loadDemoData: () => void
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppStateShape>(() => storage.load())

  useEffect(() => {
    storage.save(state)
  }, [state])

  // Seed sample decks/cards on first run (when no data exists)
  useEffect(() => {
    if (state.decks.length === 0 && state.cards.length === 0 && state.records.length === 0) {
      setState(buildDemoState())
    }
  }, [])

  function buildDemoState(): AppStateShape {
    const now = storage.now()
    const d1: Deck = { id: storage.uuid(), name: 'Sonnets & Verse', description: 'Short poems for memorization practice.', createdAt: now, updatedAt: now }
    const d2: Deck = { id: storage.uuid(), name: 'Famous Speeches', description: 'Iconic excerpts to rehearse.', createdAt: now, updatedAt: now }
    const cards: Card[] = [
      { id: storage.uuid(), deckId: d1.id, title: 'Sonnet 18 (opening)', content: "Shall I compare thee to a summer’s day?\nThou art more lovely and more temperate:", createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d1.id, title: 'If— (excerpt)', content: "If you can keep your head when all about you\nAre losing theirs and blaming it on you,", createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d2.id, title: 'I Have a Dream (excerpt)', content: "I have a dream that one day this nation will rise up and live out the true meaning of its creed.", createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d2.id, title: 'Their Finest Hour (excerpt)', content: "Let us therefore brace ourselves to our duties, and so bear ourselves that...", createdAt: now, updatedAt: now },
    ]
    return { decks: [d1, d2], cards, records: [] }
  }

  const createDeck: DataContextType['createDeck'] = useCallback((input) => {
    const now = storage.now()
    const deck: Deck = { id: storage.uuid(), name: input.name.trim(), description: input.description?.trim(), createdAt: now, updatedAt: now }
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
    setState((s) => ({
      decks: s.decks.filter((d) => d.id !== id),
      cards: s.cards.filter((c) => c.deckId !== id),
      records: s.records.filter((r) => !(r.scope === 'deck' && r.scopeId === id) && !s.cards.some((c) => c.deckId === id && r.scope === 'card' && r.scopeId === c.id)),
    }))
  }, [])

  const createCard: DataContextType['createCard'] = useCallback((input) => {
    const now = storage.now()
    const card: Card = { id: storage.uuid(), deckId: input.deckId, title: input.title.trim(), content: input.content, createdAt: now, updatedAt: now }
    setState((s) => ({
      ...s,
      cards: [...s.cards, card],
      // Adding a card invalidates best deck times for this deck
      records: s.records.filter((r) => !(r.scope === 'deck' && r.scopeId === input.deckId)),
    }))
    return card
  }, [])

  const updateCard: DataContextType['updateCard'] = useCallback((id, input) => {
    setState((s) => {
      const existing = s.cards.find((c) => c.id === id)
      const deckId = existing?.deckId
      const cards = s.cards.map((c) => (c.id === id ? { ...c, ...input, updatedAt: storage.now() } : c))
      // Changing a card's title/content (or moving deck) invalidates best deck times for that deck
      const records = deckId ? s.records.filter((r) => !(r.scope === 'deck' && r.scopeId === deckId)) : s.records
      return { ...s, cards, records }
    })
  }, [])

  const deleteCard: DataContextType['deleteCard'] = useCallback((id) => {
    setState((s) => {
      const existing = s.cards.find((c) => c.id === id)
      const deckId = existing?.deckId
      const cards = s.cards.filter((c) => c.id !== id)
      let records = s.records.filter((r) => !(r.scope === 'card' && r.scopeId === id))
      if (deckId) {
        // Removing a card invalidates best deck times for that deck
        records = records.filter((r) => !(r.scope === 'deck' && r.scopeId === deckId))
      }
      return { ...s, cards, records }
    })
  }, [])

  const addTimeRecord: DataContextType['addTimeRecord'] = useCallback(({ scope, scopeId, elapsedMs, assistance }) => {
    const rec: TimeRecord = { id: storage.uuid(), scope, scopeId, elapsedMs, assistance, completedAt: storage.now() }
    setState((s) => {
      const records = [...s.records, rec]
      // maintain top 3 per scope/scopeId
      const byKey = (r: TimeRecord) => r.scope === scope && r.scopeId === scopeId
      const top = records.filter(byKey).sort((a, b) => a.elapsedMs - b.elapsedMs).slice(0, 3)
      const others = records.filter((r) => !byKey(r))
      return { ...s, records: [...others, ...top] }
    })
  }, [])

  const getBestTimes: DataContextType['getBestTimes'] = useCallback((scope, scopeId) => {
    return state.records
      .filter((r) => r.scope === scope && r.scopeId === scopeId)
      .sort((a, b) => a.elapsedMs - b.elapsedMs)
      .slice(0, 3)
  }, [state.records])

  const loadDemoData: DataContextType['loadDemoData'] = useCallback(() => {
    const demo = buildDemoState()
    setState((s) => {
      // Only add demo decks that are missing (by name). If a deck name exists, skip its cards too.
      const existingNames = new Set(s.decks.map((d) => d.name.trim().toLowerCase()))
      const decksToAdd = demo.decks.filter((d) => !existingNames.has(d.name.trim().toLowerCase()))
      if (decksToAdd.length === 0) return s
      const newDeckIds = new Set(decksToAdd.map((d) => d.id))
      const cardsToAdd = demo.cards.filter((c) => newDeckIds.has(c.deckId))
      return {
        ...s,
        decks: [...s.decks, ...decksToAdd],
        cards: [...s.cards, ...cardsToAdd],
      }
    })
  }, [])

  const value = useMemo(
    () => ({ state, createDeck, updateDeck, deleteDeck, createCard, updateCard, deleteCard, addTimeRecord, getBestTimes, loadDemoData }),
    [state, createDeck, updateDeck, deleteDeck, createCard, updateCard, deleteCard, addTimeRecord, getBestTimes, loadDemoData]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
