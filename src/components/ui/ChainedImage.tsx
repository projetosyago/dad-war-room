import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Image that walks down a list of candidate URLs (skipping nulls), showing the
 * first that loads. Falls back to a provided node when all candidates fail.
 * Used so we prefer the locally bundled asset and fall through to a scraped
 * remote portrait, then to an icon placeholder.
 *
 * Extracted from HeroDetail in wave 24 so the catalogue cards (Masters, Pets)
 * can reuse the same local-first fallback chain. See src/lib/catalogueIcon.ts.
 */
export function ChainedImage({
  sources, alt, className, fallback,
}: {
  sources: Array<string | null | undefined>
  alt: string
  className?: string
  fallback: ReactNode
}) {
  const candidates = useMemo(
    () => sources.filter((s): s is string => typeof s === 'string' && s.length > 0),
    [sources],
  )
  const [index, setIndex] = useState(0)
  if (candidates.length === 0 || index >= candidates.length) return <>{fallback}</>
  return (
    <img
      src={candidates[index]}
      alt={alt}
      loading="lazy"
      className={cn('select-none', className)}
      onError={() => setIndex((i) => i + 1)}
    />
  )
}
