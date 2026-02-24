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
  actionsPlacement = 'left',
  hideBackLabel = false,
  hideBackLabelOnMobile = false,
  rightSlot,
}: {
  to: string
  label?: string
  title?: React.ReactNode
  titleEditable?: boolean
  onTitleChange?: (value: string) => void
  actions?: React.ReactNode
  actionsPlacement?: 'left' | 'right'
  hideBackLabel?: boolean
  hideBackLabelOnMobile?: boolean
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="mb-3 sm:mb-4 border-b bg-transparent animate-in fade-in-0 slide-in-from-top-2 duration-300">
      <div className="mx-auto max-w-5xl px-2 sm:px-3 lg:px-6">
        <div className="min-h-12 sm:min-h-[3.75rem] py-1.5 sm:py-2 flex items-center justify-between gap-2 text-white/90">
          {/* Left: Title (and optional left actions) */}
          <div className="min-w-0 flex items-center gap-2 sm:gap-3 flex-1">
            {title ? (
              typeof title === 'string' && titleEditable ? (
                <input
                  className="min-w-0 flex-1 text-lg sm:text-2xl font-bold tracking-tight truncate bg-transparent border-none focus:outline-none focus:ring-2 ring-primary/30 rounded-sm"
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
                <div className="min-w-0 flex-1 text-lg sm:text-2xl font-bold tracking-tight truncate text-white">
                  {title}
                </div>
              )
            ) : null}
            {actions && actionsPlacement === 'left' ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">{actions}</div>
            ) : null}
          </div>

          {/* Right: optional right actions, right slot and Back button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {actions && actionsPlacement === 'right' ? (
              <div className="flex items-center gap-1.5 sm:gap-2">{actions}</div>
            ) : null}
            {rightSlot ? (
              <div className="text-white/70">{rightSlot}</div>
            ) : null}
            <Button
              variant="outline"
              className="chip text-xs sm:text-sm h-7 sm:h-8 px-2.5 sm:px-3"
              asChild
            >
              <Link to={to} className="inline-flex items-center gap-1 sm:gap-1.5">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className={`font-medium text-xs sm:text-sm ${hideBackLabel ? 'hidden' : hideBackLabelOnMobile ? 'hidden sm:inline' : ''}`}>{label}</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
