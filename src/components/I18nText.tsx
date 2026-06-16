import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'

type Props = {
  /** i18n key. */
  k: string
  /** Fallback EN value if the key resolves to itself (missing). */
  fallback?: string
  /** Max lines before truncation. 1 = single-line ellipsis. */
  maxLines?: 1 | 2 | 3
  /** Optional interpolation vars. */
  vars?: Record<string, string | number>
  /** Tailwind extra classes. */
  className?: string
  /** Override the wrapper tag — defaults to <span>. */
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4'
  /** Pass-through for accessibility / titling. */
  title?: string
  /** Children to use instead of t() — for advanced cases where you still want
   *  the overflow defense without going through i18n. */
  children?: ReactNode
}

/**
 * Long-language-safe text wrapper.
 *
 * Wraps a translated string with overflow defenses so PT/DE/RU/KO labels
 * never blow up tight layouts (BottomNav tabs, KPI eyebrows, CTA titles).
 * Adds `title` attribute = full text so truncated labels remain discoverable.
 *
 * Use it for fixed UI labels that share fixed-width containers. For body
 * copy that has room to wrap freely, the default <Trans> from react-i18next
 * is fine.
 */
export function I18nText({
  k,
  fallback,
  maxLines = 1,
  vars,
  className,
  as: Tag = 'span',
  title,
  children,
}: Props) {
  const { t } = useTranslation()
  const text =
    typeof children === 'string'
      ? children
      : t(k, { defaultValue: fallback ?? k, ...(vars ?? {}) })

  return (
    <Tag
      className={cn(
        'block min-w-0',
        maxLines === 1 && 'truncate',
        maxLines === 2 && 'line-clamp-2',
        maxLines === 3 && 'line-clamp-3',
        className,
      )}
      title={title ?? (typeof text === 'string' ? text : undefined)}
    >
      {children ?? text}
    </Tag>
  )
}
