import { useCallback, useState } from 'react'
import type { PointerEvent } from 'react'

/**
 * Lightweight helper for adding a press ripple animation to any element.
 * Sets CSS variables for the press origin and flips a data attribute so the
 * animation restarts on every pointer down.
 */
export function usePressRipple() {
  const [wave, setWave] = useState(0)

  const handlePointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    target.style.setProperty('--press-x', `${x}px`)
    target.style.setProperty('--press-y', `${y}px`)
    setWave((w) => (w === 0 ? 1 : 0))
  }, [])

  return { wave, handlePointerDown }
}
