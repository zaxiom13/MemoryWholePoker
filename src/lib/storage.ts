import type { AppStateShape, UUID } from '@/types'

const STORAGE_KEY = 'mw_state_v1'

function loadState(): AppStateShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { decks: [], cards: [], records: [] }
    const parsed = JSON.parse(raw) as AppStateShape
    if (!parsed.decks || !parsed.cards || !parsed.records) {
      return { decks: [], cards: [], records: [] }
    }
    return parsed
  } catch {
    return { decks: [], cards: [], records: [] }
  }
}

function saveState(state: AppStateShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const storage = {
  load: loadState,
  save: saveState,
  uuid(): UUID {
    // crypto.randomUUID is widely supported in modern browsers
    return crypto.randomUUID()
  },
  now(): number {
    return Date.now()
  },
}
