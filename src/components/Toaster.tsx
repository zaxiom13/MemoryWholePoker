import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastKind = 'success' | 'error' | 'info'
type Toast = { id: number; kind: ToastKind; message: string; action?: { label: string; onClick: () => void }; duration: number }
type ToastInput = Omit<Toast, 'id' | 'duration' | 'kind'> & { kind?: ToastKind; duration?: number }

const ToastContext = createContext<((t: ToastInput) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++
      const toast: Toast = { kind: 'info', duration: input.action ? 6000 : 3500, ...input, id }
      setToasts((ts) => [...ts.slice(-2), toast])
      timers.current.set(id, window.setTimeout(() => dismiss(id), toast.duration))
    },
    [dismiss]
  )

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {toasts.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertTriangle : Info
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className="paper pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
            >
              <Icon className={cn('size-5 shrink-0', t.kind === 'success' && 'text-success', t.kind === 'error' && 'text-destructive', t.kind === 'info' && 'text-primary')} />
              <span className="flex-1 leading-snug">{t.message}</span>
              {t.action && (
                <button
                  className="rounded-full px-3 py-1.5 font-semibold text-primary hover:bg-accent"
                  onClick={() => {
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button aria-label="Dismiss" className="-mr-1 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent" onClick={() => dismiss(t.id)}>
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
