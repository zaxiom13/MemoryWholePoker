import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'

export default function PageTransition({ children }: PropsWithChildren) {
  const location = useLocation()
  return (
    <div
      key={location.pathname + location.search}
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
    >
      {children}
    </div>
  )
}
