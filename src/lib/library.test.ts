import { describe, expect, it } from 'vitest'
import { LEARNKIT_PACKS, allPacks, deckForPack, learnkitCourses } from '@/lib/library'
import { reconcile } from '@/lib/studyInput'
import type { Deck } from '@/types'

describe('deck library', () => {
  it('has unique pack ids and names', () => {
    const packs = allPacks()
    expect(new Set(packs.map((p) => p.id)).size).toBe(packs.length)
    expect(new Set(packs.map((p) => p.name)).size).toBe(packs.length)
  })

  it('includes the LearnKit courses', () => {
    expect(LEARNKIT_PACKS.length).toBeGreaterThanOrEqual(20)
    expect(learnkitCourses().every((c) => c.packs.length >= 1)).toBe(true)
  })

  it('only contains cards that can be typed to completion', () => {
    for (const pack of allPacks()) {
      for (const [title, content] of pack.cards) {
        expect(title, `${pack.id}: empty title`).not.toBe('')
        expect(reconcile(content, '', content, { autocorrect: false }), `${pack.id}: ${title}`).toBe(content)
        const bare = content.replace(/[\p{P}\p{S}]/gu, '').toLowerCase()
        expect(reconcile(content, '', bare, { autocorrect: true }), `${pack.id}: ${title} (lenient)`).toBe(content)
      }
    }
  })

  it('matches decks by pack id, falling back to name for older decks', () => {
    const pack = LEARNKIT_PACKS[0]
    const base = { description: '', createdAt: 0, updatedAt: 0 }
    const byId: Deck = { ...base, id: 'a', name: 'Renamed', packId: pack.id }
    const byName: Deck = { ...base, id: 'b', name: pack.name.toUpperCase() }
    expect(deckForPack([byId], pack)?.id).toBe('a')
    expect(deckForPack([byName], pack)?.id).toBe('b')
    expect(deckForPack([{ ...byName, packId: 'other' }], pack)).toBeUndefined()
  })
})
