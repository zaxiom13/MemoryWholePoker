import { useEffect, useRef } from 'react'

type Point = {
  x: number
  y: number
  vx: number
  vy: number
  ph: number // phase for pulsing
  sp: number // pulse speed
}

// Lightweight animated node graph background.
// Keeps node count modest and motion slow for low CPU use.
type BackgroundGraphProps = {
  scope?: 'fullscreen' | 'container'
  className?: string
  intensity?: number // 0.5–2, multiplies base alpha
  debugDots?: boolean // when true, render obvious red dots grid/random for alignment
  lineColor?: string // CSS color for edges
  dotColor?: string // CSS color for nodes
}

export default function BackgroundGraph({ scope = 'fullscreen', className, intensity = 1, debugDots = false, lineColor: lineColorProp, dotColor: dotColorProp }: BackgroundGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const pointsRef = useRef<Point[]>([])
  const lastTsRef = useRef<number>(0)
  const drewStaticOnceRef = useRef<boolean>(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d', { alpha: true })!

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function sizeTo(w: number, h: number) {
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Rebuild points based on area with gentle density.
      const area = w * h
      const density = scope === 'container' ? 0.00009 : 0.00004
      const target = Math.max(32, Math.min(120, Math.floor(area * density)))
      const pts: Point[] = []
      for (let i = 0; i < target; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.random() * 0.58 - 0.14, // slow drift
          vy: Math.random() * 0.58 - 0.14,
          ph: Math.random() * Math.PI * 20,
          sp: 5.4 + Math.random() * 0.6,
        })
      }
      pointsRef.current = pts
    }

    // Initial sizing
    if (scope === 'fullscreen') {
      sizeTo(window.innerWidth, window.innerHeight)
    } else {
      const parent = canvas.parentElement as HTMLElement | null
      const rect = parent?.getBoundingClientRect()
      sizeTo(rect?.width || 0, rect?.height || 0)
    }

    // Resize handling
    let ro: ResizeObserver | null = null
    let onFallbackResize: ((this: Window, ev: UIEvent) => any) | null = null
    const onWinResize = () => sizeTo(window.innerWidth, window.innerHeight)
    if (scope === 'fullscreen') {
      window.addEventListener('resize', onWinResize)
    } else {
      const parent = canvas.parentElement as HTMLElement | null
      if ('ResizeObserver' in window && parent) {
        ro = new ResizeObserver((entries) => {
          for (const e of entries) {
            const cr = e.contentRect
            sizeTo(cr.width, cr.height)
          }
        })
        ro.observe(parent)
      } else {
        onFallbackResize = () => {
          const rect = parent?.getBoundingClientRect()
          sizeTo(rect?.width || 0, rect?.height || 0)
        }
        window.addEventListener('resize', onFallbackResize)
      }
    }

    function getVar(name: string, fallback: string) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      return v || fallback
    }

    // Colors drawn from theme; alpha controlled via globalAlpha per draw.
    function draw(ts: number) {
      const reduceMotion = prefersReduced && !debugDots
      if (document.visibilityState === 'hidden') {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const w = canvas.clientWidth
      const h = canvas.clientHeight

      // Clear fully each frame (especially for debug)
      ctx.clearRect(0, 0, w, h)

      // Vibrant blue defaults; still allow theme/props overrides
      const lineColor = lineColorProp || getVar('--ring', 'oklch(0.62 0.22 2090)')
      const dotColor = dotColorProp || getVar('--primary', 'oklch(0.7 0.2 2400)')



      // Movement timestep (clamped for tab throttling)
      const last = lastTsRef.current || ts
      const dt = Math.min(33, ts - last) // ms
      lastTsRef.current = ts

      const pts = pointsRef.current
      const maxDist = Math.min(200, Math.max(120, Math.hypot(w, h) * 0.09)) // a bit more connective

      // Update positions (slow drift, bounce walls)
      if (!reduceMotion) {
        for (let p of pts) {
          p.x += p.vx * (dt / 16)
          p.y += p.vy * (dt / 16)
          if (p.x < 0) { p.x = 0; p.vx *= -1 }
          if (p.y < 0) { p.y = 0; p.vy *= -1 }
          if (p.x > w) { p.x = w; p.vx *= -1 }
          if (p.y > h) { p.y = h; p.vy *= -1 }
        }
      }

      // Draw connections (limit per-point to keep it light)
      ctx.lineWidth = 1
      ctx.strokeStyle = lineColor
      const clampA = (v: number) => Math.max(0.04, Math.min(0.36, v * intensity))
      for (let i = 0; i < pts.length; i++) {
        // find up to 2 nearest within maxDist
        let n1 = -1, d1 = Infinity
        let n2 = -1, d2 = Infinity
        let n3 = -1, d3 = Infinity
        const a = pts[i]
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d < maxDist) {
            if (d < d1) { n3 = n2; d3 = d2; n2 = n1; d2 = d1; n1 = j; d1 = d }
            else if (d < d2) { n3 = n2; d3 = d2; n2 = j; d2 = d }
            else if (d < d3) { n3 = j; d3 = d }
          }
        }
        // draw lines with alpha falling off with distance
        if (n1 !== -1) {
          const b = pts[n1]
          ctx.globalAlpha = clampA(0.18 * (1 - d1 / maxDist))
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        if (n2 !== -1) {
          const b = pts[n2]
          ctx.globalAlpha = clampA(0.16 * (1 - d2 / maxDist))
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        if (n3 !== -1) {
          const b = pts[n3]
          ctx.globalAlpha = clampA(0.14 * (1 - d3 / maxDist))
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // Draw nodes
      ctx.fillStyle = dotColor
      for (let p of pts) {
        const pulse = reduceMotion ? 1 : 1 + 0.22 * Math.sin((ts * 0.001 * p.sp) + p.ph)
        ctx.globalAlpha = clampA(0.22)
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.0 * pulse, 0, Math.PI * 2)
        ctx.fill()
      }

      if (reduceMotion) {
        if (!drewStaticOnceRef.current) {
          drewStaticOnceRef.current = true
        }
        // Do not schedule another frame to respect reduced motion.
        return
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    const onVis = () => {
      if (document.visibilityState === 'visible' && rafRef.current == null) {
        lastTsRef.current = 0
        rafRef.current = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (scope === 'fullscreen') {
        window.removeEventListener('resize', onWinResize)
      } else {
        ro?.disconnect()
        if (onFallbackResize) window.removeEventListener('resize', onFallbackResize)
      }
      document.removeEventListener('visibilitychange', onVis)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`bg-network pointer-events-none ${scope === 'fullscreen' ? 'fixed inset-0 z-0' : 'absolute inset-0'} ${className ?? ''}`}
    />
  )
}
