import { useEffect, useMemo, useState } from 'react'
import { layout, prepare } from '@chenglou/pretext'

const FALLBACK_HEIGHT = 220

export function usePretextLayout(text: string, options?: { lineHeight?: number; paddingY?: number; minHeight?: number }) {
  const lineHeight = options?.lineHeight ?? 30
  const paddingY = options?.paddingY ?? 32
  const minHeight = options?.minHeight ?? FALLBACK_HEIGHT

  const prepared = useMemo(
    () => prepare(text, '500 1.125rem ui-monospace, SFMono-Regular, Menlo, monospace', { whiteSpace: 'pre-wrap' }),
    [text],
  )

  const [width, setWidth] = useState(0)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const contentWidth = width >= 768 ? 640 : width >= 640 ? 560 : Math.max(width - 56, 180)

  return useMemo(() => {
    if (width === 0) return minHeight

    const { height } = layout(prepared, contentWidth, lineHeight)
    return Math.max(minHeight, Math.ceil(height + paddingY))
  }, [contentWidth, lineHeight, minHeight, paddingY, prepared, width])
}
