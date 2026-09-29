import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Lightbulb, RotateCcw, X } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useToast } from '@/components/Toaster'
import RunResults, { type CardResult, type RunSummary } from '@/components/RunResults'
import { Button } from '@/components/ui/button'
import { applyHint, compareInput, countWords, isWhitespace, isWordChar, nextWordEnd, reconcile, wordInitials } from '@/lib/studyInput'
import { accuracyPct, chipsFor, formatTime, rankHand, wordsPerMinute } from '@/lib/scoring'
import { isTouchDevice, sessionFromParams } from '@/lib/prefs'
import { sfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'
import type { AssistanceOptions, Card, RevealMode, SessionOptions, UUID } from '@/types'

const SUITS = ['♠', '♥', '♣', '♦']
const GHOST_DELAY_MS = 1200
const ADVANCE_DELAY_MS = 900

function deal(cards: Card[], shuffle: boolean) {
  const out = [...cards]
  if (shuffle) {
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
  }
  return out
}

export default function StudySession() {
  const { cardId, deckId } = useParams()
  const [params] = useSearchParams()
  const paramString = params.toString()
  const options = useMemo(() => sessionFromParams(new URLSearchParams(paramString)), [paramString])
  const { state } = useData()

  const pool = useMemo(() => {
    if (cardId) return state.cards.filter((c) => c.id === cardId)
    if (deckId) return state.cards.filter((c) => c.deckId === deckId)
    return [...state.cards].sort((a, b) => a.createdAt - b.createdAt)
  }, [state.cards, cardId, deckId])

  const [run, setRun] = useState(() => ({ key: 0, cards: deal(pool, options.shuffle) }))
  const replay = useCallback(() => setRun((r) => ({ key: r.key + 1, cards: deal(pool, options.shuffle) })), [pool, options.shuffle])

  // Navigating card -> card (e.g. "Next card" on the results screen) reuses this component.
  const scopeKey = `${cardId ?? ''}|${deckId ?? ''}|${paramString}`
  const [lastScope, setLastScope] = useState(scopeKey)
  if (lastScope !== scopeKey) {
    setLastScope(scopeKey)
    setRun((r) => ({ key: r.key + 1, cards: deal(pool, options.shuffle) }))
  }

  const deck = deckId ? state.decks.find((d) => d.id === deckId) : cardId ? state.decks.find((d) => d.id === pool[0]?.deckId) : undefined
  const exitTo = deck ? `/decks/${deck.id}` : '/'

  if (run.cards.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Nothing to study</h1>
        <p className="mt-2 text-muted-foreground">This {cardId ? 'card' : 'deck'} has no cards yet.</p>
        <Button asChild className="mt-6">
          <Link to={exitTo}>Go back</Link>
        </Button>
      </div>
    )
  }

  return (
    <StudyRun
      key={run.key}
      cards={run.cards}
      options={options}
      scope={cardId ? 'card' : 'deck'}
      scopeId={(cardId ?? deckId ?? 'all') as UUID}
      title={cardId ? run.cards[0].title : deck?.name ?? 'All decks'}
      exitTo={exitTo}
      onReplay={replay}
      nextCardId={cardId && deck ? nextCardInDeck(state.cards, deck.id, cardId) : undefined}
    />
  )
}

function nextCardInDeck(cards: Card[], deckId: string, cardId: string) {
  const inDeck = cards.filter((c) => c.deckId === deckId)
  const i = inDeck.findIndex((c) => c.id === cardId)
  return i >= 0 && i < inDeck.length - 1 ? inDeck[i + 1].id : undefined
}

/** Stopwatch that only runs while the user is actively typing. */
function useStopwatch() {
  const ref = useRef({ acc: 0, since: null as number | null })
  return useMemo(
    () => ({
      start() {
        if (ref.current.since == null) ref.current.since = performance.now()
      },
      pause() {
        const t = ref.current
        if (t.since != null) {
          t.acc += performance.now() - t.since
          t.since = null
        }
      },
      read() {
        const t = ref.current
        return t.acc + (t.since != null ? performance.now() - t.since : 0)
      },
      running() {
        return ref.current.since != null
      },
    }),
    []
  )
}

type Phase = 'play' | 'card-done' | 'results'

function StudyRun({
  cards,
  options,
  scope,
  scopeId,
  title,
  exitTo,
  onReplay,
  nextCardId,
}: {
  cards: Card[]
  options: SessionOptions
  scope: 'card' | 'deck'
  scopeId: UUID
  title: string
  exitTo: string
  onReplay: () => void
  nextCardId?: string
}) {
  const { addTimeRecord, getBestTimes, completeRun } = useData()
  const toast = useToast()
  const assistance: AssistanceOptions = useMemo(
    () => ({ reveal: options.reveal, ghostText: options.ghostText, autocorrect: options.autocorrect }),
    [options.reveal, options.ghostText, options.autocorrect]
  )

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('play')
  const [focused, setFocused] = useState(false)
  const [typing, setTyping] = useState(false)
  const [ghostEnd, setGhostEnd] = useState(0)
  const [cardHints, setCardHints] = useState(0)
  const [summary, setSummary] = useState<RunSummary | null>(null)

  const card = cards[index]
  const target = card.content
  const initials = useMemo(() => wordInitials(target), [target])

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const caretRef = useRef<HTMLSpanElement | null>(null)
  const timeRef = useRef<HTMLSpanElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const composingRef = useRef(false)
  const inputRef = useRef('')
  const phaseRef = useRef<Phase>('play')
  const mistakesRef = useRef(0)
  const hintsRef = useRef(0)
  const cardStartRef = useRef(0)
  const resultsRef = useRef<CardResult[]>([])
  const timeouts = useRef<number[]>([])
  const typingTimer = useRef<number | null>(null)
  const advanceTimer = useRef<number | null>(null)
  const indexRef = useRef(0)
  const timer = useStopwatch()

  const { correctUntil } = compareInput(target, input, assistance)
  const wrongText = input.slice(correctUntil)
  const cardProgress = target.length ? correctUntil / target.length : 1
  const runProgress = (index + (phase === 'play' ? cardProgress : 1)) / cards.length

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const later = (fn: () => void, ms: number) => {
    timeouts.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => {
    const pending = timeouts.current
    const adv = advanceTimer
    return () => {
      pending.forEach((t) => window.clearTimeout(t))
      if (adv.current != null) window.clearTimeout(adv.current)
    }
  }, [])

  // Live clock without re-rendering the whole tree every frame.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (timeRef.current) timeRef.current.textContent = formatTime(timer.read())
    }, 100)
    return () => window.clearInterval(id)
  }, [timer])

  // Pause the clock when the tab is hidden.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) timer.pause()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [timer])

  // Desktop: typing anywhere on the page goes to the card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = textareaRef.current
      if (!el || document.activeElement === el || phaseRef.current === 'results') return
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      el.focus({ preventScroll: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Ghost text: after a pause with no mistakes, whisper the next word.
  useEffect(() => {
    setGhostEnd(0)
    if (!assistance.ghostText || phase !== 'play' || wrongText || correctUntil >= target.length) return
    const t = window.setTimeout(() => setGhostEnd(Math.min(nextWordEnd(target, correctUntil), correctUntil + 30)), GHOST_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [assistance.ghostText, correctUntil, wrongText, target, phase, input])

  const ensureCaretVisible = useCallback(() => {
    const caret = caretRef.current
    if (!caret) return
    const r = caret.getBoundingClientRect()
    const vv = window.visualViewport
    const top = (vv?.offsetTop ?? 0) + 72
    const bottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - 16
    if (r.bottom + 24 > bottom) window.scrollBy({ top: r.bottom + 24 - bottom + 32 })
    else if (r.top < top) window.scrollBy({ top: r.top - top - 16 })
  }, [])

  useLayoutEffect(() => {
    ensureCaretVisible()
  }, [input, index, ensureCaretVisible])

  // Keep the caret visible when the on-screen keyboard opens/closes.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => ensureCaretVisible()
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [ensureCaretVisible])

  const syncField = (value: string) => {
    const el = textareaRef.current
    if (!el || composingRef.current) return
    if (el.value !== value) el.value = value
    if (document.activeElement === el) el.setSelectionRange(value.length, value.length)
  }

  const finishRun = () => {
    timer.pause()
    const results = resultsRef.current
    const elapsedMs = results.reduce((sum, r) => sum + r.elapsedMs, 0)
    const chars = results.reduce((sum, r) => sum + r.chars, 0)
    const words = results.reduce((sum, r) => sum + r.words, 0)
    const mistakes = results.reduce((sum, r) => sum + r.mistakes, 0)
    const hints = results.reduce((sum, r) => sum + r.hints, 0)
    const stats = { chars, words, elapsedMs, mistakes, hints }
    const hand = rankHand(stats, assistance)
    const wpm = wordsPerMinute(chars, elapsedMs)
    const accuracy = accuracyPct(chars, mistakes)

    let isPB: boolean
    let prevBestMs: number | undefined
    if (scope === 'card') {
      isPB = results[0].isPB
      prevBestMs = results[0].prevBestMs
    } else {
      prevBestMs = getBestTimes('deck', scopeId)[0]?.elapsedMs
      isPB = prevBestMs == null || elapsedMs < prevBestMs
      addTimeRecord({ scope: 'deck', scopeId, elapsedMs, assistance, wpm, accuracy, hints, mistakes, hand: hand.id })
    }
    // A first-ever run is a "record" but not worth a fanfare.
    const celebratePB = isPB && prevBestMs != null
    const chips = chipsFor(stats, hand, celebratePB)
    completeRun({ chips })

    setSummary({ scope, title, cards: results, elapsedMs, chars, words, mistakes, hints, wpm, accuracy, hand, chips, isPB: celebratePB, prevBestMs, assistance })
    setPhaseBoth('results')
    textareaRef.current?.blur()
    window.scrollTo({ top: 0 })
    if (celebratePB || hand.mult >= 5) sfx.win()
    sfx.chips(Math.ceil(chips / 10))
  }

  const advance = () => {
    if (advanceTimer.current != null) {
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    if (phaseRef.current !== 'card-done') return
    if (indexRef.current + 1 >= cards.length) return
    indexRef.current += 1
    inputRef.current = ''
    mistakesRef.current = 0
    hintsRef.current = 0
    setCardHints(0)
    setInput('')
    const el = textareaRef.current
    if (el) el.value = ''
    cardStartRef.current = timer.read()
    setIndex(indexRef.current)
    setPhaseBoth('play')
  }

  const completeCard = () => {
    timer.pause()
    setPhaseBoth('card-done')
    const elapsedMs = Math.max(1, timer.read() - cardStartRef.current)
    const chars = target.length
    const words = countWords(target)
    const stats = { chars, words, elapsedMs, mistakes: mistakesRef.current, hints: hintsRef.current }
    const hand = rankHand(stats, assistance)
    const prevBestMs = getBestTimes('card', card.id)[0]?.elapsedMs
    const isPB = prevBestMs == null || elapsedMs < prevBestMs
    const wpm = wordsPerMinute(chars, elapsedMs)
    const accuracy = accuracyPct(chars, stats.mistakes)
    addTimeRecord({ scope: 'card', scopeId: card.id, elapsedMs, assistance, wpm, accuracy, hints: stats.hints, mistakes: stats.mistakes, hand: hand.id })
    resultsRef.current = [...resultsRef.current, { cardId: card.id, title: card.title, ...stats, wpm, accuracy, hand, isPB, prevBestMs }]
    sfx.cardDone()

    if (indexRef.current + 1 >= cards.length) later(finishRun, 650)
    else advanceTimer.current = window.setTimeout(advance, ADVANCE_DELAY_MS)
  }

  const commit = (next: string) => {
    syncField(next)
    const prev = inputRef.current
    if (next === prev) return
    timer.start()
    sfx.unlock()

    const prevWrong = prev.length - compareInput(target, prev, assistance).correctUntil
    const nextCorrect = compareInput(target, next, assistance).correctUntil
    const nextWrong = next.length - nextCorrect
    if (prevWrong === 0 && nextWrong > 0) {
      mistakesRef.current += 1
      const surface = surfaceRef.current
      if (surface) {
        // Restart the CSS animation without remounting (which would drop focus).
        surface.classList.remove('shake')
        void surface.offsetWidth
        surface.classList.add('shake')
      }
      sfx.mistake()
    }

    inputRef.current = next
    setInput(next)
    setTyping(true)
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => setTyping(false), 450)

    if (nextCorrect >= target.length) completeCard()
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    if (phaseRef.current !== 'play') {
      if (!composingRef.current) el.value = inputRef.current
      return
    }
    commit(reconcile(target, inputRef.current, el.value, assistance))
  }

  const takeHint = () => {
    if (phaseRef.current !== 'play') return
    const next = applyHint(target, inputRef.current, assistance)
    if (next === inputRef.current) return
    hintsRef.current += 1
    setCardHints(hintsRef.current)
    sfx.hint()
    composingRef.current = false
    // Hints are never mistakes, even if they replace a wrong suffix.
    const el = textareaRef.current
    if (el) {
      el.value = next
      el.setSelectionRange(next.length, next.length)
    }
    const prevCorrect = compareInput(target, inputRef.current, assistance).correctUntil
    inputRef.current = inputRef.current.slice(0, prevCorrect)
    commit(next)
    el?.focus({ preventScroll: true })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (phaseRef.current === 'card-done' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      advance()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      takeHint()
      return
    }
    if (e.key === 'Escape') {
      e.currentTarget.blur()
      return
    }
    // The caret always lives at the end; block keys that would move it.
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
      e.preventDefault()
      return
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'z' || e.key === 'y')) e.preventDefault()
  }

  const keepCaretAtEnd = () => {
    const el = textareaRef.current
    if (!el || composingRef.current) return
    const n = el.value.length
    if (el.selectionStart !== n || el.selectionEnd !== n) el.setSelectionRange(n, n)
  }

  if (phase === 'results' && summary) {
    return (
      <RunResults
        summary={summary}
        onReplay={onReplay}
        exitTo={exitTo}
        nextTo={nextCardId ? `/study/card/${nextCardId}${window.location.search}` : undefined}
      />
    )
  }

  const suit = SUITS[index % SUITS.length]
  const paused = !focused && phase === 'play' && (index > 0 || input.length > 0)
  const done = phase === 'card-done'
  const isTouch = isTouchDevice()

  return (
    <div className="mx-auto max-w-3xl px-3 pb-[40vh] sm:px-4">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 -mx-3 mb-4 bg-[color-mix(in_oklch,var(--felt)_88%,transparent)] px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:-mx-4 sm:px-4">
        <div className="flex h-14 items-center gap-2">
          <Link
            to={exitTo}
            className="grid size-10 place-items-center rounded-full text-foreground/80 hover:bg-white/10 hover:text-foreground"
            aria-label="Exit session"
            title="Exit"
          >
            <X className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {cards.length > 1 ? `Card ${index + 1} of ${cards.length}` : 'Single card'}
              {paused && <span className="ml-2 rounded-full bg-white/15 px-1.5 py-0.5 font-semibold text-foreground">Paused</span>}
            </div>
          </div>
          <span ref={timeRef} className="min-w-[4.5ch] text-right font-mono text-lg font-semibold tabular-nums" aria-label="Elapsed time">
            0:00.0
          </span>
          <ToolbarButton onClick={takeHint} label="Hint (Tab)" disabled={done}>
            <Lightbulb className="size-4.5" />
            <span className="hidden sm:inline">Hint</span>
            {cardHints > 0 && <span className="rounded-full bg-black/25 px-1.5 text-xs tabular-nums">{cardHints}</span>}
          </ToolbarButton>
          <ToolbarButton onClick={onReplay} label="Restart run">
            <RotateCcw className="size-4.5" />
          </ToolbarButton>
        </div>
        <div className="progress-track -mx-3 sm:-mx-4" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(runProgress * 100)} aria-label="Run progress">
          <div className="progress-fill" style={{ width: `${runProgress * 100}%` }} />
        </div>
      </div>

      <div>
        <div className="playing-card px-5 pb-8 pt-9 sm:px-9 sm:pb-10 sm:pt-11" data-suit={suit}>
          <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
            <h1 key={index} className="deal-in text-xl font-semibold leading-snug text-balance sm:text-2xl">{card.title || 'Untitled'}</h1>
            <AssistPills options={assistance} />
          </div>

          <div
            ref={surfaceRef}
            className={cn('study-surface study-type', done && 't-flash rounded-md')}
            onAnimationEnd={(e) => e.currentTarget.classList.remove('shake')}
            onPointerDown={() => {
              if (phaseRef.current === 'card-done') advance()
            }}
          >
            {/* Keyed per card for the deal animation; the textarea below is NOT keyed so the phone keyboard stays open between cards. */}
            <div key={index} className="study-display deal-in" aria-hidden>
              <span className="t-correct">{input.slice(0, correctUntil)}</span>
              {wrongText && <span className="t-wrong">{wrongText}</span>}
              <span ref={caretRef} className="caret" data-typing={typing ? '1' : '0'} data-hidden={!focused || done ? '1' : '0'} />
              <Remainder target={target} from={correctUntil} reveal={assistance.reveal} ghostEnd={ghostEnd} initials={initials} />
            </div>
            <textarea
              ref={textareaRef}
              className="study-input study-type"
              defaultValue=""
              aria-label={`Type from memory: ${card.title}`}
              autoFocus={!isTouch}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="enter"
              inputMode="text"
              data-gramm="false"
              data-1p-ignore
              rows={1}
              onInput={handleInput}
              onCompositionStart={() => {
                composingRef.current = true
              }}
              onCompositionEnd={() => {
                composingRef.current = false
                handleInput()
                syncField(inputRef.current)
              }}
              onKeyDown={onKeyDown}
              onSelect={keepCaretAtEnd}
              onFocus={() => {
                setFocused(true)
                keepCaretAtEnd()
              }}
              onBlur={() => {
                setFocused(false)
                timer.pause()
              }}
              onPaste={(e) => {
                e.preventDefault()
                toast({ message: 'No pasting at this table. Deal it from memory!' })
              }}
              onDrop={(e) => e.preventDefault()}
            />
          </div>

          <div className="mt-6 flex min-h-8 items-center justify-center text-sm" aria-live="polite">
            {done ? (
              <span className="pop inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-1.5 font-semibold text-success">
                ✓ {index + 1 < cards.length ? 'Nice! Dealing the next card…' : 'Done!'}
              </span>
            ) : !focused ? (
              <span className="animate-pulse rounded-full bg-muted px-4 py-1.5 font-medium text-muted-foreground">
                {isTouch ? 'Tap the card to start typing' : 'Click the card or just start typing'}
              </span>
            ) : input.length === 0 && index === 0 ? (
              <span className="text-muted-foreground">
                {isTouch ? 'Stuck? Tap the 💡 for a word.' : 'Stuck? Press Tab for a word.'}
              </span>
            ) : (
              <span className="text-muted-foreground tabular-nums">{Math.round(cardProgress * 100)}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({ onClick, label, children, disabled }: { onClick: () => void; label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      // Prevent the button from stealing focus, so the phone keyboard stays open.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold hover:bg-white/15 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function AssistPills({ options }: { options: AssistanceOptions }) {
  const pills: string[] = []
  if (options.reveal === 'full') pills.push('Full text')
  if (options.reveal === 'initials') pills.push('First letters')
  if (options.reveal === 'blanks') pills.push('Blanks')
  if (options.ghostText) pills.push('Ghost')
  if (options.autocorrect) pills.push('Lenient')
  if (pills.length === 0) return <span className="shrink-0 rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">No help</span>
  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-1">
      {pills.map((p) => (
        <span key={p} className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {p}
        </span>
      ))}
    </div>
  )
}

type SegClass = 'ws' | 'ghost' | 'hint' | 'blank'

/** Renders the not-yet-typed text according to the reveal mode. */
function Remainder({ target, from, reveal, ghostEnd, initials }: { target: string; from: number; reveal: RevealMode; ghostEnd: number; initials: boolean[] }) {
  return useMemo(() => {
    const end = reveal === 'none' ? Math.max(from, ghostEnd) : target.length
    const segments: Array<{ cls: SegClass; text: string }> = []
    for (let k = from; k < end; k += 1) {
      const ch = target[k]
      let cls: SegClass
      if (isWhitespace(ch)) cls = 'ws'
      else if (k < ghostEnd) cls = 'ghost'
      else if (reveal === 'full') cls = 'hint'
      else if (!isWordChar(ch)) cls = 'hint'
      else if (reveal === 'initials' && initials[k]) cls = 'hint'
      else cls = 'blank'
      const last = segments[segments.length - 1]
      if (last && last.cls === cls) last.text += ch
      else segments.push({ cls, text: ch })
    }
    return (
      <>
        {segments.map((s, i) =>
          s.cls === 'ws' ? (
            <span key={i}>{s.text}</span>
          ) : s.cls === 'blank' ? (
            // Each hidden letter gets its own dash, so blanks show letter count and position.
            [...s.text].map((ch, j) => (
              <span key={`${i}-${j}`} className="t-blank">
                {ch}
              </span>
            ))
          ) : (
            <span key={i} className={s.cls === 'ghost' ? 't-ghost' : s.cls === 'hint' ? 't-hint' : 't-blank'}>
              {s.text}
            </span>
          )
        )}
      </>
    )
  }, [target, from, reveal, ghostEnd, initials])
}
