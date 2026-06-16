import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Crown, WarningCircle } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { ImageWithFallback } from '../components/ui/ImageWithFallback'

interface MasterRow {
  id: string
  slug: string
  name: string
  unlock_order: number
  description: string | null
  portrait_url: string | null
  active: boolean
  released_at: string | null
}

export function Masters() {
  const { t } = useTranslation()
  const [masters, setMasters] = useState<MasterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const { data, error: e } = await supabase
          .from('masters')
          .select('id, slug, name, unlock_order, description, portrait_url, active, released_at')
          .eq('active', true)
          .order('unlock_order', { ascending: true })
        if (e) throw e
        if (alive) setMasters((data ?? []) as MasterRow[])
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
          {t('catalogue.masters.title')}
        </h1>
        <p className="text-xs sm:text-sm text-ink-mute mt-1.5">
          {loading
            ? t('catalogue.loading')
            : t('catalogue.masters.summary', { count: masters.length })}
        </p>
        {error && (
          <div className="callout-warn mt-3 flex items-start gap-2 text-sm">
            <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}
      </motion.header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="card-hero h-44 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      ) : masters.length === 0 ? (
        <div className="card-hero flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
          <span className="icon-frame icon-frame--sm">
            <Crown size={22} weight="duotone" className="text-gold-soft" />
          </span>
          <div className="hero-title text-base sm:text-lg">{t('catalogue.masters.empty.title')}</div>
          <p className="text-xs text-ink-mute max-w-md">
            {t('catalogue.masters.empty.subtitle')}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
        >
          {masters.map((m) => (
            <MasterCard key={m.id} master={m} />
          ))}
        </motion.div>
      )}
    </div>
  )
}

function MasterCard({ master }: { master: MasterRow }) {
  const { t } = useTranslation()
  return (
    <article className="card-hero card-hero--portrait overflow-hidden">
      <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] gap-4 p-4 sm:p-5">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-gold/30">
          {master.portrait_url ? (
            <ImageWithFallback
              src={master.portrait_url}
              alt={master.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-bg-card/60">
              <Crown size={28} weight="duotone" className="text-gold-soft/60" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex flex-col gap-1.5">
          <div className="eyebrow">{t('catalogue.masters.unlockLabel', { order: master.unlock_order })}</div>
          <h2 className="font-display text-lg sm:text-xl text-ink-cream tracking-wider leading-tight truncate">
            {master.name}
          </h2>

          {master.description ? (
            <p className="text-xs sm:text-sm text-ink-mute leading-snug line-clamp-4">
              {master.description}
            </p>
          ) : (
            <p className="text-[11px] text-ink-mute italic">
              {t('catalogue.masters.noDescription')}
            </p>
          )}

          {master.released_at && (
            <div className="text-[10px] text-ink-mute mt-auto pt-1">
              {t('catalogue.masters.releasedOn', { date: formatDate(master.released_at) })}
            </div>
          )}
        </div>
      </div>
    </article>
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
