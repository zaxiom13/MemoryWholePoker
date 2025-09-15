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
        <div className="flex flex-col gap-3 text-white/90 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Title and optional actions */}
          <div className="flex w-full flex-col gap-2 min-w-0 sm:flex-1 sm:flex-row sm:items-center sm:gap-3">
            {title ? (
              typeof title === 'string' && titleEditable ? (
                <input
                  className="w-full min-w-0 text-lg sm:text-2xl font-bold tracking-tight bg-transparent border-none focus:outline-none focus:ring-2 ring-primary/30 rounded-sm"
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
                <div className="min-w-0 text-lg font-bold leading-tight tracking-tight text-white sm:text-2xl sm:leading-tight">
                  <span className="line-clamp-2 break-words">{title}</span>
                </div>
              )
            ) : null}
            {actions ? (
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 shrink-0">{actions}</div>
            ) : null}
          </div>

          {/* Right: Timer and Back button */}
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
            {rightSlot ? (
              <div className="text-xs text-white/70 sm:text-sm">{rightSlot}</div>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto rounded-full px-2 sm:ml-0 sm:px-3 h-7 sm:h-8 text-white/80 hover:text-white hover:bg-white/10"
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
