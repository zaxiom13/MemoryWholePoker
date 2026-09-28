import { handById } from '@/lib/scoring'
import type { HandId } from '@/types'
import { cn } from '@/lib/utils'

export default function HandBadge({ hand, className }: { hand?: HandId; className?: string }) {
  const h = handById(hand)
  if (!h) return null
  const top = h.id === 'royal-flush' || h.id === 'straight-flush'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        top ? 'border-gold/60 bg-gold/15 text-[oklch(0.45_0.1_70)]' : 'border-border bg-muted text-muted-foreground',
        className
      )}
      title={`Best hand: ${h.name}`}
    >
      <span aria-hidden>{h.cards[0]}</span>
      {h.name}
    </span>
  )
}
