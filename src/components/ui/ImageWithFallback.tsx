import { useState } from 'react'
import { ImageBroken } from '@phosphor-icons/react'
import { cn } from '../../lib/cn'

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
}

/**
 * Image that falls back to a neutral gold-bordered placeholder if it 404s.
 * Lazy-loaded by default. Used for portraits, event icons, formations.
 */
export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackClassName,
  loading = 'lazy',
  ...rest
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gold/30 bg-bg-card/60 text-ink-mute aspect-square',
          fallbackClassName ?? className,
        )}
        aria-label={`${alt} (image not available)`}
        role="img"
      >
        <ImageBroken size={22} weight="duotone" className="text-gold/50" />
        <span className="text-[10px] tracking-widest uppercase text-ink-mute px-2 text-center">
          {alt}
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={cn('select-none', className)}
      {...rest}
    />
  )
}
