import { describe, expect, it } from 'vitest'
import { accuracyPct, assistanceCap, chipsFor, formatTime, rankHand, wordsPerMinute, HANDS } from '@/lib/scoring'
import { defaultAssistance } from '@/types'

const base = { chars: 100, words: 20, elapsedMs: 60_000, mistakes: 0, hints: 0 }

describe('stats', () => {
  it('computes WPM from characters', () => {
    expect(wordsPerMinute(250, 60_000)).toBe(50)
    expect(wordsPerMinute(10, 0)).toBe(0)
  })

  it('computes accuracy', () => {
    expect(accuracyPct(100, 0)).toBe(100)
    expect(accuracyPct(90, 10)).toBe(90)
  })

  it('formats times with tenths', () => {
    expect(formatTime(65_430)).toBe('1:05.4')
    expect(formatTime(0)).toBe('0:00.0')
  })
})

describe('rankHand', () => {
  it('awards a royal flush for a perfect unassisted run', () => {
    expect(rankHand(base, defaultAssistance).id).toBe('royal-flush')
  })

  it('drops to a straight flush after one slip', () => {
    expect(rankHand({ ...base, mistakes: 1 }, defaultAssistance).id).toBe('straight-flush')
  })

  it('penalises hints', () => {
    expect(rankHand({ ...base, hints: 4 }, defaultAssistance).id).toBe('three-kind')
  })

  it('caps the hand by assistance level', () => {
    expect(rankHand(base, { ...defaultAssistance, reveal: 'full' }).id).toBe('straight')
    expect(rankHand(base, { ...defaultAssistance, autocorrect: true }).id).toBe('straight-flush')
    expect(assistanceCap({ reveal: 'initials', ghostText: true, autocorrect: true })).toBe(3)
  })

  it('falls back to high card for a rough run', () => {
    expect(rankHand({ ...base, mistakes: 200 }, defaultAssistance).id).toBe('high-card')
  })
})

describe('chipsFor', () => {
  it('scales by hand and adds a personal best bonus', () => {
    const royal = HANDS[0]
    const high = HANDS[HANDS.length - 1]
    expect(chipsFor(base, royal, false)).toBeGreaterThan(chipsFor(base, high, false))
    expect(chipsFor(base, high, true) - chipsFor(base, high, false)).toBe(25)
  })
})
