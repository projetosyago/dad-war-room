import type { CSSProperties } from 'react'

interface ForgeTitleProps {
  text?: string
  ariaLabel?: string
  className?: string
}

/**
 * The BIGDADDYS title with the "Gold in Firelight" animation combo:
 *   1. Forge Reveal — letters stamp in one-by-one (80ms stagger)
 *   2. Glint Sweep  — light wave passes across letters every 7s
 *   3. Ember Pulse  — outer glow breathes synced with the canvas embers below
 *
 * Each character is wrapped in its own <span> with a CSS variable --i set to
 * the index, used by the animation-delay calc in index.css. The aria-label
 * keeps the word readable for screen readers (the spans are aria-hidden).
 */
export function ForgeTitle({ text = 'BIGDADDYS', ariaLabel, className }: ForgeTitleProps) {
  const chars = Array.from(text)
  return (
    <h1 className={['login-title', className].filter(Boolean).join(' ')} aria-label={ariaLabel ?? text}>
      {chars.map((char, i) => (
        <span
          key={`${char}-${i}`}
          style={{ ['--i' as string]: i } as CSSProperties}
          aria-hidden="true"
        >
          {char}
        </span>
      ))}
    </h1>
  )
}
