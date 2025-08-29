import { useEffect, useState } from 'react'
import type { CSSProperties, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RevealProps<T extends ElementType = 'div'> = {
  as?: T
  className?: string
  children?: ReactNode
  delay?: number
  style?: CSSProperties
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children' | 'style' | 'className'>

export default function Reveal<T extends ElementType = 'div'>(props: RevealProps<T>) {
  const { as, className, children, delay = 0, style, ...rest } = props as RevealProps
  const Comp = (as || 'div') as ElementType
  const [inView, setInView] = useState(false)

  useEffect(() => {
    // Trigger reveal immediately after mount. Avoid rAF so StrictMode doesn't cancel.
    setInView(true)
  }, [])

  return (
    <Comp
      {...rest}
      data-reveal={inView ? 'in' : 'out'}
      className={cn('reveal', 'transform-gpu', className)}
      style={{ ...(style || {}), transitionDelay: `${delay}ms` }}
    >
      {children}
    </Comp>
  )
}
