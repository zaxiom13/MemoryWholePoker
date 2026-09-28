import type { AppStateShape, AssistanceOptions, Card, Deck, HandId, Profile, RevealMode, TimeRecord, UUID } from '@/types'
import { defaultProfile } from '@/types'

export const STORAGE_KEY = 'mw_state_v1'

export function emptyState(): AppStateShape {
  return { version: 2, decks: [], cards: [], records: [], profile: { ...defaultProfile }, seeded: false }
}

const REVEALS: RevealMode[] = ['none', 'blanks', 'initials', 'full']
const HANDS: HandId[] = ['royal-flush', 'straight-flush', 'four-kind', 'full-house', 'flush', 'straight', 'three-kind', 'two-pair', 'pair', 'high-card']

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isStr = (v: unknown): v is string => typeof v === 'string'
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

function toDeck(v: unknown): Deck | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name)) return null
  return {
    id: v.id,
    name: v.name,
    description: isStr(v.description) && v.description ? v.description : undefined,
    ...(isStr(v.packId) ? { packId: v.packId } : {}),
    createdAt: num(v.createdAt, Date.now()),
    updatedAt: num(v.updatedAt, Date.now()),
  }
}

function toCard(v: unknown): Card | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.deckId) || !isStr(v.content)) return null
  return {
    id: v.id,
    deckId: v.deckId,
    title: isStr(v.title) ? v.title : '',
    content: v.content,
    createdAt: num(v.createdAt, Date.now()),
    updatedAt: num(v.updatedAt, Date.now()),
  }
}

/** Accepts both the current shape and the legacy `{ fullText }` flag. */
export function toAssistance(v: unknown): AssistanceOptions {
  const a = isObj(v) ? v : {}
  const reveal = REVEALS.includes(a.reveal as RevealMode) ? (a.reveal as RevealMode) : a.fullText === true ? 'full' : 'none'
  return { reveal, ghostText: a.ghostText === true, autocorrect: a.autocorrect === true }
}

function toRecord(v: unknown): TimeRecord | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.scopeId) || (v.scope !== 'card' && v.scope !== 'deck')) return null
  const elapsedMs = num(v.elapsedMs, -1)
  if (elapsedMs < 0) return null
  const rec: TimeRecord = {
    id: v.id,
    scope: v.scope,
    scopeId: v.scopeId,
    elapsedMs,
    completedAt: num(v.completedAt, Date.now()),
    assistance: toAssistance(v.assistance),
  }
  if (typeof v.wpm === 'number') rec.wpm = v.wpm
  if (typeof v.accuracy === 'number') rec.accuracy = v.accuracy
  if (typeof v.hints === 'number') rec.hints = v.hints
  if (typeof v.mistakes === 'number') rec.mistakes = v.mistakes
  if (HANDS.includes(v.hand as HandId)) rec.hand = v.hand as HandId
  return rec
}

function toProfile(v: unknown): Profile {
  if (!isObj(v)) return { ...defaultProfile }
  return {
    chips: Math.max(0, Math.round(num(v.chips))),
    runs: Math.max(0, Math.round(num(v.runs))),
    streak: Math.max(0, Math.round(num(v.streak))),
    bestStreak: Math.max(0, Math.round(num(v.bestStreak))),
    lastPlayedDay: isStr(v.lastPlayedDay) ? v.lastPlayedDay : null,
  }
}

function compact<T>(items: unknown, fn: (v: unknown) => T | null): T[] {
  if (!Array.isArray(items)) return []
  const out: T[] = []
  for (const item of items) {
    const parsed = fn(item)
    if (parsed) out.push(parsed)
  }
  return out
}

/** Validates and migrates anything that looks like saved app state. */
export function normalizeState(raw: unknown): AppStateShape {
  if (!isObj(raw)) return emptyState()
  const decks = compact(raw.decks, toDeck)
  const deckIds = new Set(decks.map((d) => d.id))
  const cards = compact(raw.cards, toCard).filter((c) => deckIds.has(c.deckId))
  const records = compact(raw.records, toRecord)
  // v1 had no `seeded` flag; any existing data means the user has already been onboarded.
  const seeded = raw.seeded === true || decks.length > 0 || records.length > 0
  return { version: 2, decks, cards, records, profile: toProfile(raw.profile), seeded }
}

function loadState(): AppStateShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    return normalizeState(JSON.parse(raw))
  } catch {
    return emptyState()
  }
}

/** Returns an error message if the browser refused to persist (quota, private mode). */
function saveState(state: AppStateShape): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return null
  } catch (err) {
    const quota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)
    return quota
      ? 'Storage is full, so recent changes may not be saved. Try exporting a backup and deleting old decks.'
      : 'Your browser is blocking storage, so progress will be lost when you close this tab.'
  }
}

function uuid(): UUID {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Fallback for older browsers / non-secure contexts (e.g. LAN IP during development).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export const storage = {
  load: loadState,
  save: saveState,
  uuid,
  now(): number {
    return Date.now()
  },
}

export type ExportFile = {
  app: 'memorywholed'
  exportedAt: string
  state: AppStateShape
}

export function serializeExport(state: AppStateShape): string {
  const file: ExportFile = { app: 'memorywholed', exportedAt: new Date().toISOString(), state }
  return JSON.stringify(file, null, 2)
}

/** Parses an export file (or a bare state object). Throws with a readable message. */
export function parseImport(text: string): AppStateShape {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const inner = isObj(parsed) && isObj(parsed.state) ? parsed.state : parsed
  const state = normalizeState(inner)
  if (state.decks.length === 0) throw new Error('No decks were found in that file.')
  return state
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function nextStreak(profile: Profile, today = new Date()): Pick<Profile, 'streak' | 'bestStreak' | 'lastPlayedDay'> {
  const todayKey = dayKey(today)
  if (profile.lastPlayedDay === todayKey) {
    return { streak: Math.max(1, profile.streak), bestStreak: Math.max(profile.bestStreak, profile.streak, 1), lastPlayedDay: todayKey }
  }
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const streak = profile.lastPlayedDay === dayKey(yesterday) ? profile.streak + 1 : 1
  return { streak, bestStreak: Math.max(profile.bestStreak, streak), lastPlayedDay: todayKey }
}
