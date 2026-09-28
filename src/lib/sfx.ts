import { getPrefs } from '@/lib/prefs'

// Tiny synthesized sound effects: no audio files to download, and nothing
// plays until the user has interacted (browsers require a gesture anyway).

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (!getPrefs().sound) return null
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, { at = 0, dur = 0.12, type = 'sine' as OscillatorType, gain = 0.08, slide = 0 } = {}) {
  const ac = audio()
  if (!ac) return
  const t0 = ac.currentTime + at
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function vibrate(pattern: number | number[]) {
  if (!getPrefs().haptics) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // unsupported
  }
}

export const sfx = {
  /** Wake the audio context during a user gesture so later sounds aren't blocked. */
  unlock() {
    audio()
  },
  mistake() {
    tone(140, { dur: 0.09, type: 'triangle', gain: 0.07, slide: -40 })
    vibrate(14)
  },
  hint() {
    tone(660, { dur: 0.08, type: 'sine', gain: 0.04 })
  },
  cardDone() {
    tone(784, { dur: 0.1, gain: 0.06 })
    tone(1175, { at: 0.07, dur: 0.16, gain: 0.05 })
    vibrate(10)
  },
  chips(count = 5) {
    for (let i = 0; i < Math.min(count, 8); i += 1) {
      tone(2200 + Math.random() * 900, { at: 0.18 + i * 0.07, dur: 0.05, type: 'square', gain: 0.018 })
    }
  },
  win() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.22, type: 'triangle', gain: 0.07 }))
    vibrate([12, 40, 12])
  },
}
