import { GoogleGenAI } from '@google/genai'
import { GEMINI_API_KEY } from '@/AI_KEY'

type GenCard = { title: string; content: string }

function sanitizeFence(text: string): string {
  // If wrapped in ```json ... ``` or ``` ... ```, strip fences
  const fence = /```[a-zA-Z]*\n([\s\S]*?)```/g
  const m = fence.exec(text)
  if (m && m[1]) return m[1].trim()
  return text
}

function tryParseJSON(text: string): GenCard[] | null {
  try {
    const obj = JSON.parse(text)
    if (obj && Array.isArray(obj.cards)) return obj.cards
  } catch {}
  return null
}

function extractJSONString(text: string): string | null {
  // Attempt to grab the largest JSON-looking block
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1)
  }
  return null
}

function parseFromLooseObjects(text: string): GenCard[] | null {
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
    } catch {}
  }
  return objs.length ? objs : null
}

function parseFromTitleLines(text: string): GenCard[] | null {
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
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'PUT_YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY in .env or edit src/AI_KEY.ts')
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  const model = 'gemini-2.5-flash-lite'
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: [
            'You are an assistant that creates flashcards.',
            'Respond with ONLY a JSON object, no markdown, no code fences, no extra text.',
            'Schema: {"cards": [{"title": string, "content": string}, ...]}',
            'Max 10 cards. Keep each content under 400 characters.',
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
  let text = acc.trim()
  // 1) Strip code fences
  text = sanitizeFence(text)
  // 2) Direct JSON
  let cards = tryParseJSON(text)
  if (!cards) {
    // 3) Extract largest JSON substring and try parse
    const js = extractJSONString(text)
    if (js) cards = tryParseJSON(js)
  }
  if (!cards) {
    // 4) Parse individual loose objects
    cards = parseFromLooseObjects(text)
  }
  if (!cards) {
    // 5) Parse from lines like "title": "..."
    cards = parseFromTitleLines(text)
  }
  if (cards && cards.length) {
    return cards
      .map((c) => ({ title: String(c.title || '').trim(), content: String(c.content || '').trim() }))
      .filter((c) => c.title || c.content)
      .slice(0, 20)
  }
  // 6) Final fallback: naive lines
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return lines.slice(0, 5).map((l, i) => ({ title: l.slice(0, 40) || `Card ${i + 1}`, content: l }))
}
