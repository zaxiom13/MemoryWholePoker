import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PageHeader({
  back,
  backLabel = 'Back',
  title,
  subtitle,
  actions,
  className,
}: {
  back?: string
  backLabel?: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-5 sm:mb-7', className)}>
      {back && (
        <Link to={back} className="-ml-2 mb-1 inline-flex h-9 items-center gap-0.5 rounded-full pl-1 pr-3 text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground">
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold leading-tight text-balance sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-base text-muted-foreground text-pretty">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
      </div>
    </div>
  )
}
