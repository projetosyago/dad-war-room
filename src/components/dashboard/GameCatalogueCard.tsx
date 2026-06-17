import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  BookBookmark,
  Crown,
  PawPrint,
  Shield,
  Sparkle,
} from '@phosphor-icons/react'
import { useHeroes } from '../../hooks/useHeroes'
import { usePets } from '../../hooks/usePets'
import { useMasters } from '../../hooks/useMasters'
import { useTroopTiers } from '../../hooks/useTroopTiers'

type Tone = 'gold' | 'crimson' | 'steel' | 'violet'

interface CategoryDef {
  to: string
  labelKey: string
  count: number | null
  loading: boolean
  /** Real game asset path (rendered when present). */
  image?: string
  /** Phosphor fallback when no asset exists. */
  icon: typeof Shield
  tone: Tone
}

const TONE_STYLES: Record<Tone, { ring: string; glow: string; halo: string }> = {
  gold: {
    ring: 'border-gold/30 group-hover:border-gold/55',
    glow: 'group-hover:shadow-[0_0_24px_-4px_rgba(244,207,115,0.55)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(244,207,115,0.22),transparent_70%)]',
  },
  crimson: {
    ring: 'border-crimson/30 group-hover:border-crimson-glow/60',
    glow: 'group-hover:shadow-[0_0_24px_-4px_rgba(226,86,86,0.55)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(226,86,86,0.20),transparent_70%)]',
  },
  steel: {
    ring: 'border-steel/40 group-hover:border-steel-soft/60',
    glow: 'group-hover:shadow-[0_0_24px_-4px_rgba(108,122,146,0.55)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(154,166,186,0.20),transparent_70%)]',
  },
  violet: {
    ring: 'border-[rgba(155,140,255,0.32)] group-hover:border-[rgba(180,165,255,0.6)]',
    glow: 'group-hover:shadow-[0_0_24px_-4px_rgba(155,140,255,0.5)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(155,140,255,0.20),transparent_70%)]',
  },
}

/**
 * Game Catalogue dashboard card — the shared reference everyone in the alliance
 * can browse. Lives on the Hub (moved here from Alliance in wave 14 because
 * gameplay reference is more useful at-a-glance than as a deep subpage).
 *
 * Each category tile fans out to its detail catalogue page with a live count
 * pulled from the corresponding hook. Heroes and Troop Tiers use real in-game
 * sprites; Pets and Masters use Phosphor icons with a tinted halo until we
 * import portrait assets for those.
 */
export function GameCatalogueCard() {
  const { t } = useTranslation()
  const heroes = useHeroes()
  const pets = usePets()
  const masters = useMasters()
  const tiers = useTroopTiers()

  const categories: CategoryDef[] = [
    {
      to: '/heroes',
      labelKey: 'hub.catalogue.heroes',
      count: heroes.items?.length ?? null,
      loading: heroes.loading,
      image: '/images/heroes/petra.png',
      icon: Shield,
      tone: 'crimson',
    },
    {
      to: '/pets',
      labelKey: 'hub.catalogue.pets',
      count: pets.items?.length ?? null,
      loading: pets.loading,
      icon: PawPrint,
      tone: 'violet',
    },
    {
      to: '/masters',
      labelKey: 'hub.catalogue.masters',
      count: masters.items?.length ?? null,
      loading: masters.loading,
      icon: Crown,
      tone: 'gold',
    },
    {
      to: '/troop-tiers',
      labelKey: 'hub.catalogue.troopTiers',
      count: tiers.items?.length ?? null,
      loading: tiers.loading,
      image: '/images/tiers/tg5.png',
      icon: Sparkle,
      tone: 'steel',
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="card-hero overflow-hidden relative"
    >
      {/* Ambient inner glow — gold beam at top + faint diagonal sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(244,207,115,0.55), transparent)',
        }}
      />

      {/* Header — eyebrow / title / blurb */}
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-4">
        <span className="icon-frame text-gold-soft shrink-0">
          <BookBookmark size={20} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('hub.catalogue.eyebrow')}</div>
          <h2 className="hero-title text-lg sm:text-xl mt-0.5">
            {t('hub.catalogue.title')}
          </h2>
          <p className="text-[11px] sm:text-xs text-ink-mute mt-1.5 leading-snug max-w-[42ch]">
            {t('hub.catalogue.description')}
          </p>
        </div>
      </div>

      {/* 2×2 on mobile / 4-up on sm+. Each tile is a discrete portrait card. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-5 sm:px-6 pb-5">
        {categories.map((c) => (
          <CategoryTile key={c.to} {...c} t={t} />
        ))}
      </div>
    </motion.section>
  )
}

function CategoryTile({
  to,
  labelKey,
  count,
  loading,
  image,
  icon: Icon,
  tone,
  t,
}: CategoryDef & { t: (key: string, vars?: Record<string, unknown>) => string }) {
  const style = TONE_STYLES[tone]
  return (
    <Link
      to={to}
      className={`group relative flex flex-col items-center text-center gap-2 p-3 sm:p-3.5 rounded-2xl border bg-bg-card/40 backdrop-blur-sm transition-all duration-300 ${style.ring} ${style.glow}`}
      aria-label={t(labelKey)}
    >
      {/* Halo on hover — subtle radial wash from the top of the tile */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${style.halo}`}
      />

      {/* Portrait/icon frame */}
      <span className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border border-gold/20 bg-bg-deep/60 flex items-center justify-center group-hover:scale-[1.04] transition-transform duration-300">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover select-none"
            onError={(e) => {
              // Hide the broken image and let the Phosphor fallback show through
              // (rendered below as the sibling absolute-positioned <Icon>).
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : null}
        {/* Icon fallback — always rendered behind the img so it shows if the
            image fails to load. Without the image, it's the primary visual. */}
        <Icon
          size={28}
          weight="duotone"
          className={`text-gold-soft ${image ? 'absolute inset-0 m-auto -z-0' : ''}`}
        />
      </span>

      {/* Label + live count */}
      <div className="relative min-w-0 w-full">
        <div className="font-display-clean text-[12px] sm:text-[13px] uppercase tracking-[0.18em] text-ink-cream truncate">
          {t(labelKey)}
        </div>
        <div className="text-[10px] sm:text-[11px] text-ink-mute mt-0.5 font-mono tabular-nums">
          {loading
            ? '—'
            : count === 0
              ? t('hub.catalogue.empty')
              : t('hub.catalogue.count', { count: count ?? 0 })}
        </div>
      </div>

      {/* Trailing arrow — slides on hover */}
      <span
        aria-hidden
        className="relative inline-flex items-center justify-center text-gold-soft opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300"
      >
        <ArrowRight size={12} weight="bold" />
      </span>
    </Link>
  )
}
