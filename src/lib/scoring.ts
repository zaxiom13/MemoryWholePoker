import type { AssistanceOptions, HandId } from '@/types'

export type Hand = {
  id: HandId
  name: string
  /** Minimum quality score (0-100) needed. */
  min: number
  /** Chip multiplier. */
  mult: number
  /** Display cards for the results screen. */
  cards: string[]
}

// Best to worst. Quality is accuracy minus a penalty for hints.
export const HANDS: Hand[] = [
  { id: 'royal-flush', name: 'Royal Flush', min: 100, mult: 10, cards: ['A♠', 'K♠', 'Q♠', 'J♠', '10♠'] },
  { id: 'straight-flush', name: 'Straight Flush', min: 97, mult: 7, cards: ['9♥', '8♥', '7♥', '6♥', '5♥'] },
  { id: 'four-kind', name: 'Four of a Kind', min: 93, mult: 5, cards: ['Q♠', 'Q♥', 'Q♦', 'Q♣', '7♦'] },
  { id: 'full-house', name: 'Full House', min: 88, mult: 4, cards: ['J♣', 'J♦', 'J♥', '4♠', '4♣'] },
  { id: 'flush', name: 'Flush', min: 82, mult: 3, cards: ['K♦', '10♦', '7♦', '5♦', '2♦'] },
  { id: 'straight', name: 'Straight', min: 75, mult: 2.5, cards: ['8♣', '7♦', '6♠', '5♥', '4♣'] },
  { id: 'three-kind', name: 'Three of a Kind', min: 66, mult: 2, cards: ['7♠', '7♥', '7♣', 'K♦', '2♠'] },
  { id: 'two-pair', name: 'Two Pair', min: 55, mult: 1.5, cards: ['9♠', '9♦', '5♥', '5♣', 'A♠'] },
  { id: 'pair', name: 'Pair', min: 40, mult: 1.25, cards: ['6♥', '6♣', 'K♠', '8♦', '3♣'] },
  { id: 'high-card', name: 'High Card', min: -Infinity, mult: 1, cards: ['A♦', 'J♣', '8♥', '5♠', '2♦'] },
]

export function handById(id: HandId | undefined): Hand | undefined {
  return id ? HANDS.find((h) => h.id === id) : undefined
}

export function handIndex(id: HandId) {
  return HANDS.findIndex((h) => h.id === id)
}

/**
 * The best hand reachable with a given amount of help. Assistance doesn't
 * reduce your score, it lowers the ceiling, so easier modes are still fun but
 * the top hands need a clean, unassisted run.
 */
export function assistanceCap(options: AssistanceOptions): number {
  let cap = 0
  if (options.autocorrect) cap = Math.max(cap, 1)
  if (options.ghostText) cap = Math.max(cap, 2)
  if (options.reveal === 'blanks') cap = Math.max(cap, 2)
  if (options.reveal === 'initials') cap = Math.max(cap, 3)
  if (options.reveal === 'full') cap = Math.max(cap, 5)
  return cap
}

export type RunStats = {
  chars: number
  words: number
  elapsedMs: number
  mistakes: number
  hints: number
}

export function wordsPerMinute(chars: number, elapsedMs: number) {
  if (elapsedMs <= 0) return 0
  return Math.round((chars / 5) / (elapsedMs / 60_000))
}

export function accuracyPct(chars: number, mistakes: number) {
  if (chars <= 0) return 100
  return Math.round((chars / (chars + mistakes)) * 1000) / 10
}

export function qualityScore(stats: RunStats) {
  const accuracy = accuracyPct(stats.chars, stats.mistakes)
  const hintShare = stats.words > 0 ? stats.hints / stats.words : 0
  return Math.max(0, accuracy - hintShare * 150)
}

export function rankHand(stats: RunStats, options: AssistanceOptions): Hand {
  const quality = qualityScore(stats)
  const perfect = stats.mistakes === 0 && stats.hints === 0
  let idx = HANDS.findIndex((h) => quality >= h.min && (h.id !== 'royal-flush' || perfect))
  idx = Math.max(idx, assistanceCap(options))
  return HANDS[idx]
}

export function chipsFor(stats: RunStats, hand: Hand, isPersonalBest: boolean) {
  const base = Math.max(1, stats.chars / 12)
  return Math.round(base * hand.mult) + (isPersonalBest ? 25 : 0)
}

export function formatTime(ms: number) {
  const totalTenths = Math.floor(ms / 100)
  const tenths = totalTenths % 10
  const total = Math.floor(totalTenths / 10)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}.${tenths}`
}
