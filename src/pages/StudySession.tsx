import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData } from '@/contexts/DataContext'
import type { AssistanceOptions, Card, UUID } from '@/types'
import { defaultAssistance } from '@/types'
// import { Button } from '@/components/ui/button'
import BackBar from '@/components/BackBar'
import Reveal from '@/components/Reveal'
import { Ghost, Eye, WandSparkles } from 'lucide-react'
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
    if (deckId) return state.cards.filter((c) => c.deckId === deckId)
    return [...state.cards].sort((a, b) => a.createdAt - b.createdAt)
  }, [state.cards, cardId, deckId])

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [pausedSince, setPausedSince] = useState<number | null>(null)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const advanceTimeoutRef = useRef<number | null>(null)
  // Full text visibility now decided on setup page only
  const timer = useRef(useTimer()).current
  const [, setTickCount] = useState(0)
  const cardStartRef = useRef(0)

  const card = cards[index]
  const target = card?.content ?? ''

  const { correctUntil } = useMemo(() => compareInput(target, input, options), [target, input, options])
  const wrongPart = input.slice(correctUntil)

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
    if (input.length !== correctUntil) return
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
      if (isAdvancing) return
      setIsAdvancing(true)
      // Card complete
      const totalSoFar = timer.read()
      const cardElapsed = totalSoFar - cardStartRef.current
      addTimeRecord({ scope: 'card', scopeId: card.id, elapsedMs: cardElapsed, assistance: options })

      if (cards.length === 1) {
        advanceTimeoutRef.current = window.setTimeout(() => {
          const elapsed = timer.stop()
          navigate('/done', { state: { elapsed, mode: cardId ? 'card' : 'deck', title: cardId ? card.title : 'All Decks', assistance: options } })
        }, 650)
      } else {
        // Next card after a short pause
        advanceTimeoutRef.current = window.setTimeout(() => {
          setIndex((i) => i + 1)
          setInput('')
          setPausedSince(null)
          setIsAdvancing(false)
          cardStartRef.current = totalSoFar
        }, 650)
      }
    }
  }, [correctUntil, target.length, card, cards.length, addTimeRecord, navigate, options, timer, isAdvancing, cardId])

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current != null) window.clearTimeout(advanceTimeoutRef.current)
    }
  }, [])

  // On completion of deck
  useEffect(() => {
    if (cards.length > 1 && index === cards.length) {
      const elapsed = timer.stop()
      // Record per last card already, but here record deck
      addTimeRecord({ scope: 'deck', scopeId: (deckId ?? 'all') as UUID, elapsedMs: elapsed, assistance: options })
      navigate('/done', { state: { elapsed, mode: 'deck', title: deckId ? 'Deck' : 'All Decks', assistance: options } })
    }
  }, [index, cards.length, timer, addTimeRecord, deckId, navigate, options])

  if (!card) return <p className="text-sm text-muted-foreground">Nothing to study.</p>

  const nextChars = target.slice(correctUntil, correctUntil + 8)
  const cardProgress = target.length > 0 ? Math.round((correctUntil / target.length) * 100) : 0
  const deckProgress = cards.length > 1 ? Math.round(((index + (correctUntil / target.length)) / cards.length) * 100) : 100

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4">
      <BackBar
        to={deckId ? `/decks/${deckId}` : '/'}
        label="Exit"
        title={deckId ? card.title : `${card.title} · All Decks`}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            {cards.length > 1 && (
              <>
                <div className="text-sm sm:text-base text-muted-foreground">Card {index + 1} / {cards.length}</div>
                <div className="text-sm sm:text-base font-medium text-primary">{deckProgress}%</div>
              </>
            )}
          </div>
        }
        rightSlot={<div className="text-sm sm:text-base font-medium">Elapsed: {formatTime(timer.read())}</div>}
      />

      {options.fullText && (
        <Reveal as="div" className="p-4 sm:p-5 playing-card text-sm sm:text-base whitespace-pre-wrap leading-relaxed" delay={60}>{target}</Reveal>
      )}

      <Reveal as="div" className="playing-card p-4 sm:p-5" delay={90}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm sm:text-base font-medium">Type the text exactly. Correct text turns green; mistakes show in red.</div>
          <div className="text-sm sm:text-base font-medium text-primary">{cardProgress}%</div>
        </div>
        <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          {options.ghostText && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1" title="Ghost text hint is enabled"><Ghost className="h-3.5 w-3.5" /> Ghost</span>}
          {options.fullText && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1" title="Full text panel is enabled"><Eye className="h-3.5 w-3.5" /> Full</span>}
          {options.autocorrect && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1" title="Autocorrect assist is enabled"><WandSparkles className="h-3.5 w-3.5" /> Auto</span>}
          {isAdvancing && <span className="text-primary font-medium">Nice. Next card...</span>}
        </div>

        {/* Combined highlighter + input */}
        <div
          className="relative rounded-md border bg-muted/30 min-h-[240px] sm:min-h-[220px] md:min-h-[200px] [animation:var(--shake,none)] card-surface"
          onClick={(e) => {
            const el = (e.currentTarget.querySelector('textarea') as HTMLTextAreaElement | null)
            el?.focus()
          }}
        >
          {/* Highlighter layer */}
          <div className="pointer-events-none p-4 sm:p-4 font-mono text-base sm:text-lg whitespace-pre-wrap leading-relaxed">
            {/* Typed text: green while fully correct; red from first mismatch onward */}
            <span className="!text-green-600">{input.slice(0, correctUntil)}</span>
            <span className="!text-red-600">{wrongPart}</span>
            {/* Inline ghost suggestion */}
            {options.ghostText && pausedSince !== null && input.length === correctUntil && nextChars.length > 0 && (
              <span className="!text-foreground/25 italic tracking-widest blur-[0.3px] animate-in fade-in-0 duration-150 break-words">{nextChars}</span>
            )}
          </div>

          {/* Invisible text input with visible caret overlaying highlighter */}
          <textarea
            className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 sm:p-4 font-mono text-base sm:text-lg !text-transparent caret-foreground focus:outline-none leading-relaxed"
            style={{ WebkitTextFillColor: 'transparent' }}
            rows={5}
            autoFocus
            value={input}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                const el = e.currentTarget
                const selStart = el.selectionStart ?? input.length
                if (selStart <= correctUntil) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }
            }}
            onBeforeInput={(e) => {
              const data = (e as unknown as InputEvent).data
              const inputType = (e as unknown as InputEvent).inputType
              if (inputType && inputType.startsWith('history')) {
                e.preventDefault()
                return
              }
              if (data == null || data.length === 0) return
              // Allow multi-character inserts (mobile swipe/autocorrect, replacement text, paste).
              if (data.length > 1) {
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

              // In autocorrect mode, punctuation is inserted automatically from the target text.
              // Ignore manual punctuation entry to keep behavior consistent.
              if (options.autocorrect && isPunctuation(dc)) {
                e.preventDefault()
                return
              }

              // Exact match: allow default insert.
              if (n1 === dc) return

              // Autocorrect case immediately to target casing.
              if (options.autocorrect && n1.toLowerCase() === dc.toLowerCase()) {
                e.preventDefault()
                setInput(target.slice(0, i + 1))
                return
              }

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

              // Keep wrong chars allowed, but still shake for feedback.
              const host = (e.currentTarget.parentElement as HTMLElement | null)
              if (host) {
                host.dataset.shake = '1'
                setTimeout(() => host.removeAttribute('data-shake'), 200)
              }
            }}
            onChange={(e) => {
              const v = e.target.value
              const locked = target.slice(0, correctUntil)
              let next = v
              if (!v.startsWith(locked)) {
                next = locked + v.slice(Math.max(correctUntil, 0))
              }
              if (options.autocorrect) {
                const editableSuffix = next.slice(locked.length).replace(/[\p{P}\p{S}]/gu, '')
                next = locked + editableSuffix
              }
              setInput(next)
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
    const tc = normalizeChar(target[i])
    const ic = normalizeChar(input[j])

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
