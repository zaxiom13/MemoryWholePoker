import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { storage } from '@/lib/storage'
import type { AppStateShape } from '@/types'

const STORAGE_KEY = 'mw_state_v1'

function createState(): AppStateShape {
  return {
    decks: [{ id: 'deck-1', name: 'Deck', description: 'Desc', createdAt: 1, updatedAt: 1 }],
    cards: [{ id: 'card-1', deckId: 'deck-1', title: 'Card', content: 'Content', createdAt: 1, updatedAt: 1 }],
    records: [{ id: 'rec-1', scope: 'deck', scopeId: 'deck-1', elapsedMs: 1234, completedAt: 5, assistance: { ghostText: false, fullText: false, autocorrect: false } }],
  }
}

describe('storage', () => {
  let backingStore: Record<string, string>

  beforeEach(() => {
    backingStore = {}
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => backingStore[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          backingStore[key] = value
        }),
      },
    })
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        randomUUID: vi.fn(() => 'uuid-123'),
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads an empty state when nothing is stored', () => {
    expect(storage.load()).toEqual({ decks: [], cards: [], records: [] })
  })

  it('loads a previously saved state', () => {
    const state = createState()
    backingStore[STORAGE_KEY] = JSON.stringify(state)

    expect(storage.load()).toEqual(state)
  })

  it('falls back to an empty state for invalid JSON', () => {
    backingStore[STORAGE_KEY] = '{nope'

    expect(storage.load()).toEqual({ decks: [], cards: [], records: [] })
  })

  it('falls back to an empty state for malformed shapes', () => {
    backingStore[STORAGE_KEY] = JSON.stringify({ decks: [], cards: [] })

    expect(storage.load()).toEqual({ decks: [], cards: [], records: [] })
  })

  it('saves state back to localStorage', () => {
    const state = createState()

    storage.save(state)

    expect(backingStore[STORAGE_KEY]).toBe(JSON.stringify(state))
  })

  it('delegates uuid generation to crypto.randomUUID', () => {
    expect(storage.uuid()).toBe('uuid-123')
  })

  it('delegates timestamps to Date.now', () => {
    vi.spyOn(Date, 'now').mockReturnValue(4242)

    expect(storage.now()).toBe(4242)
  })
})
