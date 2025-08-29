import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function BackBar({
  to,
  label = 'Back',
  title,
  titleEditable,
  onTitleChange,
  actions,
  rightSlot,
}: {
  to: string
  label?: string
  title?: React.ReactNode
  titleEditable?: boolean
  onTitleChange?: (value: string) => void
  actions?: React.ReactNode
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="mb-3 sm:mb-4 border-b bg-transparent animate-in fade-in-0 slide-in-from-top-2 duration-300">
      <div className="mx-auto max-w-5xl px-2 sm:px-3 lg:px-6">
        <div className="h-12 sm:h-[3.75rem] flex items-center justify-between gap-2 text-white/90">
          {/* Left: Title and optional actions */}
          <div className="min-w-0 flex items-center gap-2 sm:gap-3 flex-1">
            {title ? (
              typeof title === 'string' && titleEditable ? (
                <input
                  className="text-lg sm:text-2xl font-bold tracking-tight truncate bg-transparent border-none focus:outline-none focus:ring-2 ring-primary/30 rounded-sm"
                  defaultValue={title}
                  onBlur={(e) => onTitleChange?.(e.currentTarget.value.trim())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      ;(e.currentTarget as HTMLInputElement).blur()
                    }
                  }}
                />
              ) : (
                <div className="text-lg sm:text-2xl font-bold tracking-tight truncate text-white">
                  {title}
                </div>
              )
            ) : null}
            {actions ? (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">{actions}</div>
            ) : null}
          </div>

          {/* Center/Right: Timer and Back button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {rightSlot ? (
              <div className="text-xs sm:text-sm text-white/70">{rightSlot}</div>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full px-2 sm:px-3 h-7 sm:h-8 text-white/80 hover:text-white hover:bg-white/10"
              asChild
            >
              <Link to={to} className="inline-flex items-center gap-1 sm:gap-1.5">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-medium text-xs sm:text-sm">{label}</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
