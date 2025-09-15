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
        <div className="flex flex-col gap-3 py-2 text-white/90 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3">
          {/* Primary cluster: back control + title + actions */}
          <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:flex-1 sm:items-center sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-full bg-white/5 text-white/90 hover:text-white hover:bg-white/15 sm:h-8"
                asChild
              >
                <Link to={to} className="inline-flex items-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="font-medium text-sm">{label}</span>
                </Link>
              </Button>

              {title ? (
                typeof title === 'string' && titleEditable ? (
                  <input
                    className="w-full min-w-0 text-base font-semibold tracking-tight bg-transparent border-none focus:outline-none focus:ring-2 ring-primary/30 rounded-sm sm:text-2xl"
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
                  <div className="min-w-0 text-base font-semibold leading-tight tracking-tight text-white sm:text-2xl sm:leading-tight">
                    <span className="line-clamp-2 break-words">{title}</span>
                  </div>
                )
              ) : null}
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">{actions}</div>
            ) : null}
          </div>

          {rightSlot ? (
            <div className="flex items-center justify-end text-xs text-white/70 sm:text-sm sm:text-right">
              {rightSlot}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
