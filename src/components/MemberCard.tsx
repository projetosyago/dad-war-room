import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CaretRight, Pause } from '@phosphor-icons/react'
import { ImageWithFallback } from './ui/ImageWithFallback'
import { TroopGemIcon } from './icons/TroopGemIcon'
import { formatPower, highestTroopTier } from '../data/roster'
import type { AllianceRank, RosterMember } from '../data/roster'
import { cn } from '../lib/cn'

interface MemberCardProps {
  m: RosterMember
  index?: number
  /** Optional override of the hero portrait slug. Defaults to deterministic pick. */
  heroSlug?: string
  /** Fully-resolved avatar URL (uploaded > picked hero > hashed). Overrides heroSlug. */
  avatarUrl?: string | null
  /**
   * When provided, the whole card becomes a router Link. Used on /alliance/members
   * to deep-link into the member detail page. AdminMembers omits this prop so
   * the card stays inert (admin has its own row-action buttons).
   */
  to?: string
}

const RANK_CLASS: Record<AllianceRank, string> = {
  R5: 'r5',
  R4: 'r4',
  R3: 'r3',
  R2: 'r2',
  R1: 'r1',
}

const DEFAULT_HERO_BY_RANK: Record<AllianceRank, string> = {
  R5: 'zoe',
  R4: 'amadeus',
  R3: 'chenko',
  R2: 'marlin',
  R1: 'howard',
}

export function MemberCard({ m, index = 0, heroSlug, avatarUrl, to }: MemberCardProps) {
  const { t } = useTranslation()
  const tier = highestTroopTier(m)
  const isTG = tier.startsWith('TG')
  const tgLevel = isTG ? parseInt(tier.slice(2)) : null
  const isOut = m.status === 'temporary_out'
  const rankClass = RANK_CLASS[m.rank]
  // Resolver order: explicit avatarUrl > heroSlug prop > rank-default hero.
  const portrait =
    avatarUrl ?? `/images/heroes/${heroSlug ?? DEFAULT_HERO_BY_RANK[m.rank]}.png`

  // The clickable variant wraps the card body in a Link with a slightly
  // bigger hover lift + gold border emphasis. AdminMembers (no `to` prop)
  // keeps the inert version so its row-action buttons aren't fighting a
  // parent link.
  const cardBody = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.012, 0.24) }}
      className={cn(
        'mem-card relative flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl overflow-hidden',
        'transition-all duration-200 group',
        to
          ? 'hover:-translate-y-1 hover:shadow-[0_18px_30px_-18px_rgba(244,207,115,0.45)] hover:border-gold/45'
          : 'hover:-translate-y-0.5',
        `mem-rank-${rankClass}`,
        isOut && 'opacity-65',
      )}
      style={{
        background:
          'linear-gradient(180deg, rgba(255,219,138,0.06), rgba(255,219,138,0.015)),' +
          'linear-gradient(180deg, var(--ink-charcoal), var(--ink-dusk))',
        border: '1px solid rgba(244,207,115,0.20)',
        boxShadow:
          'inset 0 1px 0 0 rgba(255,219,138,0.06), 0 14px 24px -16px rgba(0,0,0,0.55)',
      }}
    >
      {/* Rank stripe — left edge, color-coded by alliance role */}
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r',
          rankClass === 'r5' && 'bg-gradient-to-b from-gold-soft to-gold-dim',
          rankClass === 'r4' && 'bg-gold',
          rankClass === 'r3' && 'bg-steel',
          rankClass === 'r2' && 'bg-ink-soft',
          rankClass === 'r1' && 'bg-gold-deep',
        )}
      />

      {/* Portrait with rank-framed border + rank tag */}
      <div
        className={cn(
          'relative w-14 h-14 rounded-[10px] overflow-hidden shrink-0',
          rankClass === 'r5' && 'border-[1.5px] border-gold-soft shadow-[0_0_14px_-2px_rgba(244,207,115,0.4)]',
          rankClass === 'r4' && 'border-[1.5px] border-gold shadow-[0_0_14px_-2px_rgba(244,207,115,0.3)]',
          rankClass === 'r3' && 'border-[1.5px] border-steel-soft',
          rankClass === 'r2' && 'border-[1.5px] border-ink-soft/60',
          rankClass === 'r1' && 'border-[1.5px] border-gold-deep',
        )}
        style={{ background: 'linear-gradient(180deg, rgba(244,207,115,0.05), rgba(0,0,0,0.4))' }}
      >
        <ImageWithFallback
          src={portrait}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          fallbackClassName="w-full h-full"
        />
        {/* Rank ribbon — top-left corner */}
        <span
          className={cn(
            'absolute -top-[3px] -left-[3px] px-1.5 py-[1px] rounded text-[9px] font-bold tracking-[0.08em] leading-tight',
            'font-display-clean shadow-[0_2px_6px_rgba(0,0,0,0.5)]',
            rankClass === 'r5' && 'bg-gradient-to-b from-gold-soft to-gold-dim text-bg-deep',
            rankClass === 'r4' && 'bg-gradient-to-b from-gold-soft to-gold-dim text-bg-deep',
            rankClass === 'r3' && 'bg-gradient-to-b from-steel-soft to-steel text-ink-cream',
            rankClass === 'r2' && 'bg-gradient-to-b from-ink-paper to-ink-soft text-bg-deep',
            rankClass === 'r1' && 'bg-gradient-to-b from-gold-dim to-gold-deep text-ink-cream',
          )}
        >
          {m.rank}
        </span>
      </div>

      {/* Main column — nick + power + tier */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[15px] sm:text-base font-semibold text-ink-cream leading-tight truncate">
            {m.nick}
          </span>
          {m.dad_tag && (
            <span className="text-[9px] tracking-[0.18em] uppercase text-gold-soft/90 font-semibold">
              ᴰᴬᴰ
            </span>
          )}
          {isOut && (
            <span
              className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] tracking-[0.22em] uppercase border border-crimson/40 text-crimson-glow bg-crimson/10 font-bold"
              title={m.status_note ?? t('members.status.temporarilyOut')}
            >
              <Pause size={10} weight="duotone" />
              {t('members.status.out')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 mt-1.5">
          {/* Power — no leading icon (the gold coin would be currency, wrong semantic) */}
          <span className="font-mono text-[15px] font-semibold text-gold tabular-nums leading-none">
            {formatPower(m.power_m).replace(/[BMK]$/, '')}
            <span className="text-[11px] text-ink-soft ml-0.5">{formatPower(m.power_m).slice(-1)}</span>
          </span>
          {/* Tier badge — gold gem for TG, steel troop gem for pre-TG */}
          {isTG && tgLevel ? (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] font-semibold font-display-clean text-gold-soft tracking-[0.06em]"
              style={{
                background: 'rgba(244,207,115,0.14)',
                border: '1px solid rgba(244,207,115,0.40)',
              }}
            >
              <img
                src={`/images/tiers/tg${tgLevel}.png`}
                alt=""
                className="w-[18px] h-[18px] object-contain drop-shadow-[0_0_4px_rgba(255,233,163,0.4)]"
              />
              {tier}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] font-semibold font-display-clean text-ink-soft tracking-[0.06em]"
              style={{
                background: 'rgba(108,122,146,0.18)',
                border: '1px solid rgba(108,122,146,0.42)',
              }}
            >
              <TroopGemIcon size={18} />
              {m.town_center_level ? t('members.card.tcLevel', { level: m.town_center_level, tier }) : tier}
            </span>
          )}
        </div>
      </div>

      <CaretRight
        size={14}
        weight="bold"
        className="shrink-0 text-ink-mute group-hover:text-gold-soft group-hover:translate-x-0.5 transition-all"
      />
    </motion.div>
  )

  if (to) {
    return (
      <li className="list-none">
        <Link to={to} aria-label={t('members.card.openProfileAria', { nick: m.nick })} className="block">
          {cardBody}
        </Link>
      </li>
    )
  }
  return <li className="list-none">{cardBody}</li>
}
