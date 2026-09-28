import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SegmentOption<T extends string> = { value: T; label: ReactNode; description?: string }

/** Radio-group styled as a segmented control. Arrow keys move between options. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  label: string
  className?: string
}) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-1 rounded-2xl bg-muted p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <label
            key={o.value}
            className={cn(
              'relative flex min-h-11 cursor-pointer select-none flex-col items-center justify-center rounded-xl px-1.5 py-2 text-center text-sm font-semibold transition-all',
              'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
              active ? 'bg-card text-foreground shadow-[0_4px_12px_-6px_oklch(0_0_0/45%)]' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <input type="radio" name={name} value={o.value} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        )
      })}
    </div>
  )
}
