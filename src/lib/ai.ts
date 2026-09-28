import { useEffect, useState } from 'react'

export type GenCard = { title: string; content: string }
export type GenDeck = { name: string; description: string; cards: GenCard[] }

const TIMEOUT_MS = 45_000

async function post<T>(body: unknown, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const combined = signal && 'any' in AbortSignal ? AbortSignal.any([signal, timeout]) : timeout
  let res: Response
  try {
    res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: combined,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError' && signal?.aborted) throw err
    if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new Error('The AI took too long to respond. Please try again.')
    }
    throw new Error(navigator.onLine === false ? 'You appear to be offline.' : 'Could not reach the server. Please try again.')
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // non-JSON (e.g. static hosting without the Worker)
  }
  if (!res.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : null
    if (res.status === 404 || !message) throw new Error('AI generation is not available on this deployment.')
    throw new Error(message)
  }
  return data as T
}

function cleanCards(cards: unknown): GenCard[] {
  if (!Array.isArray(cards)) return []
  return cards
    .filter((c): c is GenCard => !!c && typeof c.title === 'string' && typeof c.content === 'string')
    .map((c) => ({ title: c.title.trim(), content: c.content.trim() }))
    .filter((c) => c.content)
}

export async function generateDeck(topic: string, count: number, signal?: AbortSignal): Promise<GenDeck> {
  const data = await post<Partial<GenDeck>>({ mode: 'deck', topic, count }, signal)
  const cards = cleanCards(data.cards)
  if (!data.name || cards.length === 0) throw new Error('The AI response was incomplete. Please try again.')
  return { name: data.name, description: data.description ?? '', cards }
}

export async function generateMoreCards(
  deck: { name: string; description?: string },
  existing: GenCard[],
  count = 6,
  signal?: AbortSignal
): Promise<GenCard[]> {
  const data = await post<{ cards?: unknown }>(
    { mode: 'cards', deckName: deck.name, deckDescription: deck.description, existing: existing.slice(0, 60), count },
    signal
  )
  const cards = cleanCards(data.cards)
  if (cards.length === 0) throw new Error('No new cards came back. Please try again.')
  return cards
}

let healthPromise: Promise<boolean | null> | null = null

/** true = configured, false = server says no key, null = unknown (offline / no Worker). */
function checkHealth(): Promise<boolean | null> {
  if (!healthPromise) {
    healthPromise = fetch('/api/health', { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ai?: boolean } | null) => (d && typeof d.ai === 'boolean' ? d.ai : null))
      .catch(() => {
        healthPromise = null
        return null
      })
  }
  return healthPromise
}

export function useAiAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    void checkHealth().then((v) => alive && setAvailable(v))
    return () => {
      alive = false
    }
  }, [])
  return available
}
