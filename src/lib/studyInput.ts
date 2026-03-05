import type { AssistanceOptions } from '@/types'

type StudyEditArgs = {
  target: string
  currentInput: string
  selectionStart: number | null
  selectionEnd: number | null
  inputType?: string | null
  data?: string | null
  options: AssistanceOptions
}

type StudyEditResult = {
  handled: boolean
  nextInput: string
  shouldShake: boolean
  selectionStart: number | null
  selectionEnd: number | null
}

export function normalizeChar(ch: string) {
  return ch.normalize('NFC')
}

export function isPunctuation(ch: string) {
  return /[\p{P}\p{S}]/u.test(ch)
}

export function isAlphaNumOrSpace(ch: string) {
  return /[\p{L}\p{N} ]/u.test(ch)
}

export function compareInput(target: string, input: string, options: AssistanceOptions) {
  let i = 0
  let j = 0
  while (i < target.length && j < input.length) {
    const tc = normalizeChar(target[i])
    const ic = normalizeChar(input[j])
    const eq = options.autocorrect ? tc.toLowerCase() === ic.toLowerCase() : tc === ic

    if (eq) {
      i += 1
      j += 1
      continue
    }

    if (options.autocorrect && isPunctuation(tc)) {
      i += 1
      continue
    }

    return { correctUntil: i, errorAt: i }
  }

  if (j < input.length) {
    return { correctUntil: i, errorAt: i }
  }

  return { correctUntil: i, errorAt: null as number | null }
}

export function canonicalizeInput(target: string, input: string, options: AssistanceOptions) {
  let i = 0
  let j = 0
  let canonical = ''

  while (i < target.length && j < input.length) {
    const tc = normalizeChar(target[i])
    const ic = normalizeChar(input[j])
    const eq = options.autocorrect ? tc.toLowerCase() === ic.toLowerCase() : tc === ic

    if (eq) {
      canonical += target[i]
      i += 1
      j += 1
      continue
    }

    if (options.autocorrect && isPunctuation(tc)) {
      canonical += target[i]
      i += 1
      continue
    }

    break
  }

  return canonical + input.slice(j)
}

export function reconcileRawInput(args: Omit<StudyEditArgs, 'selectionStart' | 'selectionEnd' | 'inputType' | 'data'> & { rawValue: string }) {
  const { target, currentInput, rawValue, options } = args
  const { correctUntil } = compareInput(target, currentInput, options)
  const lockedPrefix = target.slice(0, correctUntil)
  let next = rawValue

  if (!next.startsWith(lockedPrefix)) {
    next = next.length <= lockedPrefix.length ? lockedPrefix : lockedPrefix + next.slice(lockedPrefix.length)
  }

  if (options.autocorrect) {
    next = lockedPrefix + stripManualPunctuation(next.slice(lockedPrefix.length))
  }

  return canonicalizeInput(target, next, options)
}

export function applyBeforeInputEdit(args: StudyEditArgs): StudyEditResult {
  const { target, currentInput, options } = args
  const inputType = args.inputType ?? ''
  const { correctUntil } = compareInput(target, currentInput, options)
  const selectionStart = clampSelection(args.selectionStart ?? currentInput.length, currentInput.length)
  const selectionEnd = clampSelection(args.selectionEnd ?? selectionStart, currentInput.length)
  const safeSelectionStart = Math.min(selectionStart, selectionEnd)
  const safeSelectionEnd = Math.max(selectionStart, selectionEnd)

  if (inputType.startsWith('history')) {
    return { handled: true, nextInput: currentInput, shouldShake: false, selectionStart, selectionEnd }
  }

  if (inputType.startsWith('delete')) {
    const nextInput = applyDeletion({
      currentInput,
      inputType,
      lockedLength: correctUntil,
      selectionStart: safeSelectionStart,
      selectionEnd: safeSelectionEnd,
    })

    return {
      handled: true,
      nextInput,
      shouldShake: false,
      selectionStart: getSafeCaretPosition(target, nextInput, options, safeSelectionStart),
      selectionEnd: getSafeCaretPosition(target, nextInput, options, safeSelectionStart),
    }
  }

  if (inputType.includes('Composition')) {
    return { handled: false, nextInput: currentInput, shouldShake: false, selectionStart: null, selectionEnd: null }
  }

  const insertedText = getInsertedText(inputType, args.data)
  if (insertedText == null) {
    return { handled: false, nextInput: currentInput, shouldShake: false, selectionStart: null, selectionEnd: null }
  }

  const replacementStart = Math.max(safeSelectionStart, correctUntil)
  const replacementEnd = Math.max(safeSelectionEnd, correctUntil)
  let sanitizedText = options.autocorrect ? stripManualPunctuation(insertedText) : insertedText
  if (safeSelectionStart < correctUntil) {
    const protectedPrefix = currentInput.slice(safeSelectionStart, correctUntil)
    sanitizedText = trimProtectedOverlap(sanitizedText, protectedPrefix, options)
  }

  if (sanitizedText.length === 0) {
    return { handled: true, nextInput: currentInput, shouldShake: false, selectionStart, selectionEnd }
  }

  const draft = currentInput.slice(0, replacementStart) + sanitizedText + currentInput.slice(replacementEnd)
  const nextInput = canonicalizeInput(target, draft, options)
  const nextCorrectUntil = compareInput(target, nextInput, options).correctUntil
  const nextCaret = getSafeCaretPosition(target, nextInput, options, replacementStart + sanitizedText.length)

  return {
    handled: true,
    nextInput,
    shouldShake: nextCorrectUntil <= correctUntil,
    selectionStart: nextCaret,
    selectionEnd: nextCaret,
  }
}

function clampSelection(value: number, inputLength: number) {
  return Math.max(0, Math.min(value, inputLength))
}

function stripManualPunctuation(text: string) {
  return text.replace(/[\p{P}\p{S}]/gu, '')
}

function getInsertedText(inputType: string, data: string | null | undefined) {
  if (inputType === 'insertLineBreak') return '\n'
  if (!inputType.startsWith('insert')) return null
  return data ?? ''
}

function trimProtectedOverlap(text: string, protectedPrefix: string, options: AssistanceOptions) {
  if (protectedPrefix.length === 0) return text

  const maxOverlap = Math.min(protectedPrefix.length, text.length)
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    const protectedSuffix = protectedPrefix.slice(protectedPrefix.length - overlap)
    if (textStartsWithEquivalent(text, protectedSuffix, options)) {
      return text.slice(overlap)
    }
  }

  return text
}

function textStartsWithEquivalent(text: string, prefix: string, options: AssistanceOptions) {
  if (prefix.length > text.length) return false

  for (let i = 0; i < prefix.length; i += 1) {
    const prefixChar = normalizeChar(prefix[i])
    const textChar = normalizeChar(text[i])
    const eq = options.autocorrect ? prefixChar.toLowerCase() === textChar.toLowerCase() : prefixChar === textChar
    if (!eq) return false
  }

  return true
}

function applyDeletion(args: {
  currentInput: string
  inputType: string
  lockedLength: number
  selectionStart: number
  selectionEnd: number
}) {
  const { currentInput, inputType, lockedLength, selectionStart, selectionEnd } = args

  if (selectionStart !== selectionEnd) {
    const deleteStart = Math.max(selectionStart, lockedLength)
    const deleteEnd = Math.max(selectionEnd, lockedLength)
    if (deleteStart >= deleteEnd) return currentInput
    return currentInput.slice(0, deleteStart) + currentInput.slice(deleteEnd)
  }

  if (inputType.includes('Forward')) {
    const deleteIndex = Math.max(selectionStart, lockedLength)
    if (deleteIndex >= currentInput.length) return currentInput
    return currentInput.slice(0, deleteIndex) + currentInput.slice(deleteIndex + 1)
  }

  if (selectionStart <= lockedLength) return currentInput
  return currentInput.slice(0, selectionStart - 1) + currentInput.slice(selectionEnd)
}

function getSafeCaretPosition(target: string, input: string, options: AssistanceOptions, preferredPosition: number) {
  const { correctUntil } = compareInput(target, input, options)
  return clampSelection(Math.max(correctUntil, preferredPosition), input.length)
}
