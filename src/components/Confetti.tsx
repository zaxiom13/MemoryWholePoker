import { useMemo } from 'react'

const COLORS = ['oklch(0.83 0.14 82)', 'oklch(0.62 0.2 25)', 'oklch(0.97 0.01 90)', 'oklch(0.55 0.13 160)', 'oklch(0.3 0.02 260)']

/** Lightweight DOM confetti; skipped entirely for reduced-motion users via CSS. */
export default function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 40,
        rot: (Math.random() - 0.5) * 1440,
        dur: 1.8 + Math.random() * 1.6,
        delay: Math.random() * 0.5,
        color: COLORS[i % COLORS.length],
        round: i % 3 === 0,
      })),
    [count]
  )
  return (
    <div aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}vw`,
              background: p.color,
              borderRadius: p.round ? '9999px' : undefined,
              width: p.round ? 10 : undefined,
              height: p.round ? 10 : undefined,
              '--dx': `${p.dx}vw`,
              '--rot': `${p.rot}deg`,
              '--dur': `${p.dur}s`,
              '--delay': `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
