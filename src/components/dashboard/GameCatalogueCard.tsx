import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, BookBookmark } from '@phosphor-icons/react'

type Tone = 'gold' | 'crimson' | 'steel' | 'violet'

interface CategoryDef {
  to: string
  labelKey: string
  /** Real game asset path. Optional — empty categories (pets, masters until
   *  portraits land) render a subtle placeholder frame instead. */
  image?: string
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
 * Game Catalogue dashboard card. Compact reference grid — Heroes, Pets,
 * Masters, Troop Tiers. Each tile fans out to its detail page.
 *
 * Visual rule (set by user, wave 14 refinement): NO icons of any kind in the
 * tiles. Only uploaded game-asset images. Categories without portraits yet
 * (pets, masters) render a subtle empty-frame placeholder until artwork is
 * imported. The header description blurb and the per-tile count line were
 * dropped — they were noise that didn't earn their pixels.
 */
export function GameCatalogueCard() {
  const { t } = useTranslation()

  const categories: CategoryDef[] = [
    {
      to: '/heroes',
      labelKey: 'hub.catalogue.heroes',
      image: '/images/heroes/petra.png',
      tone: 'crimson',
    },
    {
      to: '/pets',
      labelKey: 'hub.catalogue.pets',
      tone: 'violet',
    },
    {
      to: '/masters',
      labelKey: 'hub.catalogue.masters',
      tone: 'gold',
    },
    {
      to: '/troop-tiers',
      labelKey: 'hub.catalogue.troopTiers',
      image: '/images/tiers/tg5.png',
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
      {/* Ambient inner glow — gold beam at top */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(244,207,115,0.55), transparent)',
        }}
      />

      {/* Header — eyebrow / title only. Description blurb removed per user
          request (wave 14 refinement). */}
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-4">
        <span className="icon-frame text-gold-soft shrink-0">
          <BookBookmark size={20} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('hub.catalogue.eyebrow')}</div>
          <h2 className="hero-title text-lg sm:text-xl mt-0.5">
            {t('hub.catalogue.title')}
          </h2>
        </div>
      </div>

      {/* 2×2 on mobile / 4-up on sm+. */}
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
  image,
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
      {/* Halo on hover — subtle radial wash */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${style.halo}`}
      />

      {/* Portrait frame. Holds the uploaded asset when present. When the
          category has no asset yet (pets, masters), shows an empty placeholder
          frame so the four tiles stay visually balanced — no Phosphor icon
          fallback per the user's design rule. */}
      <span className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border border-gold/20 bg-bg-deep/60 flex items-center justify-center group-hover:scale-[1.04] transition-transform duration-300">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover select-none"
          />
        ) : (
          // Empty-state placeholder. Subtle gold radial wash, no glyph.
          // Communicates "art not loaded yet" without screaming about it.
          <span
            aria-hidden
            className="absolute inset-0 rounded-xl"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(244,207,115,0.08), transparent 65%)',
            }}
          />
        )}
      </span>

      {/* Category label */}
      <div className="relative font-display-clean text-[12px] sm:text-[13px] uppercase tracking-[0.18em] text-ink-cream truncate w-full">
        {t(labelKey)}
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
