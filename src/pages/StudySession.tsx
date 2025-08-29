import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData } from '@/contexts/DataContext'
import type { AssistanceOptions, Card, UUID } from '@/types'
import { defaultAssistance } from '@/types'
// import { Button } from '@/components/ui/button'
import BackBar from '@/components/BackBar'
import Reveal from '@/components/Reveal'
// import { Button } from '@/components/ui/button'

type Timer = {
  start: () => void
  stop: () => number
  read: () => number
  reset: () => void
}

function useTimer(): Timer {
  const startRef = useRef<number | null>(null)
  const accRef = useRef(0)
  function start() {
    if (startRef.current != null) return
    startRef.current = performance.now()
  }
  function stop() {
    if (startRef.current == null) return accRef.current
    const now = performance.now()
    accRef.current += now - startRef.current
    startRef.current = null
    return accRef.current
  }
  function read() {
    if (startRef.current == null) return accRef.current
    return accRef.current + (performance.now() - startRef.current)
  }
  function reset() {
    startRef.current = null
    accRef.current = 0
  }
  return { start, stop, read, reset }
}

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function StudySession() {
  const { cardId, deckId } = useParams()
  const { state, addTimeRecord } = useData()
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const options: AssistanceOptions = navState?.options ?? defaultAssistance

  const cards: Card[] = useMemo(() => {
    if (cardId) {
      const c = state.cards.find((x) => x.id === cardId)
      return c ? [c] : []
    }
    return state.cards.filter((c) => c.deckId === deckId)
  }, [state.cards, cardId, deckId])

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [pausedSince, setPausedSince] = useState<number | null>(null)
  // Full text visibility now decided on setup page only
  const timer = useRef(useTimer()).current
  const [, setTickCount] = useState(0)
  const cardStartRef = useRef(0)

  const card = cards[index]
  const target = card?.content ?? ''

  const { correctUntil } = useMemo(() => compareInput(target, input, options), [target, input, options])

  // Start timer on first keystroke
  useEffect(() => {
    if (input.length > 0) timer.start()
  }, [input, timer])

  // Force visual updates of elapsed time even when not typing
  useEffect(() => {
    if (input.length === 0) return
    let raf = 0
    const tick = () => {
      // Read to keep timer hot and bump a counter to re-render
      timer.read()
      setTickCount((c) => (c + 1) % 1000000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [input.length, timer])

  // Show ghost text only after a brief pause without errors/changes
  useEffect(() => {
    // Reset pause timer when input changes
    setPausedSince(null)
    if (!options.ghostText) return
    if (correctUntil >= target.length) return
    const t = setTimeout(() => setPausedSince(performance.now()), 600)
    return () => clearTimeout(t)
  }, [input, options.ghostText, correctUntil, target.length])

  // Autocorrect: automatically insert any non-alphanumeric, non-space characters
  // so the user doesn't have to type punctuation or symbols.
  useEffect(() => {
    if (!options.autocorrect) return
    let i = correctUntil
    while (i < target.length) {
      const ch = target[i]
      if (isAlphaNumOrSpace(ch)) break
      i++
    }
    if (i > correctUntil) {
      setInput(target.slice(0, i))
    }
  }, [correctUntil, target, options.autocorrect])

  // On completion of a card
  useEffect(() => {
    if (!card) return
    if (correctUntil === target.length) {
      // Card complete
      const totalSoFar = timer.read()
      const cardElapsed = totalSoFar - cardStartRef.current
      addTimeRecord({ scope: 'card', scopeId: card.id, elapsedMs: cardElapsed, assistance: options })

      if (cards.length === 1) {
        const elapsed = timer.stop()
        navigate('/done', { state: { elapsed, mode: 'card', title: card.title, assistance: options } })
      } else {
        // Next card
        setIndex((i) => i + 1)
        setInput('')
        cardStartRef.current = totalSoFar
      }
    }
  }, [correctUntil, target.length, card, cards.length, addTimeRecord, navigate, options, timer])

  // On completion of deck
  useEffect(() => {
    if (cards.length > 1 && index === cards.length) {
      const elapsed = timer.stop()
      // Record per last card already, but here record deck
      addTimeRecord({ scope: 'deck', scopeId: deckId as UUID, elapsedMs: elapsed, assistance: options })
      navigate('/done', { state: { elapsed, mode: 'deck', title: 'Deck', assistance: options } })
    }
  }, [index, cards.length, timer, addTimeRecord, deckId, navigate, options])

  if (!card) return <p className="text-sm text-muted-foreground">Nothing to study.</p>

  const nextChars = target.slice(correctUntil, correctUntil + 8)

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      <BackBar
        to={deckId ? `/decks/${deckId}` : '/'}
        label="Exit"
        title={card.title}
        actions={
          <div className="flex items-center gap-2">
            {cards.length > 1 && <div className="text-xs sm:text-sm text-muted-foreground">Card {index + 1} / {cards.length}</div>}
          </div>
        }
        rightSlot={<div className="text-xs sm:text-sm">Elapsed: {formatTime(timer.read())}</div>}
      />

      {options.fullText && (
        <Reveal as="div" className="p-3 sm:p-4 playing-card text-xs sm:text-sm whitespace-pre-wrap" delay={60}>{target}</Reveal>
      )}

      <Reveal as="div" className="playing-card p-3 sm:p-4" delay={90}>
        <div className="text-xs sm:text-sm mb-2">Type the text exactly. Only correct characters are accepted.</div>

        {/* Combined highlighter + input */}
        <div
          className="relative rounded-md border bg-muted/30 min-h-[120px] sm:min-h-[160px] [animation:var(--shake,none)] card-surface"
          onClick={(e) => {
            const el = (e.currentTarget.querySelector('textarea') as HTMLTextAreaElement | null)
            el?.focus()
          }}
        >
          {/* Highlighter layer */}
          <div className="pointer-events-none p-2 sm:p-3 font-mono text-sm sm:text-base whitespace-pre-wrap">
            {/* Typed (always correct, since we block wrong input) */}
            <span className="text-green-600">{input}</span>
            {/* Inline ghost suggestion */}
            {options.ghostText && pausedSince !== null && nextChars.length > 0 && (
              <span className="text-foreground/40 italic animate-in fade-in-0 duration-150">{nextChars}</span>
            )}
          </div>

          {/* Invisible text input with visible caret overlaying highlighter */}
          <textarea
            className="absolute inset-0 w-full h-full resize-none bg-transparent p-2 sm:p-3 font-mono text-sm sm:text-base text-transparent caret-foreground focus:outline-none"
            rows={5}
            autoFocus
            value={input}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            onBeforeInput={(e) => {
              const data = (e as unknown as InputEvent).data
              const inputType = (e as unknown as InputEvent).inputType
              // Disallow deletions, pastes of multiple chars, and history actions
              if (inputType && (inputType.startsWith('delete') || inputType.startsWith('history'))) {
                e.preventDefault()
                return
              }
              if (data == null || data.length === 0) return
              // If a paste attempts multiple characters, block (we only accept single next char at a time)
              if (data.length > 1) {
                e.preventDefault()
                return
              }

              const i = correctUntil
              const t1 = target[i]
              if (!t1) {
                e.preventDefault()
                return
              }
              const dc = normalizeChar(data)
              const n1 = normalizeChar(t1)

              // Direct match (case-insensitive when autocorrect)
              const directOk = options.autocorrect ? n1.toLowerCase() === dc.toLowerCase() : n1 === dc
              if (directOk) return // allow default

              // Autocorrect: skip punctuation in target by auto-inserting it
              if (options.autocorrect && isPunctuation(n1)) {
                const t2 = target[i + 1]
                if (t2) {
                  const n2 = normalizeChar(t2)
                  const nextOk = n2.toLowerCase() === dc.toLowerCase()
                  if (nextOk) {
                    // Prevent default and auto-advance by inserting the punctuation + char
                    e.preventDefault()
                    setInput(target.slice(0, i + 2))
                    return
                  }
                }
              }

              // Otherwise reject and shake
              const host = (e.currentTarget.parentElement as HTMLElement | null)
              if (host) {
                host.dataset.shake = '1'
                setTimeout(() => host.removeAttribute('data-shake'), 200)
              }
              e.preventDefault()
            }}
            onChange={(e) => {
              // Safety for IME/edge cases: fold to longest matching prefix (case-insensitive if autocorrect)
              const v = e.target.value
              let k = 0
              while (k < v.length && k < target.length) {
                const tc = normalizeChar(target[k])
                const vc = normalizeChar(v[k])
                const eq = options.autocorrect ? tc.toLowerCase() === vc.toLowerCase() : tc === vc
                if (!eq) break
                k++
              }
              setInput(target.slice(0, k))
            }}
          />
        </div>

        {/* Inline ghost is shown within the field above; no bottom ghost line */}

        {/* Removed Back button: only correct chars are accepted now */}
      </Reveal>
    </div>
  )
}

function normalizeChar(ch: string) {
  return ch.normalize('NFC')
}

function isPunctuation(ch: string) {
  return /[\p{P}\p{S}]/u.test(ch)
}

function isAlphaNumOrSpace(ch: string) {
  return /[\p{L}\p{N} ]/u.test(ch)
}

function compareInput(target: string, input: string, options: AssistanceOptions) {
  let i = 0
  let j = 0
  while (i < target.length && j < input.length) {
    let tc = normalizeChar(target[i])
    let ic = normalizeChar(input[j])

    // Autocorrect: ignore case mismatches
    const eq = options.autocorrect ? tc.toLowerCase() === ic.toLowerCase() : tc === ic

    if (eq) {
      i++; j++; continue
    }

    // Autocorrect: allow skipping punctuation present in target
    if (options.autocorrect && isPunctuation(tc)) {
      i++
      continue
    }

    // mismatch
    return { correctUntil: i, errorAt: i }
  }

  // If input longer than target, stop at mismatch
  if (j < input.length) {
    return { correctUntil: i, errorAt: i }
  }

  return { correctUntil: i, errorAt: null as number | null }
}
