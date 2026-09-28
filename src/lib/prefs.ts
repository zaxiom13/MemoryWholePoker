import { useSyncExternalStore } from 'react'
import type { RevealMode, SessionOptions } from '@/types'
import { defaultAssistance } from '@/types'

export type Prefs = {
  session: SessionOptions
  sound: boolean
  haptics: boolean
  hideAnswers: boolean
}

const KEY = 'mw_prefs_v1'
const REVEALS: RevealMode[] = ['none', 'blanks', 'initials', 'full']

export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) return true
  // Fallback: touch-capable and phone/tablet sized (avoids flagging touchscreen laptops).
  return navigator.maxTouchPoints > 0 && Math.min(window.screen.width, window.screen.height) < 820
}

function defaults(): Prefs {
  return {
    // Phone keyboards make exact casing/punctuation tedious, so start lenient there.
    session: { ...defaultAssistance, autocorrect: isTouchDevice(), shuffle: false },
    sound: true,
    haptics: true,
    hideAnswers: false,
  }
}

function read(): Prefs {
  const base = defaults()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<Prefs>
    const s = (p.session ?? {}) as Partial<SessionOptions>
    return {
      session: {
        reveal: REVEALS.includes(s.reveal as RevealMode) ? (s.reveal as RevealMode) : base.session.reveal,
        ghostText: typeof s.ghostText === 'boolean' ? s.ghostText : base.session.ghostText,
        autocorrect: typeof s.autocorrect === 'boolean' ? s.autocorrect : base.session.autocorrect,
        shuffle: typeof s.shuffle === 'boolean' ? s.shuffle : base.session.shuffle,
      },
      sound: typeof p.sound === 'boolean' ? p.sound : base.sound,
      haptics: typeof p.haptics === 'boolean' ? p.haptics : base.haptics,
      hideAnswers: typeof p.hideAnswers === 'boolean' ? p.hideAnswers : base.hideAnswers,
    }
  } catch {
    return base
  }
}

let current: Prefs | null = null
const listeners = new Set<() => void>()

export function getPrefs(): Prefs {
  if (!current) current = read()
  return current
}

export function setPrefs(update: Partial<Prefs>) {
  current = { ...getPrefs(), ...update }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Preferences are a convenience; keep them in memory if storage is blocked.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs)
}

/** Session options <-> URL search params, so a refresh mid-run keeps the same rules. */
export function sessionToParams(o: SessionOptions): string {
  const p = new URLSearchParams()
  if (o.reveal !== 'none') p.set('reveal', o.reveal)
  if (o.ghostText) p.set('ghost', '1')
  if (o.autocorrect) p.set('lenient', '1')
  if (o.shuffle) p.set('shuffle', '1')
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function sessionFromParams(params: URLSearchParams): SessionOptions {
  const reveal = params.get('reveal') as RevealMode | null
  return {
    reveal: reveal && REVEALS.includes(reveal) ? reveal : 'none',
    ghostText: params.get('ghost') === '1',
    autocorrect: params.get('lenient') === '1',
    shuffle: params.get('shuffle') === '1',
  }
}
