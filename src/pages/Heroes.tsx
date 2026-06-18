import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { User } from '@phosphor-icons/react'
import {
  RARE_HEROES,
  EPIC_HEROES,
  MYTHIC_GENERATIONS,
  type RosterEntry,
} from '../data/heroes-roster'
import heroesData from '../data/heroes-data.json'
import { cn } from '../lib/cn'

/**
 * Heroes catalogue.
 *
 * Wave 16 redesign per Salles:
 *   - No descriptive subtitle ("33 heroes catalogued…") — gone.
 *   - Grouped by rarity: Rare → Epic → Mythic.
 *   - Mythic subdivided into Generations 1-7.
 *   - Each tile: portrait + name, links to /heroes/{slug} detail page.
 *
 * Data flow:
 *   - Roster + display order: src/data/heroes-roster.ts (canonical, hand-maintained)
 *   - Names + portraits: src/data/heroes-data.json (scraped from kingshotdata.com)
 *   - Portrait file path: /images/icons/kingshot/heroes/{slug}.webp
 *     (Amane is aliased from mikoto.webp — see scrape-hero-details.mjs)
 */

type HeroJson = { name?: string; portrait?: string | null }
const heroes = heroesData as Record<string, HeroJson>

/** Tone class per rarity — drives card border + glow accent. */
const RARITY_TONE: Record<'rare' | 'epic' | 'mythic', { tile: string; accent: string }> = {
  rare: {
    tile: 'hover:border-success/55 hover:shadow-[0_0_22px_-6px_rgba(127,192,138,0.50)]',
    accent: 'text-success',
  },
  epic: {
    tile: 'hover:border-[rgba(180,165,255,0.6)] hover:shadow-[0_0_22px_-6px_rgba(155,140,255,0.50)]',
    accent: 'text-[rgba(180,165,255,1)]',
  },
  mythic: {
    tile: 'hover:border-crimson-glow/65 hover:shadow-[0_0_22px_-6px_rgba(226,86,86,0.55)]',
    accent: 'text-crimson-glow',
  },
}

export function Heroes() {
  const { t } = useTranslation()
  return (
    <div className="container-wide pt-5 pb-12 sm:pt-10 sm:pb-16">
      {/* Page header — centered eyebrow + title only. Subtitle removed per Salles. */}
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 sm:mb-10 text-center"
      >
        <div className="eyebrow mb-1">{t('catalogue.eyebrow')}</div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
          {t('catalogue.heroes.title')}
        </h1>
      </motion.header>

      {/* Section: Rare */}
      <RaritySection rarity="rare" title={t('heroes.rarity.rare')} heroes={RARE_HEROES} />

      {/* Section: Epic */}
      <RaritySection rarity="epic" title={t('heroes.rarity.epic')} heroes={EPIC_HEROES} />

      {/* Section: Mythic — single bucket header + nested gen subgroups */}
      <section className="mt-10 sm:mt-12">
        <SectionHeading title={t('heroes.rarity.mythic')} rarity="mythic" />
        <div className="space-y-7 sm:space-y-9 mt-5">
          {MYTHIC_GENERATIONS.map((g, idx) => (
            <motion.div
              key={g.gen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.04 }}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="font-display-clean text-[11px] sm:text-[12px] uppercase tracking-[0.22em] text-crimson-glow/90">
                  {t('heroes.gen.label', { gen: g.gen })}
                </span>
                <span aria-hidden className="flex-1 h-px bg-gradient-to-r from-crimson/35 to-transparent" />
              </div>
              <HeroGrid heroes={g.heroes} rarity="mythic" />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

function RaritySection({
  rarity,
  title,
  heroes,
}: {
  rarity: 'rare' | 'epic'
  title: string
  heroes: RosterEntry[]
}) {
  return (
    <section className="mt-2 sm:mt-4">
      <SectionHeading title={title} rarity={rarity} />
      <div className="mt-4">
        <HeroGrid heroes={heroes} rarity={rarity} />
      </div>
    </section>
  )
}

function SectionHeading({
  title,
  rarity,
}: {
  title: string
  rarity: 'rare' | 'epic' | 'mythic'
}) {
  const accent = RARITY_TONE[rarity].accent
  return (
    <div className="flex items-center gap-3">
      <h2 className={cn('font-display text-lg sm:text-xl tracking-wider', accent)}>{title}</h2>
      <span aria-hidden className="flex-1 h-px bg-gold/12" />
    </div>
  )
}

function HeroGrid({
  heroes,
  rarity,
}: {
  heroes: RosterEntry[]
  rarity: 'rare' | 'epic' | 'mythic'
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      // 3 cols on mobile by design — Mythic Gen 2-7 each have exactly 3
      // heroes, so a single row holds an entire generation. Gen 1 has 4
      // heroes and wraps to a second row by 1, which still reads cleanly.
      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3"
    >
      {heroes.map((h) => (
        <HeroCard key={h.slug} entry={h} rarity={rarity} />
      ))}
    </motion.div>
  )
}

function HeroCard({ entry, rarity }: { entry: RosterEntry; rarity: 'rare' | 'epic' | 'mythic' }) {
  const { t } = useTranslation()
  const data = heroes[entry.slug]
  const displayName = data?.name || entry.fallbackName
  // Local portrait first (scraped from kingshotdata.com into kingshot/heroes/),
  // remote source as a fallback if the local file ever drifts out of sync.
  const localPortrait = `/images/icons/kingshot/heroes/${entry.slug}.webp`
  const remotePortrait = data?.portrait || null
  const tone = RARITY_TONE[rarity]

  return (
    <Link
      to={`/heroes/${entry.slug}`}
      aria-label={t('heroes.openCardAria', { name: displayName })}
      className={cn(
        'group relative block aspect-[3/4] overflow-hidden rounded-2xl',
        'border border-gold/15 bg-bg-card/40 backdrop-blur-sm transition-all duration-300',
        tone.tile,
      )}
    >
      <Portrait local={localPortrait} remote={remotePortrait} alt={displayName} />

      {/* Bottom-overlay scrim + name */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <div className="hero-title text-sm sm:text-base leading-tight truncate text-center">
          {displayName}
        </div>
      </div>
    </Link>
  )
}

function Portrait({ local, remote, alt }: { local: string; remote: string | null; alt: string }) {
  // State-driven fallback chain: try local first, then remote, then a styled
  // empty frame with a User glyph. Keeps the React tree honest — no imperative
  // DOM injection.
  type Stage = 'local' | 'remote' | 'fallback'
  const [stage, setStage] = useState<Stage>('local')

  const onError = () => {
    if (stage === 'local' && remote) setStage('remote')
    else setStage('fallback')
  }

  if (stage === 'fallback') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg-card/60">
        <User size={36} weight="duotone" className="text-gold-soft/60" />
      </div>
    )
  }

  // Scraped portraits from kingshotdata.com ship with a thin off-white frame
  // baked into the original asset. We zoom past it with a baseline scale-110
  // (≈5% crop per edge) so the tile fills with the actual face. Hover bumps
  // the zoom an extra hair for the lift effect.
  return (
    <img
      src={stage === 'local' ? local : (remote as string)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={onError}
      className="h-full w-full object-cover object-center select-none scale-110 transition-transform duration-300 group-hover:scale-[1.16]"
    />
  )
}
