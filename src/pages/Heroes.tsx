import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Sword,
  Horse,
  Crosshair as BowIcon,
  User,
  WarningCircle,
  Crown,
} from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { ImageWithFallback } from '../components/ui/ImageWithFallback'
import { cn } from '../lib/cn'

type Branch = 'infantry' | 'cavalry' | 'archer'

interface HeroRow {
  id: string
  slug: string
  name: string
  generation: number
  preferred_branch: Branch | null
  portrait_url: string | null
  active: boolean
  display_order: number
  role: string | null
}

const BRANCH_ICON: Record<Branch, typeof Sword> = {
  infantry: Sword,
  cavalry: Horse,
  archer: BowIcon,
}

export function Heroes() {
  const { t } = useTranslation()
  // Branch labels are looked up at render time inside HeroCard via t() — this
  // outer copy was unused; kept the t hook in scope.
  const [heroes, setHeroes] = useState<HeroRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [genFilter, setGenFilter] = useState<number | 'all'>('all')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const { data, error: e } = await supabase
          .from('heroes')
          .select(
            'id, slug, name, generation, preferred_branch, portrait_url, active, display_order, role',
          )
          .eq('active', true)
          .order('generation', { ascending: true })
          .order('display_order', { ascending: true })
          .order('name', { ascending: true })
        if (e) throw e
        if (alive) setHeroes((data ?? []) as HeroRow[])
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const generations = useMemo(() => {
    const set = new Set<number>()
    for (const h of heroes) set.add(h.generation)
    return Array.from(set).sort((a, b) => a - b)
  }, [heroes])

  const visible = useMemo(
    () => (genFilter === 'all' ? heroes : heroes.filter((h) => h.generation === genFilter)),
    [heroes, genFilter],
  )

  return (
    <div className="container-wide pt-5 pb-12 sm:pt-10 sm:pb-16">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 sm:mb-6"
      >
        <div className="eyebrow mb-1 text-center">{t('catalogue.eyebrow')}</div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none text-center">
          {t('catalogue.heroes.title')}
        </h1>
        <p className="text-xs sm:text-sm text-ink-mute mt-1.5">
          {loading
            ? t('catalogue.loading')
            : t('catalogue.heroes.summary', { heroCount: heroes.length, genCount: generations.length })}
        </p>
        {error && (
          <div className="callout-warn mt-3 flex items-start gap-2 text-sm">
            <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}
      </motion.header>

      {generations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <FilterChip active={genFilter === 'all'} onClick={() => setGenFilter('all')}>
            {t('catalogue.filter.all')}
          </FilterChip>
          {generations.map((gen) => (
            <FilterChip key={gen} active={genFilter === gen} onClick={() => setGenFilter(gen)}>
              {t('catalogue.filter.gen', { gen })}
            </FilterChip>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="card-hero aspect-[3/4] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Crown size={28} weight="duotone" className="text-gold-soft" />}
          title={
            genFilter === 'all'
              ? t('catalogue.heroes.empty.all')
              : t('catalogue.heroes.empty.gen', { gen: genFilter })
          }
          subtitle={t('catalogue.heroes.empty.subtitle')}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
        >
          {visible.map((hero) => (
            <HeroCard key={hero.id} hero={hero} />
          ))}
        </motion.div>
      )}
    </div>
  )
}

function HeroCard({ hero }: { hero: HeroRow }) {
  const { t } = useTranslation()
  const BRANCH_LABEL: Record<Branch, string> = {
    infantry: t('catalogue.branch.infantry'),
    cavalry: t('catalogue.branch.cavalry'),
    archer: t('catalogue.branch.archer'),
  }
  const BranchIcon = hero.preferred_branch ? BRANCH_ICON[hero.preferred_branch] : null
  return (
    <Link
      to={`/heroes/${hero.slug}`}
      className="card-hero group block hover:-translate-y-0.5 transition-transform"
      aria-label={t('catalogue.heroes.openAria', { name: hero.name, gen: hero.generation })}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
        {hero.portrait_url ? (
          <ImageWithFallback
            src={hero.portrait_url}
            alt={hero.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-bg-card/60">
            <User size={36} weight="duotone" className="text-gold-soft/60" />
          </div>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
        />

        <span className="absolute top-2 left-2 badge-gold text-[9px] px-2 py-0.5">
          {t('catalogue.genBadge', { gen: hero.generation })}
        </span>

        {BranchIcon && (
          <span
            className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gold/40 bg-bg-deep/70 text-gold-soft"
            title={hero.preferred_branch ? BRANCH_LABEL[hero.preferred_branch] : undefined}
          >
            <BranchIcon size={14} weight="duotone" />
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <div className="hero-title text-sm sm:text-base leading-tight truncate">
            {hero.name}
          </div>
          {hero.role && (
            <div className="text-[10px] text-ink-mute mt-0.5 truncate">{hero.role}</div>
          )}
        </div>
      </div>
    </Link>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
        active
          ? 'bg-gold/20 border-gold/55 text-gold'
          : 'border-gold/15 bg-bg-card/40 text-ink-mute hover:border-gold/35 hover:text-gold-soft',
      )}
    >
      {children}
    </button>
  )
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <div className="card-hero flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
      <span className="icon-frame icon-frame--sm">{icon}</span>
      <div className="hero-title text-base sm:text-lg">{title}</div>
      {subtitle && <p className="text-xs text-ink-mute max-w-md">{subtitle}</p>}
    </div>
  )
}
