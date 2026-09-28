import type { AssistanceOptions } from '@/types'

/**
 * Pure typing engine for study sessions.
 *
 * The model: the user's input always grows from the end (no caret moves).
 * Everything that matches the target is a locked "correct prefix"; anything
 * after the first mismatch is a "wrong suffix" the user has to delete.
 * All functions here are string -> string so they work the same for desktop
 * keydown typing, mobile IME composition, autocomplete replacements and
 * swipe keyboards: the component just feeds in whatever the textarea holds.
 */

type MatchOptions = Pick<AssistanceOptions, 'autocorrect'>

/** Longest wrong suffix we keep; beyond this extra keystrokes are ignored. */
export const MAX_WRONG = 24

const PUNCT_OR_SYMBOL = /[\p{P}\p{S}]/u
const WHITESPACE = /\s/u
const WORD_CHAR = /[\p{L}\p{N}]/u
const COMBINING = /\p{M}/gu

// Keyboards (esp. iOS "smart punctuation") substitute typographic characters.
// Treat them as equivalent so a curly apostrophe is never a memory mistake.
const FOLD: Record<string, string> = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'", '`': "'", '´': "'",
  '“': '"', '”': '"', '„': '"', '‟': '"', '″': '"', '«': '"', '»': '"',
  '‐': '-', '‑': '-', '‒': '-', '–': '-', '—': '-', '―': '-', '−': '-',
}

export function foldChar(ch: string): string {
  const c = ch.normalize('NFC')
  return FOLD[c] ?? c
}

export function isPunctuation(ch: string) {
  return PUNCT_OR_SYMBOL.test(ch)
}

export function isWhitespace(ch: string) {
  return WHITESPACE.test(ch)
}

export function isWordChar(ch: string) {
  return WORD_CHAR.test(ch)
}

function loosen(ch: string) {
  return ch.normalize('NFD').replace(COMBINING, '').toLowerCase()
}

/** Does typed char `ic` satisfy target char `tc`? */
export function charsMatch(tc: string, ic: string, options: MatchOptions): boolean {
  if (isWhitespace(tc) && isWhitespace(ic)) return true // space, Enter and tab are interchangeable
  const t = foldChar(tc)
  const i = foldChar(ic)
  if (t === i) return true
  return options.autocorrect && loosen(t) === loosen(i)
}

/** In lenient mode punctuation/symbols are typed for you. */
function autoTyped(ch: string, options: MatchOptions) {
  return options.autocorrect && isPunctuation(ch)
}

/**
 * Walks target and input together. `correctUntil` is how many target chars
 * are satisfied; `consumed` is how many input chars that took (they differ in
 * lenient mode, where skipped punctuation consumes no input).
 */
export function compareInput(target: string, input: string, options: MatchOptions) {
  let i = 0
  let j = 0
  while (i < target.length && j < input.length) {
    if (charsMatch(target[i], input[j], options)) {
      i += 1
      j += 1
    } else if (autoTyped(target[i], options)) {
      i += 1
    } else {
      break
    }
  }
  return { correctUntil: i, consumed: j, errorAt: j < input.length ? i : null }
}

/** Rewrites the matching prefix with the target's own characters (casing, quotes, punctuation). */
export function canonicalizeInput(target: string, input: string, options: MatchOptions) {
  const { correctUntil, consumed } = compareInput(target, input, options)
  return target.slice(0, correctUntil) + input.slice(consumed)
}

/** In lenient mode, once everything typed is correct, fill in upcoming punctuation. */
export function autoAdvance(target: string, input: string, options: MatchOptions) {
  if (!options.autocorrect || input.length === 0) return input
  const { correctUntil, consumed } = compareInput(target, input, options)
  if (consumed < input.length) return input
  let i = correctUntil
  while (i < target.length && isPunctuation(target[i])) i += 1
  return i > correctUntil ? target.slice(0, i) : input
}

/**
 * Turns whatever the text field now contains (`raw`) into the next canonical input,
 * given the previous canonical input. Guarantees:
 *  - the previously-correct prefix can never be deleted or altered,
 *  - in lenient mode, manually typed punctuation is dropped (it's auto-inserted),
 *  - the wrong suffix never exceeds MAX_WRONG chars.
 *
 * `raw` may disagree with `previous` in arbitrary ways: during IME composition we
 * can't write the canonical text back into the field, autocomplete may replace a
 * whole word, and swipe keyboards insert several words at once. So rather than
 * diffing, re-align all of `raw` against the target and only fall back to
 * "locked prefix + extra" when that would lose progress.
 */
export function reconcile(target: string, previous: string, raw: string, options: MatchOptions): string {
  const lockedLen = compareInput(target, previous, options).correctUntil
  const clean = (s: string) => {
    const noCr = s.replace(/\r/g, '')
    return options.autocorrect ? noCr.replace(/[\p{P}\p{S}]/gu, '') : noCr
  }

  const cleaned = clean(raw)
  let next = canonicalizeInput(target, cleaned, options)
  if (compareInput(target, next, options).correctUntil < lockedLen) {
    // Deleted into, or replaced, the locked prefix: restore it and keep only what
    // extends beyond its length.
    const locked = target.slice(0, lockedLen)
    const lockedCleanLen = clean(locked).length
    const tail = cleaned.length > lockedCleanLen ? cleaned.slice(lockedCleanLen) : ''
    next = canonicalizeInput(target, locked + tail, options)
  }

  const nextCorrect = compareInput(target, next, options).correctUntil
  if (next.length - nextCorrect > MAX_WRONG) next = next.slice(0, nextCorrect + MAX_WRONG)
  return autoAdvance(target, next, options)
}

/**
 * Index just past the next word starting at `from`: skips whitespace, and skips
 * punctuation-only fragments (e.g. the "," left after "Hi") so a hint always
 * reveals at least one real word.
 */
export function nextWordEnd(target: string, from: number) {
  let i = from
  while (i < target.length) {
    while (i < target.length && isWhitespace(target[i])) i += 1
    const start = i
    while (i < target.length && !isWhitespace(target[i])) i += 1
    if (WORD_CHAR.test(target.slice(start, i))) return i
  }
  return i
}

/** Input after using a hint: drops any wrong suffix and completes the next word. */
export function applyHint(target: string, input: string, options: MatchOptions) {
  const { correctUntil } = compareInput(target, input, options)
  const end = nextWordEnd(target, correctUntil)
  return autoAdvance(target, target.slice(0, end), options)
}

/** Per-character flags marking the first letter/number of every word. */
export function wordInitials(target: string): boolean[] {
  const flags = new Array<boolean>(target.length).fill(false)
  let seenInWord = false
  for (let i = 0; i < target.length; i += 1) {
    const ch = target[i]
    if (isWhitespace(ch)) {
      seenInWord = false
    } else if (!seenInWord && isWordChar(ch)) {
      flags[i] = true
      seenInWord = true
    }
  }
  return flags
}

export function countWords(text: string) {
  const m = text.trim().match(/\S+/g)
  return m ? m.length : 0
}
