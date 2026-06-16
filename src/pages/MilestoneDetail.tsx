import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { format, differenceInCalendarDays } from 'date-fns'
import { ArrowLeft, ArrowSquareOut, CalendarBlank, Crown } from '@phosphor-icons/react'
import { getMilestoneBySlug } from '../repositories/milestones'
import { resolveMilestoneIcon } from '../lib/milestoneIcon'
import { ImageWithFallback } from '../components/ui/ImageWithFallback'
import type { KingdomMilestone } from '../types/domain'

export function MilestoneDetail() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const [milestone, setMilestone] = useState<KingdomMilestone | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const m = await getMilestoneBySlug(slug)
        if (alive) setMilestone(m)
      } catch (e) {
        if (alive) setError((e as Error).message ?? t('timeline.detail.loadError'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [slug, t])

  return (
    <div className="container-narrow pt-5 pb-12 sm:pt-8 sm:pb-16 space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.22em] uppercase text-ink-mute hover:text-gold-soft"
      >
        <ArrowLeft size={12} weight="bold" /> {t('timeline.detail.back')}
      </Link>

      {loading ? (
        <div className="card-hero h-[180px] animate-pulse" />
      ) : error ? (
        <div className="card-hero card-hero--crimson p-5">
          <p className="text-sm text-crimson-glow">{error}</p>
        </div>
      ) : !milestone ? (
        <div className="card-hero p-5">
          <p className="text-sm text-ink-mute">{t('timeline.detail.notFound')}</p>
        </div>
      ) : (
        <Detail milestone={milestone} />
      )}
    </div>
  )
}

function Detail({ milestone }: { milestone: KingdomMilestone }) {
  const { t } = useTranslation()
  const CATEGORY_LABEL: Record<string, string> = {
    truegold: t('timeline.category.truegold'),
    heroes: t('timeline.category.heroes'),
    pets: t('timeline.category.pets'),
    pvp: t('timeline.category.pvp'),
    feature: t('timeline.category.feature'),
    master: t('timeline.category.master'),
    fog: t('timeline.category.fog'),
    'war-academy': t('timeline.category.warAcademy'),
    other: t('timeline.category.other'),
  }
  const iconHit = resolveMilestoneIcon(milestone.category, milestone.name, milestone.iconUrl)
  const d = milestone.unlockDateUtc
    ? differenceInCalendarDays(new Date(milestone.unlockDateUtc), new Date())
    : null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="card-hero card-hero--steel"
      >
        <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
          <span
            className="icon-frame overflow-hidden"
            style={{
              borderColor: 'rgba(159,178,204,0.45)',
              boxShadow: '0 0 18px -4px rgba(159,178,204,0.45)',
            }}
          >
            {iconHit ? (
              <ImageWithFallback
                src={iconHit.src}
                alt={milestone.name}
                className="h-9 w-9 sm:h-10 sm:w-10 object-contain"
                fallbackClassName="h-9 w-9"
              />
            ) : (
              <Crown size={22} weight="duotone" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="eyebrow" style={{ color: '#9fb2cc' }}>
              {CATEGORY_LABEL[milestone.category] ?? milestone.category}
            </div>
            <h1 className="hero-title text-xl sm:text-2xl mt-0.5 text-ink-cream">
              {milestone.name}
            </h1>
            {milestone.unlockDateUtc && (
              <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-mute">
                <span className="inline-flex items-center gap-1">
                  <CalendarBlank size={11} weight="duotone" className="text-gold-soft" />
                  {format(new Date(milestone.unlockDateUtc), 'EEE d MMM yyyy · HH:mm')}{' '}
                  <span className="text-[9px] tracking-[0.28em] uppercase text-gold-soft border border-gold/30 rounded px-1 py-0.5 ml-1">
                    UTC
                  </span>
                </span>
                {d !== null && (
                  <span className="font-mono tabular-nums text-gold">
                    {d > 0 ? t('timeline.detail.daysToGo', { days: d }) : d === 0 ? t('timeline.detail.today') : t('timeline.detail.daysAgo', { days: Math.abs(d) })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {milestone.sourceUrl && (
          <div className="card-foot">
            <span className="text-[11px] text-ink-mute">{t('timeline.detail.reference')}</span>
            <a
              href={milestone.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-gold-soft hover:text-gold-shimmer"
            >
              {t('timeline.detail.source')} <ArrowSquareOut size={12} weight="bold" />
            </a>
          </div>
        )}
      </motion.div>

      {/* Rich admin-authored body */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="card-hero p-5 sm:p-6"
      >
        {milestone.bodyHtml && milestone.bodyHtml.trim().length > 0 ? (
          <article
            className="prose prose-invert prose-headings:font-display-clean prose-headings:tracking-wider prose-headings:text-gold-shimmer prose-a:text-gold-soft max-w-none"
            // Salles authored — trusted source.
            dangerouslySetInnerHTML={{ __html: milestone.bodyHtml }}
          />
        ) : (
          <div className="text-sm text-ink-mute">
            <p>{t('timeline.detail.noBody')}</p>
            {milestone.notes && (
              <p className="mt-3 italic text-ink-paper">{milestone.notes}</p>
            )}
          </div>
        )}
      </motion.section>
    </>
  )
}
