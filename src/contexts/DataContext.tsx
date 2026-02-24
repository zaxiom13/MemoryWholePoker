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
  }, [state.cards.length, state.decks.length, state.records.length])

  function buildDemoState(): AppStateShape {
    const now = storage.now()
    const d1: Deck = { id: storage.uuid(), name: 'Scientific Reasoning', description: 'Core ideas in logic, evidence, and inference.', createdAt: now, updatedAt: now }
    const d2: Deck = { id: storage.uuid(), name: 'World History Milestones', description: 'Turning points that reshaped institutions and ideas.', createdAt: now, updatedAt: now }
    const d3: Deck = { id: storage.uuid(), name: 'Constitutional Government', description: 'Key principles behind modern democratic systems.', createdAt: now, updatedAt: now }
    const d4: Deck = { id: storage.uuid(), name: 'Economics in One Page', description: 'High-leverage concepts from micro and macroeconomics.', createdAt: now, updatedAt: now }
    const cards: Card[] = [
      { id: storage.uuid(), deckId: d1.id, title: 'Falsifiability', content: 'A scientific claim must be testable in a way that could prove it wrong, not only confirm it.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d1.id, title: 'Null and Alternative Hypotheses', content: 'The null hypothesis states no effect or no difference; evidence must be strong enough to reject it in favor of an alternative.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d1.id, title: 'Correlation vs Causation', content: 'Correlation shows variables move together. Causation means one variable produces change in another; this requires stronger evidence.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d1.id, title: 'Bayes Rule (plain language)', content: 'Update your belief by combining prior probability with new evidence, weighted by how likely that evidence is under each explanation.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d1.id, title: 'Occams Razor', content: 'Among explanations that fit the facts, prefer the one with the fewest unnecessary assumptions.', createdAt: now, updatedAt: now },

      { id: storage.uuid(), deckId: d2.id, title: 'Magna Carta (1215)', content: 'Limited royal power and advanced the principle that rulers are subject to law.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d2.id, title: 'Printing Press (15th century)', content: 'Cheap reproduction of texts accelerated literacy, scholarship, and religious and political debate.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d2.id, title: 'Peace of Westphalia (1648)', content: 'Helped establish the norm of state sovereignty and non-interference in domestic affairs.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d2.id, title: 'Industrial Revolution', content: 'Mechanization and fossil-fuel energy drove productivity growth, urbanization, and major social transformation.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d2.id, title: 'Fall of the Berlin Wall (1989)', content: 'Symbolized the collapse of communist regimes in Eastern Europe and the approaching end of the Cold War.', createdAt: now, updatedAt: now },

      { id: storage.uuid(), deckId: d3.id, title: 'Separation of Powers', content: 'Government authority is split among legislative, executive, and judicial branches to reduce concentration of power.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d3.id, title: 'Checks and Balances', content: 'Each branch has tools to constrain the others, such as vetoes, judicial review, and legislative oversight.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d3.id, title: 'Federalism', content: 'Sovereign authority is divided between national and subnational governments with distinct responsibilities.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d3.id, title: 'Due Process', content: 'The state must follow fair procedures and respect legal rights before depriving anyone of life, liberty, or property.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d3.id, title: 'Rule of Law', content: 'Laws govern both citizens and leaders, and legal rules are applied predictably rather than by arbitrary power.', createdAt: now, updatedAt: now },

      { id: storage.uuid(), deckId: d4.id, title: 'Opportunity Cost', content: 'The true cost of a choice is the value of the best alternative you give up.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d4.id, title: 'Comparative Advantage', content: 'Trade benefits parties when each specializes in what they produce at lower opportunity cost.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d4.id, title: 'Marginal Analysis', content: 'Good decisions compare additional benefit with additional cost at the margin, not total averages.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d4.id, title: 'Inflation', content: 'A sustained rise in the general price level reduces purchasing power; real values adjust nominal values for inflation.', createdAt: now, updatedAt: now },
      { id: storage.uuid(), deckId: d4.id, title: 'Monetary vs Fiscal Policy', content: 'Monetary policy uses interest rates and money conditions; fiscal policy uses taxes and public spending.', createdAt: now, updatedAt: now },
    ]
    return { decks: [d1, d2, d3, d4], cards, records: [] }
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

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

