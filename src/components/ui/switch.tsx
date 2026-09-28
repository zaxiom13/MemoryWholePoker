import { cn } from '@/lib/utils'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (value: boolean) => void
  id?: string
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

export function Switch({ checked, onCheckedChange, className, ...aria }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-input',
        className
      )}
      {...aria}
    >
      <span
        className={cn(
          'pointer-events-none block size-5.5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200',
          checked ? 'translate-x-[1.4rem]' : 'translate-x-1'
        )}
      />
    </button>
  )
}
