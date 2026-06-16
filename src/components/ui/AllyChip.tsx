import { Handshake } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'

interface AllyChipProps {
  /** Render with an icon. Defaults to true for chat/list contexts. */
  withIcon?: boolean
  size?: 'xs' | 'sm'
  className?: string
}

/**
 * The "ALLY" chip — steel-soft palette to distinguish diplomatic guests from
 * actual DAD members anywhere their nick can appear (chat, members list,
 * polls results, etc.). Locked spec in PLANNING.md "Ally accounts".
 */
export function AllyChip({ withIcon = true, size = 'xs', className }: AllyChipProps) {
  const { t } = useTranslation()
  const sizing =
    size === 'xs'
      ? 'text-[9px] tracking-[0.20em] px-1.5 py-0.5 gap-1'
      : 'text-[10px] tracking-[0.22em] px-2 py-0.5 gap-1.5'
  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase rounded leading-none',
        'bg-steel/15 text-steel-soft border border-steel/30',
        sizing,
        className,
      )}
      title={t('auth.allyChip.tooltip')}
    >
      {withIcon && <Handshake size={size === 'xs' ? 9 : 11} weight="duotone" />}
      {t('auth.allyChip.label')}
    </span>
  )
}
