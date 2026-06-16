import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Shield, Sparkle, CastleTurret as Castle, WarningCircle } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { ImageWithFallback } from '../components/ui/ImageWithFallback'

interface TierRow {
  id: string
  tier_label: string
  display_order: number
  is_truegold: boolean
  training_building_level: number | null
  icon_url: string | null
  description: string | null
}

export function TroopTiers() {
  const { t } = useTranslation()
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const { data, error: e } = await supabase
          .from('troop_tiers')
          .select('id, tier_label, display_order, is_truegold, training_building_level, icon_url, description')
          .order('display_order', { ascending: true })
        if (e) throw e
        if (alive) setTiers((data ?? []) as TierRow[])
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

  const regular = useMemo(() => tiers.filter((t) => !t.is_truegold), [tiers])
  const truegold = useMemo(() => tiers.filter((t) => t.is_truegold), [tiers])

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
          {t('catalogue.tiers.title')}
        </h1>
        <p className="text-xs sm:text-sm text-ink-mute mt-1.5">
          {loading
            ? t('catalogue.loading')
            : t('catalogue.tiers.summary', { count: tiers.length })}
        </p>
        {error && (
          <div className="callout-warn mt-3 flex items-start gap-2 text-sm">
            <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}
      </motion.header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="card-hero h-16 animate-pulse"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      ) : tiers.length === 0 ? (
        <div className="card-hero flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
          <span className="icon-frame icon-frame--sm">
            <Shield size={22} weight="duotone" className="text-gold-soft" />
          </span>
          <div className="hero-title text-base sm:text-lg">{t('catalogue.tiers.empty.title')}</div>
          <p className="text-xs text-ink-mute max-w-md">
            {t('catalogue.tiers.empty.subtitle')}
          </p>
        </div>
      ) : (
        <div className="space-y-7 sm:space-y-9">
          {regular.length > 0 && (
            <TierGroup
              title={t('catalogue.tiers.regular.title')}
              subtitle={t('catalogue.tiers.regular.subtitle')}
              icon={<Shield size={18} weight="duotone" />}
              tiers={regular}
            />
          )}
          {truegold.length > 0 && (
            <TierGroup
              title={t('catalogue.tiers.truegold.title')}
              subtitle={t('catalogue.tiers.truegold.subtitle')}
              icon={<Sparkle size={18} weight="duotone" />}
              tiers={truegold}
              accent
            />
          )}
        </div>
      )}
    </div>
  )
}

function TierGroup({
  title,
  subtitle,
  icon,
  tiers,
  accent = false,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  tiers: TierRow[]
  accent?: boolean
}) {
  const { t } = useTranslation()
  return (
    <section className={`card-hero ${accent ? 'card-hero--portrait' : ''} overflow-hidden`}>
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
        <span className="icon-frame icon-frame--sm text-gold-soft">{icon}</span>
        <div>
          <div className="eyebrow">{accent ? t('catalogue.tiers.truegoldEyebrow') : t('catalogue.tiers.standardEyebrow')}</div>
          <h2 className="hero-title text-lg sm:text-xl mt-0.5">{title}</h2>
          <p className="text-[11px] sm:text-xs text-ink-mute mt-1 leading-snug">{subtitle}</p>
        </div>
      </div>

      <ul className="divide-y divide-gold/10 px-2 sm:px-3 pb-3">
        {tiers.map((tier) => (
          <li key={tier.id} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3">
            <span className="badge-gold text-[11px] min-w-[58px] justify-center">
              {tier.tier_label}
            </span>

            <span className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-bg-card/60 overflow-hidden">
              {tier.icon_url ? (
                <ImageWithFallback
                  src={tier.icon_url}
                  alt={tier.tier_label}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Shield size={16} weight="duotone" className="text-gold-soft/60" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="text-sm text-ink-cream truncate">
                {tier.description ?? <span className="italic text-ink-mute">{t('catalogue.tiers.noDescription')}</span>}
              </div>
              {tier.training_building_level != null && (
                <div className="text-[10px] text-ink-mute mt-0.5 flex items-center gap-1">
                  <Castle size={11} weight="duotone" />
                  {t('catalogue.tiers.trainingLevel', { level: tier.training_building_level })}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
