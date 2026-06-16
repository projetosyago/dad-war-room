import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Sword,
  Horse,
  Crosshair as BowIcon,
  User,
  WarningCircle,
  Crown,
} from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { ImageWithFallback } from '../components/ui/ImageWithFallback'

type Branch = 'infantry' | 'cavalry' | 'archer'

interface HeroRow {
  id: string
  slug: string
  name: string
  generation: number
  description: string | null
  preferred_branch: Branch | null
  portrait_url: string | null
  role: string | null
  active: boolean
  released_at: string | null
}

const BRANCH_ICON: Record<Branch, typeof Sword> = {
  infantry: Sword,
  cavalry: Horse,
  archer: BowIcon,
}

export function HeroDetail() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const [hero, setHero] = useState<HeroRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        setNotFound(false)
        const { data, error: e } = await supabase
          .from('heroes')
          .select(
            'id, slug, name, generation, description, preferred_branch, portrait_url, role, active, released_at',
          )
          .eq('slug', slug)
          .maybeSingle()
        if (e) throw e
        if (!alive) return
        if (!data) {
          setNotFound(true)
        } else {
          setHero(data as HeroRow)
        }
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [slug])

  return (
    <div className="container-narrow pt-5 pb-12 sm:pt-8 sm:pb-16">
      <Link
        to="/heroes"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-gold-soft hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" />
        {t('catalogue.heroes.backToList')}
      </Link>

      {loading && (
        <div className="card-hero p-6 sm:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-48 sm:h-72 w-full rounded-xl bg-bg-card/60" />
            <div className="h-4 w-32 bg-bg-card/60 rounded" />
            <div className="h-7 w-3/4 bg-bg-card/60 rounded" />
            <div className="h-3 w-full bg-bg-card/60 rounded" />
            <div className="h-3 w-5/6 bg-bg-card/60 rounded" />
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="callout-warn flex items-start gap-2 text-sm">
          <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span>{error.message}</span>
        </div>
      )}

      {!loading && !error && notFound && (
        <div className="card-hero flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
          <span className="icon-frame icon-frame--sm">
            <Crown size={20} weight="duotone" className="text-gold-soft" />
          </span>
          <div className="hero-title text-base sm:text-lg">{t('catalogue.heroes.notFoundTitle')}</div>
          <p className="text-xs text-ink-mute max-w-md">
            {t('catalogue.heroes.notFoundSubtitle')}
          </p>
          <Link to="/heroes" className="btn-ghost mt-2 text-xs">
            {t('catalogue.heroes.returnToList')}
          </Link>
        </div>
      )}

      {!loading && !error && hero && (
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card-hero card-hero--portrait overflow-hidden"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[260px_1fr] gap-5 sm:gap-7 p-5 sm:p-7">
            {/* Portrait */}
            <div className="relative">
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-gold/30">
                {hero.portrait_url ? (
                  <ImageWithFallback
                    src={hero.portrait_url}
                    alt={hero.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-bg-card/60">
                    <User size={48} weight="duotone" className="text-gold-soft/60" />
                  </div>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="min-w-0 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="eyebrow">{t('catalogue.heroes.generation', { gen: hero.generation })}</span>
                {!hero.active && (
                  <span className="badge-danger text-[9px] px-2 py-0.5">{t('catalogue.heroes.archivedBadge')}</span>
                )}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl text-ink-cream tracking-wider leading-tight">
                {hero.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                {hero.preferred_branch && (
                  <BranchBadge branch={hero.preferred_branch} />
                )}
                {hero.role && (
                  <span className="badge-mute text-[10px]">{hero.role}</span>
                )}
              </div>

              {hero.description ? (
                <p className="text-sm sm:text-base text-ink leading-relaxed whitespace-pre-line mt-1">
                  {hero.description}
                </p>
              ) : (
                <p className="text-xs text-ink-mute italic mt-1">
                  {t('catalogue.heroes.noDescription')}
                </p>
              )}

              {hero.released_at && (
                <div className="text-[11px] text-ink-mute mt-2">
                  {t('catalogue.heroes.releasedOn', { date: formatDate(hero.released_at) })}
                </div>
              )}
            </div>
          </div>
        </motion.article>
      )}
    </div>
  )
}

function BranchBadge({ branch }: { branch: Branch }) {
  const { t } = useTranslation()
  const BRANCH_LABEL: Record<Branch, string> = {
    infantry: t('catalogue.branch.infantry'),
    cavalry: t('catalogue.branch.cavalry'),
    archer: t('catalogue.branch.archer'),
  }
  const Icon = BRANCH_ICON[branch]
  return (
    <span className="badge-gold inline-flex items-center gap-1.5">
      <Icon size={12} weight="duotone" />
      {BRANCH_LABEL[branch]}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}
