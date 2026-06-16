import { cn } from '../../lib/cn'

interface BorderBeamProps {
  /** thickness of the animated beam in px */
  size?: number
  /** total duration of a full lap in seconds */
  duration?: number
  /** stagger delay in seconds */
  delay?: number
  /** beam color from CSS */
  colorFrom?: string
  /** beam color to */
  colorTo?: string
  className?: string
}

/**
 * Animated gold gradient beam that traces the border of its parent.
 * Parent MUST have `position: relative` and `overflow: hidden`.
 * Inspired by Magic UI border-beam pattern.
 */
export function BorderBeam({
  size = 220,
  duration = 6,
  delay = 0,
  colorFrom = '#ffd87a',
  colorTo = '#b88a32',
  className,
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] [border:1px_solid_transparent]',
        '[mask-clip:padding-box,border-box] [mask-composite:intersect]',
        '[mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]',
        'after:absolute after:aspect-square after:w-[var(--size)] after:animate-[border-beam_var(--duration)_linear_infinite] after:[animation-delay:var(--delay)]',
        'after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]',
        "after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_var(--size))]",
        className,
      )}
      style={
        {
          '--size': `${size}px`,
          '--duration': `${duration}s`,
          '--delay': `${delay}s`,
          '--color-from': colorFrom,
          '--color-to': colorTo,
        } as React.CSSProperties
      }
    />
  )
}
