import { describe, expect, it } from 'vitest'
import {
  MAX_WRONG,
  applyHint,
  autoAdvance,
  canonicalizeInput,
  charsMatch,
  compareInput,
  countWords,
  nextWordEnd,
  reconcile,
  wordInitials,
} from '@/lib/studyInput'

const strict = { autocorrect: false }
const lenient = { autocorrect: true }

describe('charsMatch', () => {
  it('treats smart quotes and dashes as their plain equivalents', () => {
    expect(charsMatch("'", '’', strict)).toBe(true)
    expect(charsMatch('“', '"', strict)).toBe(true)
    expect(charsMatch('—', '-', strict)).toBe(true)
  })

  it('lets any whitespace stand in for a line break', () => {
    expect(charsMatch('\n', ' ', strict)).toBe(true)
    expect(charsMatch(' ', '\n', strict)).toBe(true)
  })

  it('is case- and accent-insensitive only in lenient mode', () => {
    expect(charsMatch('A', 'a', strict)).toBe(false)
    expect(charsMatch('A', 'a', lenient)).toBe(true)
    expect(charsMatch('é', 'e', lenient)).toBe(true)
  })
})

describe('compareInput', () => {
  it('matches exact input without assistance', () => {
    expect(compareInput('hello world', 'hello wo', strict)).toEqual({ correctUntil: 8, consumed: 8, errorAt: null })
  })

  it('reports the first mismatch', () => {
    expect(compareInput('hello', 'help', strict)).toEqual({ correctUntil: 3, consumed: 3, errorAt: 3 })
  })

  it('ignores case and skips punctuation in lenient mode', () => {
    expect(compareInput('Hello, world!', 'hello world', lenient)).toMatchObject({ correctUntil: 12, errorAt: null })
  })
})

describe('canonicalizeInput', () => {
  it('uses target casing and punctuation for the correct prefix', () => {
    expect(canonicalizeInput('Hello, world!', 'hello world', lenient)).toBe('Hello, world')
  })

  it('preserves the wrong suffix after the first mismatch', () => {
    expect(canonicalizeInput('Hello, world!', 'hello worm', lenient)).toBe('Hello, worm')
  })

  it('replaces smart quotes with the target character', () => {
    expect(canonicalizeInput("don't", 'don’t', strict)).toBe("don't")
  })
})

describe('autoAdvance', () => {
  it('fills trailing punctuation once the input is correct', () => {
    expect(autoAdvance('Hi, "you"!', 'hi', lenient)).toBe('Hi,')
    expect(autoAdvance('Hi, "you"!', 'Hi, ', lenient)).toBe('Hi, "')
  })

  it('does nothing in strict mode or with a wrong suffix', () => {
    expect(autoAdvance('Hi, you', 'Hi', strict)).toBe('Hi')
    expect(autoAdvance('Hi, you', 'Hx', lenient)).toBe('Hx')
  })

  it('does not auto-type whitespace or line breaks', () => {
    expect(autoAdvance('end.\nNext', 'end', lenient)).toBe('end.')
  })
})

describe('reconcile', () => {
  it('appends normal typing', () => {
    expect(reconcile('hello world', 'hello', 'hello ', strict)).toBe('hello ')
  })

  it('keeps a wrong suffix so the user can see and delete it', () => {
    expect(reconcile('hello world', 'hello ', 'hello x', strict)).toBe('hello x')
    expect(reconcile('hello world', 'hello x', 'hello ', strict)).toBe('hello ')
  })

  it('never lets the correct prefix be deleted', () => {
    expect(reconcile('hello world', 'hello', 'hell', strict)).toBe('hello')
    expect(reconcile('hello world', 'hello', '', strict)).toBe('hello')
  })

  it('accepts an autocomplete that replaces the current word', () => {
    // Keyboard swaps "wrold" for "world" in one replacement.
    expect(reconcile('hello world', 'hello wrold', 'hello world', strict)).toBe('hello world')
  })

  it('salvages text typed past a replaced locked prefix', () => {
    expect(reconcile('hello world', 'hello', 'HELLO w', strict)).toBe('hello w')
  })

  it('drops manually typed punctuation in lenient mode', () => {
    expect(reconcile('Hello, world', 'Hello,', 'Hello,, w', lenient)).toBe('Hello, w')
  })

  it('keeps up when the field lags behind auto-inserted punctuation (IME composition)', () => {
    // Canonical is "Hello, wor" but the composing field never received the comma.
    expect(reconcile('Hello, world', 'Hello, wor', 'Hello worl', lenient)).toBe('Hello, worl')
    expect(reconcile('Hello, world', 'Hello,', 'Hello', lenient)).toBe('Hello,')
  })

  it('accepts a swipe keyboard inserting several words at once', () => {
    expect(reconcile('the quick brown fox', 'the ', 'the quick brown ', strict)).toBe('the quick brown ')
  })

  it('protects the locked prefix in lenient mode', () => {
    expect(reconcile('Hello, world', 'Hello, w', 'Hello, ', lenient)).toBe('Hello, w')
    expect(reconcile('Hello, world', 'Hello, wx', 'Hello, w', lenient)).toBe('Hello, w')
  })

  it('caps the wrong suffix length', () => {
    const next = reconcile('abc', '', 'x'.repeat(100), strict)
    expect(next).toHaveLength(MAX_WRONG)
  })

  it('strips carriage returns', () => {
    expect(reconcile('a\nb', 'a', 'a\r\n', strict)).toBe('a\n')
  })

  it('accepts Enter for a space and vice versa', () => {
    expect(reconcile('roses are red\nviolets', 'roses are red', 'roses are red ', strict)).toBe('roses are red\n')
  })
})

describe('hints', () => {
  it('finds the end of the next word', () => {
    expect(nextWordEnd('one two three', 3)).toBe(7)
    expect(nextWordEnd('one two three', 0)).toBe(3)
    expect(nextWordEnd('one', 3)).toBe(3)
    expect(nextWordEnd('Hi, you', 2)).toBe(7)
  })

  it('completes the current word and discards mistakes', () => {
    expect(applyHint('one two three', 'one tx', strict)).toBe('one two')
    expect(applyHint('Hi, you there', 'hi', lenient)).toBe('Hi, you')
  })
})

describe('wordInitials', () => {
  it('flags the first letter of each word, skipping leading punctuation', () => {
    const flags = wordInitials('"Hi" to-do 42')
    const initials = [...'"Hi" to-do 42'].filter((_, i) => flags[i]).join('')
    expect(initials).toBe('Ht4')
  })
})

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('  one two\nthree  ')).toBe(3)
    expect(countWords('')).toBe(0)
  })
})
