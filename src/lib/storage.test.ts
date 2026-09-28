import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, emptyState, nextStreak, normalizeState, parseImport, serializeExport, storage } from '@/lib/storage'
import type { AppStateShape } from '@/types'
import { defaultProfile } from '@/types'

function createState(): AppStateShape {
  return {
    version: 2,
    decks: [{ id: 'deck-1', name: 'Deck', description: 'Desc', createdAt: 1, updatedAt: 1 }],
    cards: [{ id: 'card-1', deckId: 'deck-1', title: 'Card', content: 'Content', createdAt: 1, updatedAt: 1 }],
    records: [{ id: 'rec-1', scope: 'deck', scopeId: 'deck-1', elapsedMs: 1234, completedAt: 5, assistance: { reveal: 'none', ghostText: false, autocorrect: false } }],
    profile: { ...defaultProfile, chips: 10 },
    seeded: true,
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads an empty state when nothing is stored', () => {
    expect(storage.load()).toEqual(emptyState())
  })

  it('round-trips a saved state', () => {
    const state = createState()
    expect(storage.save(state)).toBeNull()
    expect(storage.load()).toEqual(state)
  })

  it('falls back to an empty state for invalid JSON', () => {
    backingStore[STORAGE_KEY] = '{nope'
    expect(storage.load()).toEqual(emptyState())
  })

  it('migrates v1 state and legacy assistance flags', () => {
    backingStore[STORAGE_KEY] = JSON.stringify({
      decks: [{ id: 'd', name: 'D', createdAt: 1, updatedAt: 1 }],
      cards: [{ id: 'c', deckId: 'd', title: 'T', content: 'x', createdAt: 1, updatedAt: 1 }],
      records: [{ id: 'r', scope: 'card', scopeId: 'c', elapsedMs: 5, completedAt: 1, assistance: { ghostText: true, fullText: true, autocorrect: false } }],
    })
    const loaded = storage.load()
    expect(loaded.version).toBe(2)
    expect(loaded.seeded).toBe(true)
    expect(loaded.records[0].assistance).toEqual({ reveal: 'full', ghostText: true, autocorrect: false })
    expect(loaded.profile).toEqual(defaultProfile)
  })

  it('drops malformed entries and orphaned cards', () => {
    const state = normalizeState({
      decks: [{ id: 'd', name: 'D' }, { name: 'no id' }, null],
      cards: [{ id: 'c1', deckId: 'd', content: 'ok' }, { id: 'c2', deckId: 'missing', content: 'orphan' }, { id: 'c3' }],
      records: [{ id: 'r', scope: 'weird', scopeId: 'x', elapsedMs: 1 }],
    })
    expect(state.decks.map((d) => d.id)).toEqual(['d'])
    expect(state.cards.map((c) => c.id)).toEqual(['c1'])
    expect(state.records).toEqual([])
  })

  it('reports a friendly error when saving fails', () => {
    ;(localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(storage.save(createState())).toMatch(/Storage is full/)
  })

  it('generates uuids even without crypto.randomUUID', () => {
    const original = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {} })
    expect(storage.uuid()).toMatch(/^[0-9a-f-]{36}$/)
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original })
  })
})

describe('import/export', () => {
  it('round-trips through the export format', () => {
    const state = createState()
    expect(parseImport(serializeExport(state))).toEqual(state)
  })

  it('rejects files without decks', () => {
    expect(() => parseImport('{"state":{"decks":[]}}')).toThrow(/No decks/)
    expect(() => parseImport('nope')).toThrow(/not valid JSON/)
  })
})

describe('nextStreak', () => {
  const today = new Date(2026, 8, 28)

  it('starts a streak on the first run', () => {
    expect(nextStreak(defaultProfile, today)).toEqual({ streak: 1, bestStreak: 1, lastPlayedDay: '2026-09-28' })
  })

  it('extends the streak when played yesterday', () => {
    const profile = { ...defaultProfile, streak: 4, bestStreak: 4, lastPlayedDay: '2026-09-27' }
    expect(nextStreak(profile, today).streak).toBe(5)
  })

  it('keeps the streak when already played today and resets after a gap', () => {
    expect(nextStreak({ ...defaultProfile, streak: 3, bestStreak: 6, lastPlayedDay: '2026-09-28' }, today)).toEqual({ streak: 3, bestStreak: 6, lastPlayedDay: '2026-09-28' })
    expect(nextStreak({ ...defaultProfile, streak: 3, bestStreak: 6, lastPlayedDay: '2026-09-20' }, today)).toEqual({ streak: 1, bestStreak: 6, lastPlayedDay: '2026-09-28' })
  })
})
