import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { validate, type Env } from './index'

const assets = { fetch: vi.fn(async () => new Response('asset')) } as unknown as Fetcher

function env(overrides: Partial<Env> = {}): Env {
  return { ASSETS: assets, GEMINI_API_KEY: 'test-key', ...overrides }
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://app.example/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function geminiReply(obj: unknown) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 })
}

afterEach(() => vi.unstubAllGlobals())

describe('worker routing', () => {
  it('reports health and AI availability', async () => {
    const res = await worker.fetch(new Request('https://app.example/api/health'), env({ GEMINI_API_KEY: undefined }))
    expect(await res.json()).toEqual({ ok: true, ai: false })
  })

  it('falls through to static assets for non-api paths', async () => {
    const res = await worker.fetch(new Request('https://app.example/decks/1'), env())
    expect(await res.text()).toBe('asset')
  })

  it('rejects non-POST generate calls', async () => {
    const res = await worker.fetch(new Request('https://app.example/api/generate'), env())
    expect(res.status).toBe(405)
  })

  it('returns 503 when no key is configured', async () => {
    const res = await worker.fetch(post({ mode: 'deck', topic: 'x' }), env({ GEMINI_API_KEY: undefined }))
    expect(res.status).toBe(503)
  })

  it('blocks cross-origin requests', async () => {
    const res = await worker.fetch(post({ mode: 'deck', topic: 'x' }, { Origin: 'https://evil.example' }), env())
    expect(res.status).toBe(403)
  })

  it('honours the rate limiter', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: false })) }
    const res = await worker.fetch(post({ mode: 'deck', topic: 'x' }), env({ AI_RATE_LIMITER: limiter }))
    expect(res.status).toBe(429)
  })

  it('generates a deck through Gemini', async () => {
    const fetchMock = vi.fn(async () => geminiReply({ name: 'Deck', description: 'Desc', cards: [{ title: 'Q', content: 'A' }] }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await worker.fetch(post({ mode: 'deck', topic: 'Birds', count: 5 }), env())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ name: 'Deck', description: 'Desc', cards: [{ title: 'Q', content: 'A' }] })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key')
  })

  it('filters generated cards that duplicate existing titles', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => geminiReply({ cards: [{ title: 'Old', content: 'x' }, { title: 'New', content: 'y' }] })))
    const res = await worker.fetch(post({ mode: 'cards', deckName: 'D', existing: [{ title: 'old', content: 'x' }] }), env())
    expect(await res.json()).toEqual({ cards: [{ title: 'New', content: 'y' }] })
  })

  it('maps upstream failures to a friendly 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await worker.fetch(post({ mode: 'deck', topic: 'x' }), env())
    expect(res.status).toBe(502)
    expect(((await res.json()) as { error: string }).error).toMatch(/AI service/)
  })
})

describe('validate', () => {
  it('clamps count and trims topic', () => {
    expect(validate({ mode: 'deck', topic: '  hi  ', count: 99 })).toEqual({ mode: 'deck', topic: 'hi', count: 15 })
  })

  it('rejects unknown modes and empty topics', () => {
    expect(() => validate({ mode: 'nope' })).toThrow()
    expect(() => validate({ mode: 'deck', topic: '   ' })).toThrow()
  })
})
