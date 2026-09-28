export type UUID = string

/** How much of the not-yet-typed text is visible while typing. */
export type RevealMode = 'none' | 'blanks' | 'initials' | 'full'

export type AssistanceOptions = {
  reveal: RevealMode
  /** Faintly show the next word after a short pause. */
  ghostText: boolean
  /** Lenient matching: ignore case/accents and auto-insert punctuation. */
  autocorrect: boolean
}

export type SessionOptions = AssistanceOptions & {
  shuffle: boolean
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

export type HandId =
  | 'royal-flush'
  | 'straight-flush'
  | 'four-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-kind'
  | 'two-pair'
  | 'pair'
  | 'high-card'

export type TimeRecord = {
  id: UUID
  scope: 'card' | 'deck'
  scopeId: UUID
  elapsedMs: number
  completedAt: number
  assistance: AssistanceOptions
  wpm?: number
  accuracy?: number
  hints?: number
  mistakes?: number
  hand?: HandId
}

export type Profile = {
  chips: number
  runs: number
  streak: number
  bestStreak: number
  /** Local calendar day (YYYY-MM-DD) of the last completed run. */
  lastPlayedDay: string | null
}

export type AppStateShape = {
  version: 2
  decks: Deck[]
  cards: Card[]
  records: TimeRecord[]
  profile: Profile
  /** True once demo decks were offered, so deleting everything doesn't re-seed. */
  seeded: boolean
}

export const defaultAssistance: AssistanceOptions = {
  reveal: 'none',
  ghostText: false,
  autocorrect: false,
}

export const defaultProfile: Profile = {
  chips: 0,
  runs: 0,
  streak: 0,
  bestStreak: 0,
  lastPlayedDay: null,
}
