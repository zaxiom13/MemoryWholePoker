export type UUID = string

export type AssistanceOptions = {
  ghostText: boolean
  fullText: boolean
  autocorrect: boolean
}

export type Deck = {
  id: UUID
  name: string
  description?: string
  createdAt: number
  updatedAt: number
}

export type Card = {
  id: UUID
  deckId: UUID
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export type TimeRecord = {
  id: UUID
  scope: 'card' | 'deck'
  scopeId: UUID
  elapsedMs: number
  completedAt: number
  assistance: AssistanceOptions
}

export type AppStateShape = {
  decks: Deck[]
  cards: Card[]
  records: TimeRecord[]
}

export const defaultAssistance: AssistanceOptions = {
  ghostText: false,
  fullText: false,
  autocorrect: false,
}

