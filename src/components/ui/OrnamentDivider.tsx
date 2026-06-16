import { cn } from '../../lib/cn'

interface OrnamentDividerProps {
  className?: string
  label?: string
}

/**
 * Gold ornamental horizontal divider with optional center label.
 * Filigree-style — line + diamond + line.
 */
export function OrnamentDivider({ className, label }: OrnamentDividerProps) {
  return (
    <div className={cn('flex items-center gap-3 w-full', className)} aria-hidden={!label}>
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/45 to-gold/45" />
      <span className="relative inline-flex items-center justify-center">
        <span className="block h-2 w-2 rotate-45 bg-gold-gradient shadow-[0_0_12px_rgba(255,216,122,0.65)]" />
      </span>
      {label && (
        <span className="font-display text-[11px] tracking-[0.32em] text-gold-soft uppercase whitespace-nowrap">
          {label}
        </span>
      )}
      <span className="relative inline-flex items-center justify-center">
        <span className="block h-2 w-2 rotate-45 bg-gold-gradient shadow-[0_0_12px_rgba(255,216,122,0.65)]" />
      </span>
      <span className="flex-1 h-px bg-gradient-to-l from-transparent via-gold/45 to-gold/45" />
    </div>
  )
}
