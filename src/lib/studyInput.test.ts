import { describe, expect, it } from 'vitest'
import {
  applyBeforeInputEdit,
  canonicalizeInput,
  compareInput,
  reconcileRawInput,
} from '@/lib/studyInput'
import type { AssistanceOptions } from '@/types'

const plain: AssistanceOptions = {
  ghostText: false,
  fullText: false,
  autocorrect: false,
}

const auto: AssistanceOptions = {
  ghostText: false,
  fullText: false,
  autocorrect: true,
}

describe('compareInput', () => {
  it('matches exact input without assistance', () => {
    expect(compareInput('hello world', 'hello wo', plain)).toEqual({ correctUntil: 8, errorAt: null })
  })

  it('ignores case and skips punctuation in autocorrect mode', () => {
    expect(compareInput('Hello, world!', 'hello world', auto)).toEqual({ correctUntil: 12, errorAt: null })
  })
})

describe('canonicalizeInput', () => {
  it('uses target casing and punctuation for the correct prefix', () => {
    expect(canonicalizeInput('Hello, world!', 'hello world', auto)).toBe('Hello, world')
  })

  it('preserves the wrong suffix after the first mismatch', () => {
    expect(canonicalizeInput('Hello, world!', 'hello worm', auto)).toBe('Hello, worm')
  })
})

describe('applyBeforeInputEdit', () => {
  it('lets backspace delete a selected wrong suffix at the lock boundary', () => {
    const result = applyBeforeInputEdit({
      target: 'hello world',
      currentInput: 'hello worng',
      selectionStart: 9,
      selectionEnd: 11,
      inputType: 'deleteContentBackward',
      data: null,
      options: plain,
    })

    expect(result).toEqual({
      handled: true,
      nextInput: 'hello wor',
      shouldShake: false,
    })
  })

  it('blocks backspace inside the locked correct prefix', () => {
    const result = applyBeforeInputEdit({
      target: 'hello world',
      currentInput: 'hello wrong',
      selectionStart: 6,
      selectionEnd: 6,
      inputType: 'deleteContentBackward',
      data: null,
      options: plain,
    })

    expect(result.nextInput).toBe('hello wrong')
  })

  it('replaces a wrong word with an autocomplete replacement', () => {
    const result = applyBeforeInputEdit({
      target: 'hello world',
      currentInput: 'hello wrong',
      selectionStart: 6,
      selectionEnd: 11,
      inputType: 'insertReplacementText',
      data: 'world',
      options: plain,
    })

    expect(result).toEqual({
      handled: true,
      nextInput: 'hello world',
      shouldShake: false,
    })
  })

  it('preserves the locked prefix when replacement starts before it', () => {
    const result = applyBeforeInputEdit({
      target: 'hello world',
      currentInput: 'hello wrong',
      selectionStart: 4,
      selectionEnd: 11,
      inputType: 'insertReplacementText',
      data: 'world',
      options: plain,
    })

    expect(result.nextInput).toBe('hello world')
  })

  it('canonicalizes single-character case mismatches in autocorrect mode', () => {
    const result = applyBeforeInputEdit({
      target: 'Hello',
      currentInput: '',
      selectionStart: 0,
      selectionEnd: 0,
      inputType: 'insertText',
      data: 'h',
      options: auto,
    })

    expect(result.nextInput).toBe('H')
  })

  it('removes manual punctuation from inserted autocomplete text in autocorrect mode', () => {
    const result = applyBeforeInputEdit({
      target: "Hello, world!",
      currentInput: '',
      selectionStart: 0,
      selectionEnd: 0,
      inputType: 'insertReplacementText',
      data: 'hello world!',
      options: auto,
    })

    expect(result.nextInput).toBe('Hello, world')
  })

  it('keeps a wrong autocomplete word editable after canonicalizing the matching prefix', () => {
    const result = applyBeforeInputEdit({
      target: 'hello world',
      currentInput: '',
      selectionStart: 0,
      selectionEnd: 0,
      inputType: 'insertReplacementText',
      data: 'hello planet',
      options: plain,
    })

    expect(result.nextInput).toBe('hello planet')
    expect(compareInput('hello world', result.nextInput, plain).correctUntil).toBe(6)
  })
})

describe('reconcileRawInput', () => {
  it('restores the locked prefix when a raw browser change deletes into it', () => {
    const next = reconcileRawInput({
      target: 'hello world',
      currentInput: 'hello planet',
      rawValue: 'hell',
      options: plain,
    })

    expect(next).toBe('hello ')
  })

  it('strips punctuation from the editable suffix in autocorrect mode', () => {
    const next = reconcileRawInput({
      target: 'Hello, world!',
      currentInput: 'Hello, ',
      rawValue: 'Hello, world!',
      options: auto,
    })

    expect(next).toBe('Hello, world')
  })
})
