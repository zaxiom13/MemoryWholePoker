import { describe, expect, it } from 'vitest'
import {
  generateCardsWithGemini,
  generateDeckWithAI,
  generateMoreCardsWithGemini,
  normalizeCards,
  parseCardsFromText,
  parseDeckFromText,
} from '@/lib/gemini'

describe('parseCardsFromText', () => {
  it('parses fenced JSON card output', () => {
    const text = '```json\n{"cards":[{"title":"Q1","content":"A1"}]}\n```'

    expect(parseCardsFromText(text)).toEqual([{ title: 'Q1', content: 'A1' }])
  })

  it('extracts JSON from surrounding commentary', () => {
    const text = 'Here you go {"cards":[{"title":"Q1","content":"A1"}]} thanks'

    expect(parseCardsFromText(text)).toEqual([{ title: 'Q1', content: 'A1' }])
  })

  it('parses loose JSON objects when a full document is not present', () => {
    const text = 'junk {"title":"Q1","content":"A1"} more junk {"title":"Q2","content":"A2"}'

    expect(parseCardsFromText(text)).toEqual([
      { title: 'Q1', content: 'A1' },
      { title: 'Q2', content: 'A2' },
    ])
  })

  it('parses title and content line pairs', () => {
    const text = '"title": "Question one"\n"content": "Answer one"\n"title": "Question two"\n"content": "Answer two"'

    expect(parseCardsFromText(text)).toEqual([
      { title: 'Question one', content: 'Answer one' },
      { title: 'Question two', content: 'Answer two' },
    ])
  })

  it('falls back to line-based cards when parsing fails', () => {
    const text = 'Alpha\nBeta\nGamma'

    expect(parseCardsFromText(text)).toEqual([
      { title: 'Alpha', content: 'Alpha' },
      { title: 'Beta', content: 'Beta' },
      { title: 'Gamma', content: 'Gamma' },
    ])
  })

  it('normalizes and truncates parsed card output', () => {
    const cards = Array.from({ length: 25 }, (_, i) => ({ title: ` T${i} `, content: ` C${i} ` }))
    const text = JSON.stringify({ cards })

    const parsed = parseCardsFromText(text)

    expect(parsed).toHaveLength(20)
    expect(parsed[0]).toEqual({ title: 'T0', content: 'C0' })
    expect(parsed[19]).toEqual({ title: 'T19', content: 'C19' })
  })
})

describe('parseDeckFromText', () => {
  it('parses a direct deck JSON response', () => {
    const text = JSON.stringify({
      name: ' Deck Name ',
      description: ' Deck Description ',
      cards: [{ title: ' Q1 ', content: ' A1 ' }],
    })

    expect(parseDeckFromText(text)).toEqual({
      name: 'Deck Name',
      description: 'Deck Description',
      cards: [{ title: 'Q1', content: 'A1' }],
    })
  })

  it('parses a deck JSON payload embedded in extra text', () => {
    const text = 'output: {"name":"Deck","description":"Desc","cards":[{"title":"Q1","content":"A1"}]}'

    expect(parseDeckFromText(text)).toEqual({
      name: 'Deck',
      description: 'Desc',
      cards: [{ title: 'Q1', content: 'A1' }],
    })
  })

  it('returns null when deck parsing fails', () => {
    expect(parseDeckFromText('not valid deck output')).toBeNull()
  })
})

describe('normalizeCards', () => {
  it('filters invalid entries and trims surviving cards', () => {
    expect(
      normalizeCards([
        null,
        { title: ' Question ', content: ' Answer ' },
        { title: '', content: '' },
        { foo: 'bar' },
      ])
    ).toEqual([
      { title: 'Question', content: 'Answer' },
    ])
  })
})

describe('Gemini API guards', () => {
  it('throws when generating cards without an API key', async () => {
    await expect(generateCardsWithGemini('topic')).rejects.toThrow('Gemini API key missing')
  })

  it('throws when generating more cards without an API key', async () => {
    await expect(generateMoreCardsWithGemini('deck', [])).rejects.toThrow('Gemini API key missing')
  })

  it('throws when generating a deck without an API key', async () => {
    await expect(generateDeckWithAI('topic')).rejects.toThrow('Gemini API key missing')
  })
})
