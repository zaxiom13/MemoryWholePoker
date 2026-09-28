// Tolerant parsing of LLM output into flashcards. The Worker asks Gemini for
// schema-constrained JSON, but models still occasionally wrap output in fences
// or add chatter, so every step here degrades gracefully.

export type GenCard = { title: string; content: string }
export type GenDeck = { name: string; description: string; cards: GenCard[] }

export const MAX_CARDS = 20
const MAX_TITLE = 120
const MAX_CONTENT = 1200

export function sanitizeFence(text: string): string {
  const m = /```[a-zA-Z]*\n([\s\S]*?)```/.exec(text)
  if (m && m[1]) return m[1].trim()
  return text
}

export function tryParseJSON(text: string): GenCard[] | null {
  try {
    const obj = JSON.parse(text)
    if (obj && Array.isArray(obj.cards)) return obj.cards
  } catch {
    // fall through to the looser strategies
  }
  return null
}

export function extractJSONString(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1)
  return null
}

export function parseFromLooseObjects(text: string): GenCard[] | null {
  const objs: GenCard[] = []
  const re = /\{[^}]*\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) != null) {
    try {
      const o = JSON.parse(m[0])
      if (o && typeof o.title === 'string' && typeof o.content === 'string') {
        objs.push({ title: o.title, content: o.content })
      }
    } catch {
      // ignore malformed snippets and keep scanning
    }
  }
  return objs.length ? objs : null
}

export function parseFromTitleLines(text: string): GenCard[] | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const cards: GenCard[] = []
  let i = 0
  while (i < lines.length) {
    const tMatch = lines[i].match(/"?title"?\s*:\s*"([^"]+)"/i)
    if (!tMatch) {
      i += 1
      continue
    }
    const title = tMatch[1]
    let content = ''
    const next = lines[i + 1]
    if (next != null) {
      const cMatch = next.match(/"?content"?\s*:\s*"([^"]+)"/i)
      if (cMatch) {
        content = cMatch[1]
        i += 2
      } else if (!/"?title"?\s*:/.test(next)) {
        content = next.replace(/^[-*]\s*/, '')
        i += 2
      } else {
        i += 1
      }
    } else {
      i += 1
    }
    cards.push({ title, content })
  }
  return cards.length ? cards : null
}

export function parseCardsFromText(text: string): GenCard[] {
  const cleaned = sanitizeFence(text.trim())
  let cards = tryParseJSON(cleaned)
  if (!cards) {
    const js = extractJSONString(cleaned)
    if (js) cards = tryParseJSON(js)
  }
  if (!cards) cards = parseFromLooseObjects(cleaned)
  if (!cards) cards = parseFromTitleLines(cleaned)
  if (cards && cards.length) return normalizeCards(cards)
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return lines.slice(0, 5).map((l, i) => ({ title: l.slice(0, 40) || `Card ${i + 1}`, content: l }))
}

function deckFrom(parsed: unknown): GenDeck | null {
  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as Record<string, unknown>
  if (typeof p.name !== 'string' || !Array.isArray(p.cards)) return null
  return {
    name: p.name.trim().slice(0, 50),
    description: typeof p.description === 'string' ? p.description.trim().slice(0, 200) : '',
    cards: normalizeCards(p.cards),
  }
}

export function parseDeckFromText(text: string): GenDeck | null {
  const cleaned = sanitizeFence(text.trim())
  try {
    const deck = deckFrom(JSON.parse(cleaned))
    if (deck) return deck
  } catch {
    // fall through to extraction
  }
  const js = extractJSONString(cleaned)
  if (!js) return null
  try {
    return deckFrom(JSON.parse(js))
  } catch {
    return null
  }
}

export function normalizeCards(raw: unknown): GenCard[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: GenCard[] = []
  for (const c of raw) {
    if (typeof c !== 'object' || c === null) continue
    const maybe = c as Partial<GenCard>
    const title = String(maybe.title ?? '').trim().slice(0, MAX_TITLE)
    const content = String(maybe.content ?? '').trim().slice(0, MAX_CONTENT)
    if (!title && !content) continue
    const key = title.toLowerCase()
    if (key && seen.has(key)) continue
    seen.add(key)
    out.push({ title, content })
    if (out.length >= MAX_CARDS) break
  }
  return out
}
