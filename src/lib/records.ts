import type { HandId, TimeRecord } from '@/types'
import { handIndex } from '@/lib/scoring'

/** Best (highest-ranked) hand among records for a card or deck. */
export function bestHand(records: TimeRecord[], scope: 'card' | 'deck', scopeId: string): HandId | undefined {
  let best: HandId | undefined
  for (const r of records) {
    if (r.scope !== scope || r.scopeId !== scopeId || !r.hand) continue
    if (!best || handIndex(r.hand) < handIndex(best)) best = r.hand
  }
  return best
}

export function bestTime(records: TimeRecord[], scope: 'card' | 'deck', scopeId: string): number | undefined {
  let best: number | undefined
  for (const r of records) {
    if (r.scope === scope && r.scopeId === scopeId && (best == null || r.elapsedMs < best)) best = r.elapsedMs
  }
  return best
}

export const SUITS = ['♠', '♥', '♣', '♦'] as const

/** Stable suit for an id, so a deck always wears the same pip. */
export function suitFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0
  return SUITS[Math.abs(h) % SUITS.length]
}
