import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RotateCcw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Confetti from '@/components/Confetti'
import HandBadge from '@/components/HandBadge'
import { formatTime, type Hand } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type { AssistanceOptions } from '@/types'

export type CardResult = {
  cardId: string
  title: string
  chars: number
  words: number
  elapsedMs: number
  mistakes: number
  hints: number
  wpm: number
  accuracy: number
  hand: Hand
  isPB: boolean
  prevBestMs?: number
}

export type RunSummary = {
  scope: 'card' | 'deck'
  title: string
  cards: CardResult[]
  elapsedMs: number
  chars: number
  words: number
  mistakes: number
  hints: number
  wpm: number
  accuracy: number
  hand: Hand
  chips: number
  isPB: boolean
  prevBestMs?: number
  assistance: AssistanceOptions
}

function useCountUp(to: number, ms = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return value
}

export default function RunResults({ summary, onReplay, exitTo, nextTo }: { summary: RunSummary; onReplay: () => void; exitTo: string; nextTo?: string }) {
  const chips = useCountUp(summary.chips)
  const { hand } = summary
  const celebrate = summary.isPB || hand.mult >= 5

  // Enter replays, like dealing another hand.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLAnchorElement)) onReplay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onReplay])

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      {celebrate && <Confetti />}

      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{summary.title}</p>
        <div className="mt-6 flex justify-center gap-1.5 sm:gap-2.5" aria-hidden>
          {hand.cards.map((c, i) => (
            <MiniCard key={i} label={c} index={i} />
          ))}
        </div>
        <h1 className="pop mt-6 text-4xl font-semibold sm:text-5xl" style={{ animationDelay: '480ms' }}>
          {hand.name}
        </h1>
        {summary.isPB && (
          <p className="pop mt-3 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-1.5 text-sm font-bold text-[oklch(0.25_0.04_60)]" style={{ animationDelay: '650ms' }}>
            <Trophy className="size-4" /> New personal best
            {summary.prevBestMs != null && <span className="font-medium opacity-80">(was {formatTime(summary.prevBestMs)})</span>}
          </p>
        )}
        <p className="mt-4 flex items-center justify-center gap-2 text-2xl font-bold tabular-nums text-gold">
          <span className="chip-coin text-xl" aria-hidden />+{chips} chips
        </p>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Time" value={formatTime(summary.elapsedMs)} />
        <Stat label="Speed" value={`${summary.wpm}`} unit="wpm" />
        <Stat label="Accuracy" value={`${summary.accuracy}`} unit="%" />
        <Stat label="Hints" value={`${summary.hints}`} />
      </dl>

      {summary.cards.length > 1 && (
        <div className="paper playing-card mt-6 overflow-hidden p-0">
          <ul className="divide-y">
            {summary.cards.map((c) => (
              <li key={c.cardId} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {c.wpm} wpm · {c.accuracy}%{c.hints ? ` · ${c.hints} hint${c.hints > 1 ? 's' : ''}` : ''}
                  </div>
                </div>
                <HandBadge hand={c.hand.id} className="hidden min-[420px]:inline-flex" />
                <div className={cn('font-mono text-sm font-semibold tabular-nums', c.isPB && c.prevBestMs != null && 'text-success')}>{formatTime(c.elapsedMs)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="secondary" size="lg">
          <Link to={exitTo}>Back to deck</Link>
        </Button>
        {nextTo && (
          <Button asChild variant="secondary" size="lg">
            <Link to={nextTo}>
              Next card <ArrowRight />
            </Link>
          </Button>
        )}
        <Button size="lg" onClick={onReplay} autoFocus>
          <RotateCcw /> Play again
        </Button>
      </div>
      <p className="mt-4 hidden text-center text-sm text-muted-foreground sm:block">Press Enter to play again</p>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="felt-panel px-4 py-3 text-center">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-sm font-semibold text-muted-foreground">{unit}</span>}
      </dd>
    </div>
  )
}

function MiniCard({ label, index }: { label: string; index: number }) {
  const suit = label.slice(-1)
  const rank = label.slice(0, -1)
  const red = suit === '♥' || suit === '♦'
  return (
    <div style={{ transform: `rotate(${(index - 2) * 4}deg) translateY(${Math.abs(index - 2) * 4}px)` }}>
      <div className="flip-in playing-card grid h-20 w-14 place-items-center rounded-lg sm:h-28 sm:w-20 sm:rounded-xl" style={{ '--i': index } as React.CSSProperties}>
        <div className={cn('text-center font-display leading-none', red ? 'text-suit-red' : 'text-foreground')}>
          <div className="text-xl font-semibold sm:text-3xl">{rank}</div>
          <div className="text-lg sm:text-2xl">{suit}</div>
        </div>
      </div>
    </div>
  )
}
