import { GoogleGenAI } from '@google/genai'
const ENV_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

type GenCard = { title: string; content: string }

export function sanitizeFence(text: string): string {
  // If wrapped in ```json ... ``` or ``` ... ```, strip fences
  const fence = /```[a-zA-Z]*\n([\s\S]*?)```/g
  const m = fence.exec(text)
  if (m && m[1]) return m[1].trim()
  return text
}

export function tryParseJSON(text: string): GenCard[] | null {
  try {
    const obj = JSON.parse(text)
    if (obj && Array.isArray(obj.cards)) return obj.cards
  } catch {
    // swallow JSON parse errors and let fallback parsing handle it
  }
  return null
}

export function extractJSONString(text: string): string | null {
  // Attempt to grab the largest JSON-looking block
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1)
  }
  return null
}

export function parseFromLooseObjects(text: string): GenCard[] | null {
  // Find objects like { "title": "...", "content": "..." }
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
      // ignore malformed snippets and continue scanning
    }
  }
  return objs.length ? objs : null
}

export function parseFromTitleLines(text: string): GenCard[] | null {
  // Handle lines like: "title": "What is a Sonnet?" and optional next content lines
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const cards: GenCard[] = []
  let i = 0
  while (i < lines.length) {
    const tMatch = lines[i].match(/"?title"?\s*:\s*"([^"]+)"/i)
    if (tMatch) {
      const title = tMatch[1]
      let content = ''
      // Look ahead for content line
      if (i + 1 < lines.length) {
        const cMatch = lines[i + 1].match(/"?content"?\s*:\s*"([^"]+)"/i)
        if (cMatch) {
          content = cMatch[1]
          i += 2
        } else {
          // Otherwise take the next non-title line as content
          const next = lines[i + 1]
          if (!/"?title"?\s*:/.test(next)) {
            content = next.replace(/^[-*]\s*/, '')
            i += 2
          } else {
            i += 1
          }
        }
      } else {
        i += 1
      }
      cards.push({ title, content })
      continue
    }
    i += 1
  }
  return cards.length ? cards : null
}

export async function generateCardsWithGemini(prompt: string): Promise<Array<{ title: string; content: string }>> {
  const apiKey = ENV_GEMINI_API_KEY
  if (!apiKey || apiKey === 'PUT_YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY in your Netlify env or .env')
  }

  const ai = new GoogleGenAI({ apiKey })
  const model = 'gemini-3.1-flash-lite'
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: [
            'You are an expert instructional designer creating high-quality study flashcards.',
            'Output contract (mandatory): return ONLY valid JSON, with no markdown and no extra text.',
            'Schema: {"cards":[{"title":string,"content":string}]}',
            'Card rules:',
            '- Generate 5-8 cards.',
            '- Each card tests one idea only.',
            '- "title" must be a direct question or a clear term (4-80 chars).',
            '- "content" must be the correct answer/explanation (1-3 short sentences, <= 260 chars).',
            '- Avoid duplicates and near-duplicates.',
            '- Cover breadth: include foundational and intermediate concepts.',
            '- Use concrete facts, not vague advice.',
            '- No preface, no commentary, no trailing text.',
            '',
            'Task:',
            prompt,
          ].join('\n'),
        },
      ],
    },
  ]
  const config = { thinkingConfig: { thinkingBudget: 0 } }

  const stream = await ai.models.generateContentStream({ model, contents, config })
  let acc = ''
  for await (const chunk of stream) {
    acc += chunk.text ?? ''
  }
  return parseCardsFromText(acc)
}

export async function generateMoreCardsWithGemini(deckName: string, existingCards: Array<{ title: string; content: string }>): Promise<Array<{ title: string; content: string }>> {
  const apiKey = ENV_GEMINI_API_KEY
  if (!apiKey || apiKey === 'PUT_YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY in your Netlify env or .env')
  }

  const ai = new GoogleGenAI({ apiKey })
  const model = 'gemini-3.1-flash-lite'
  const cardsContext = existingCards.map((c) => `- Title: ${c.title}\n  Content: ${c.content}`).join('\n')
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: [
            'You are an expert instructional designer expanding an existing study deck.',
            'Output contract (mandatory): return ONLY valid JSON, with no markdown and no extra text.',
            'Schema: {"cards":[{"title":string,"content":string}]}',
            'Card rules:',
            '- Generate 5-8 NEW cards.',
            '- Each card tests one idea only.',
            '- "title" must be a direct question or a clear term (4-80 chars).',
            '- "content" must be the correct answer/explanation (1-3 short sentences, <= 260 chars).',
            '- Match the deck topic and difficulty.',
            '- Avoid overlap with existing cards in both title and meaning.',
            '- Do not repeat examples already present unless needed for correctness.',
            '- No preface, no commentary, no trailing text.',
            '',
            'Generate additional flashcards similar in style and quality to the existing ones.',
            '',
            `Deck Name: ${deckName}`,
            '',
            'Existing cards:',
            cardsContext,
            '',
            'Return only the new cards.',
          ].join('\n'),
        },
      ],
    },
  ]
  const config = { thinkingConfig: { thinkingBudget: 0 } }

  const stream = await ai.models.generateContentStream({ model, contents, config })
  let acc = ''
  for await (const chunk of stream) {
    acc += chunk.text ?? ''
  }
  return parseCardsFromText(acc)
}

export async function generateDeckWithAI(topic: string): Promise<{ name: string; description: string; cards: Array<{ title: string; content: string }> }> {
  const apiKey = ENV_GEMINI_API_KEY
  if (!apiKey || apiKey === 'PUT_YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY in your Netlify env or .env')
  }

  const ai = new GoogleGenAI({ apiKey })
  const model = 'gemini-3.1-flash-lite'
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: [
            'You are an expert instructional designer creating a complete study deck.',
            'Output contract (mandatory): return ONLY valid JSON, with no markdown and no extra text.',
            'Schema: {"name":string,"description":string,"cards":[{"title":string,"content":string}]}',
            'Deck rules:',
            '- name: concise and memorable (2-6 words, <= 40 chars).',
            '- description: one sentence describing what is covered (<= 120 chars).',
            '- cards: generate 6-8 cards.',
            '- Each card tests one idea only.',
            '- "title" must be a direct question or a clear term (4-80 chars).',
            '- "content" must be the correct answer/explanation (1-3 short sentences, <= 260 chars).',
            '- Include a balanced mix of foundational and intermediate concepts.',
            '- Avoid duplicate cards and avoid generic filler wording.',
            '- No preface, no commentary, no trailing text.',
            '',
            'Topic:',
            topic,
          ].join('\n'),
        },
      ],
    },
  ]
  const config = { thinkingConfig: { thinkingBudget: 0 } }

  const stream = await ai.models.generateContentStream({ model, contents, config })
  let acc = ''
  for await (const chunk of stream) {
    acc += chunk.text ?? ''
  }
  const parsedDeck = parseDeckFromText(acc)
  if (parsedDeck) return parsedDeck
  throw new Error('Failed to parse AI response')
}

export function parseCardsFromText(text: string): Array<{ title: string; content: string }> {
  const cleaned = sanitizeFence(text.trim())
  let cards = tryParseJSON(cleaned)
  if (!cards) {
    const js = extractJSONString(cleaned)
    if (js) cards = tryParseJSON(js)
  }
  if (!cards) {
    cards = parseFromLooseObjects(cleaned)
  }
  if (!cards) {
    cards = parseFromTitleLines(cleaned)
  }
  if (cards && cards.length) {
    return normalizeCards(cards)
  }
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return lines.slice(0, 5).map((l, i) => ({ title: l.slice(0, 40) || `Card ${i + 1}`, content: l }))
}

export function parseDeckFromText(text: string): { name: string; description: string; cards: Array<{ title: string; content: string }> } | null {
  const cleaned = sanitizeFence(text.trim())

  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed.name === 'string' && typeof parsed.description === 'string' && Array.isArray(parsed.cards)) {
      return {
        name: String(parsed.name).trim().slice(0, 50),
        description: String(parsed.description).trim().slice(0, 200),
        cards: normalizeCards(parsed.cards),
      }
    }
  } catch {
    // fall through to JSON extraction heuristics
  }

  const js = extractJSONString(cleaned)
  if (!js) return null

  try {
    const parsed = JSON.parse(js)
    if (parsed && typeof parsed.name === 'string' && typeof parsed.description === 'string' && Array.isArray(parsed.cards)) {
      return {
        name: String(parsed.name).trim().slice(0, 50),
        description: String(parsed.description).trim().slice(0, 200),
        cards: normalizeCards(parsed.cards),
      }
    }
  } catch {
    return null
  }

  return null
}

export function normalizeCards(raw: unknown): Array<{ title: string; content: string }> {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c) => {
      if (typeof c !== 'object' || c === null) return { title: '', content: '' }
      const maybeCard = c as Partial<GenCard>
      return {
        title: String(maybeCard.title ?? '').trim(),
        content: String(maybeCard.content ?? '').trim(),
      }
    })
    .filter((c) => c.title || c.content)
    .slice(0, 20)
}
