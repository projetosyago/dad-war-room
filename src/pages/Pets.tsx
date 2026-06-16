import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { PawPrint, WarningCircle } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { ImageWithFallback } from '../components/ui/ImageWithFallback'
import { cn } from '../lib/cn'

interface PetRow {
  id: string
  slug: string
  name: string
  generation: number
  description: string | null
  portrait_url: string | null
  active: boolean
  display_order: number
}

export function Pets() {
  const { t } = useTranslation()
  const [pets, setPets] = useState<PetRow[]>([])
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
          .from('pets')
          .select('id, slug, name, generation, description, portrait_url, active, display_order')
          .eq('active', true)
          .order('generation', { ascending: true })
          .order('display_order', { ascending: true })
          .order('name', { ascending: true })
        if (e) throw e
        if (alive) setPets((data ?? []) as PetRow[])
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
    for (const p of pets) set.add(p.generation)
    return Array.from(set).sort((a, b) => a - b)
  }, [pets])

  const visible = useMemo(
    () => (genFilter === 'all' ? pets : pets.filter((p) => p.generation === genFilter)),
    [pets, genFilter],
  )

  // Hint generation for empty state (next gen after the highest catalogued, or Gen 1)
  const nextGenHint = generations.length === 0 ? 1 : generations[generations.length - 1]! + 1

  return (
    <div className="container-wide pt-5 pb-12 sm:pt-10 sm:pb-16">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 sm:mb-6"
      >
        <div className="eyebrow mb-1">{t('catalogue.eyebrow')}</div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
          {t('catalogue.pets.title')}
        </h1>
        <p className="text-xs sm:text-sm text-ink-mute mt-1.5">
          {loading
            ? t('catalogue.loading')
            : t('catalogue.pets.summary', { count: pets.length })}
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
        <div className="card-hero flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
          <span className="icon-frame icon-frame--sm">
            <PawPrint size={22} weight="duotone" className="text-gold-soft" />
          </span>
          <div className="hero-title text-base sm:text-lg">
            {genFilter === 'all'
              ? t('catalogue.pets.empty.nextGen', { gen: nextGenHint })
              : t('catalogue.pets.empty.gen', { gen: genFilter })}
          </div>
          <p className="text-xs text-ink-mute max-w-md">
            {t('catalogue.pets.empty.subtitle')}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
        >
          {visible.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
        </motion.div>
      )}
    </div>
  )
}

function PetCard({ pet }: { pet: PetRow }) {
  const { t } = useTranslation()
  return (
    <div
      className="card-hero block"
      aria-label={t('catalogue.pets.cardAria', { name: pet.name, gen: pet.generation })}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
        {pet.portrait_url ? (
          <ImageWithFallback
            src={pet.portrait_url}
            alt={pet.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-bg-card/60">
            <PawPrint size={36} weight="duotone" className="text-gold-soft/60" />
          </div>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
        />

        <span className="absolute top-2 left-2 badge-gold text-[9px] px-2 py-0.5">
          {t('catalogue.genBadge', { gen: pet.generation })}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <div className="hero-title text-sm sm:text-base leading-tight truncate">
            {pet.name}
          </div>
          {pet.description && (
            <div className="text-[10px] text-ink-mute mt-0.5 line-clamp-2">
              {pet.description}
            </div>
          )}
        </div>
      </div>
    </div>
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
