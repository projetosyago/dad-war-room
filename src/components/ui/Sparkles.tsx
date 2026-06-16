import { useMemo } from 'react'
import { cn } from '../../lib/cn'

interface SparklesProps {
  count?: number
  className?: string
  seed?: number
}

/**
 * Drift-floating gold sparkle particles. Pure CSS, no JS runtime cost.
 * Use inside a relatively-positioned container with overflow:hidden.
 */
export function Sparkles({ count = 24, className, seed = 1 }: SparklesProps) {
  const particles = useMemo(() => {
    // deterministic pseudo-random based on seed so SSR/hydration are stable
    let s = seed * 9301 + 49297
    const next = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      top: next() * 100,
      left: next() * 100,
      size: 1.5 + next() * 3,
      opacity: 0.25 + next() * 0.6,
      delay: next() * 14,
      duration: 8 + next() * 14,
    }))
  }, [count, seed])

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-gold-glow animate-drift"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px rgba(255, 216, 122, 0.6)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
