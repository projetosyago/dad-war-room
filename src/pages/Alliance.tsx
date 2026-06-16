import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  Trophy,
  UsersThree,
  Megaphone,
  CaretRight,
  ListChecks,
  Crown,
  PawPrint,
  Sparkle,
  BookBookmark,
} from '@phosphor-icons/react'
import { DadCrest } from '../components/DadCrest'
import { I18nText } from '../components/I18nText'
import { ROSTER, formatPower } from '../data/roster'
import { useAllianceSettings } from '../hooks/useAllianceSettings'
import { useMyNotifications, type PushMessageRow, type PushTapTarget } from '../hooks/useMyNotifications'

// Mirrors the routing table in NotificationsPanel — kept inline (5 entries)
// rather than exported to avoid a circular dep with the bell component.
const ANNOUNCEMENT_TAP_ROUTE: Record<Exclude<PushTapTarget, 'url'>, string> = {
  hub: '/',
  events: '/events',
  polls: '/alliance/polls',
  alliance: '/alliance',
}

function resolveAnnouncementTarget(msg: PushMessageRow): string {
  if (msg.tap_target === 'url') return msg.tap_url ?? '/alliance'
  return ANNOUNCEMENT_TAP_ROUTE[msg.tap_target] ?? '/alliance'
}

/** Short "3min" / "2h" / "4d" stamp, matching the notifications panel format. */
function useAnnouncementTimeAgo() {
  const { t } = useTranslation()
  return (iso: string | null): string => {
    if (!iso) return ''
    const then = Date.parse(iso)
    if (!Number.isFinite(then)) return ''
    const diffMs = Date.now() - then
    if (diffMs < 0) return t('alliance.timeAgo.now')
    const sec = Math.floor(diffMs / 1000)
    if (sec < 60) return `${sec}s`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}min`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h`
    const day = Math.floor(hr / 24)
    if (day < 7) return `${day}d`
    return new Date(then).toLocaleDateString()
  }
}

type StatTint = 'gold' | 'crimson' | 'steel'

// Fallbacks if the singleton row is missing (graceful loading — never crash).
const FALLBACK_RANK = '#2'
const FALLBACK_MOTTO = 'Elegance in Peace, Chaos in Battle.'
const FALLBACK_TAGLINE = 'Kingdom 1652'

export function Alliance() {
  const { t } = useTranslation()
  const announcementTimeAgo = useAnnouncementTimeAgo()
  const { settings } = useAllianceSettings()
  const rank = settings?.rank ?? FALLBACK_RANK
  const motto = settings?.motto ?? FALLBACK_MOTTO
  const tagline = settings?.tagline ?? FALLBACK_TAGLINE
  // Audience-filtered already (see useMyNotifications) — just trim to 5 here.
  const { messages: announcements, loading: announcementsLoading } = useMyNotifications()
  const recentAnnouncements = announcements.slice(0, 5)

  const totalPower = ROSTER.reduce((s, m) => s + m.power_m, 0)
  const active = ROSTER.filter((m) => m.status !== 'temporary_out').length
  const tg5plus = ROSTER.filter((m) => (m.tg_level ?? 0) >= 5).length
  const tgAny = ROSTER.filter((m) => m.tg_level != null).length

  return (
    <div className="relative">
      {/* HERO — no redundant chip. Just crest + title + motto. */}
      <section className="container-narrow pt-7 pb-8 sm:pt-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative inline-flex items-center justify-center mb-4"
        >
          <span aria-hidden className="absolute h-36 w-36 rounded-full bg-gold/22 blur-3xl" />
          <span aria-hidden className="absolute h-28 w-28 rounded-full bg-crimson/25 blur-2xl" />
          <DadCrest size={88} withRibbon className="relative animate-float" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          className="font-display text-3xl sm:text-5xl tracking-wider uppercase mb-3 leading-tight notranslate"
          translate="no"
        >
          <span className="text-gold-shimmer">DAD</span>{' '}
          <span className="text-ink-cream">BIGDADDYS</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="font-sub italic text-gold-soft text-sm sm:text-base notranslate"
          translate="no"
        >
          {`"${motto}"`}
        </motion.p>
      </section>

      <div className="container-wide pb-12 sm:pb-16 space-y-4 sm:space-y-5">
        <div className="divider-gold" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
        >
          <StatTile icon={Trophy} labelKey="alliance.stats.rank" value={rank} sub={tagline} tint="gold" />
          <StatTile
            icon={UsersThree}
            labelKey="alliance.stats.members"
            value={`${active}`}
            sub={t('alliance.stats.membersSub', { count: ROSTER.length })}
            tint="crimson"
          />
          <StatTile
            icon={Shield}
            labelKey="alliance.stats.power"
            value={formatPower(totalPower)}
            sub={t('alliance.stats.powerSub')}
            tint="steel"
          />
        </motion.div>

        {/* CTA row — entry points to subroutes (PLANNING.md §1octies-bis) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <CtaCard
            to="/alliance/polls"
            icon={ListChecks}
            title={t('alliance.cta.polls.title')}
            subtitle={t('alliance.cta.polls.subtitle')}
          />
          <CtaCard
            to="/alliance/members"
            icon={UsersThree}
            title={t('alliance.cta.members.title')}
            subtitle={t('alliance.cta.members.subtitle')}
          />
        </motion.div>

        {/* Catalogue CTA grid — quick access to public game catalogue pages */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="card-hero overflow-hidden"
        >
          <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
            <span className="icon-frame icon-frame--sm text-gold-soft">
              <BookBookmark size={18} weight="duotone" />
            </span>
            <div>
              <div className="eyebrow">{t('alliance.catalogue.eyebrow')}</div>
              <h2 className="hero-title text-lg sm:text-xl mt-0.5">{t('alliance.catalogue.title')}</h2>
              <p className="text-[11px] sm:text-xs text-ink-mute mt-1 leading-snug">
                {t('alliance.catalogue.description')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-5 sm:px-6 pb-5">
            <CatalogueChip to="/heroes" icon={Shield} label={t('alliance.catalogue.heroes')} />
            <CatalogueChip to="/pets" icon={PawPrint} label={t('alliance.catalogue.pets')} />
            <CatalogueChip to="/masters" icon={Crown} label={t('alliance.catalogue.masters')} />
            <CatalogueChip to="/troop-tiers" icon={Sparkle} label={t('alliance.catalogue.troopTiers')} />
          </div>
        </motion.section>

        <div className="card-hero">
          <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
            <span className="icon-frame icon-frame--sm text-gold-soft">
              <Shield size={18} weight="duotone" />
            </span>
            <div>
              <div className="eyebrow">{t('alliance.composition.eyebrow')}</div>
              <h2 className="hero-title text-lg sm:text-xl mt-0.5">{t('alliance.composition.title')}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 sm:px-6 pb-4">
            <Compo label={t('alliance.composition.truegoldMembers')} value={`${tgAny} / ${ROSTER.length}`} />
            <Compo label={t('alliance.composition.tg5Ready')} value={`${tg5plus}`} />
            <Compo label={t('alliance.composition.avgPower')} value={formatPower(totalPower / ROSTER.length)} />
            <Compo label={t('alliance.composition.minTroopTier')} value="T8" />
          </div>
        </div>

        <section className="card-hero">
          <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
            <span className="icon-frame icon-frame--sm text-gold-soft">
              <Megaphone size={18} weight="duotone" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="eyebrow">{t('alliance.announcements.eyebrow')}</div>
              <h2 className="hero-title text-lg sm:text-xl mt-0.5">{t('alliance.announcements.title')}</h2>
              {recentAnnouncements.length === 0 && !announcementsLoading && (
                <p className="text-xs text-ink-mute mt-1 leading-snug">
                  {t('alliance.announcements.emptyHint')}
                </p>
              )}
            </div>
          </div>

          {announcementsLoading ? (
            <div className="px-5 sm:px-6 pb-5 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg bg-bg-elev/60 animate-pulse"
                />
              ))}
            </div>
          ) : recentAnnouncements.length > 0 ? (
            <ul className="px-5 sm:px-6 pb-2 divide-y divide-gold/10">
              {recentAnnouncements.map((msg) => {
                const target = resolveAnnouncementTarget(msg)
                const stamp = announcementTimeAgo(msg.sent_at ?? msg.created_at)
                return (
                  <li key={msg.id}>
                    <Link
                      to={target}
                      className="flex items-start gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-gold/5 transition-colors group"
                    >
                      <span
                        aria-hidden
                        className="shrink-0 mt-0.5 text-base leading-none"
                      >
                        {msg.emoji ?? '📣'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-ink-cream truncate font-medium">
                            {msg.title}
                          </span>
                          {stamp && (
                            <span className="text-[10px] text-ink-mute shrink-0">
                              {stamp}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-mute mt-0.5 leading-snug line-clamp-2">
                          {msg.body}
                        </p>
                      </div>
                      <CaretRight
                        size={14}
                        weight="bold"
                        className="text-ink-mute group-hover:text-gold-soft group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : null}

          <div className="card-foot">
            <span className="text-[11px] text-ink-mute">
              {recentAnnouncements.length > 0
                ? t('alliance.announcements.showing', { count: recentAnnouncements.length })
                : t('alliance.announcements.none')}
            </span>
          </div>
        </section>

      </div>
    </div>
  )
}

function CtaCard({
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  to: string
  icon: typeof Shield
  title: string
  subtitle: string
}) {
  const { t } = useTranslation()
  return (
    <Link
      to={to}
      className="card-hero block hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start gap-3 p-5">
        <span className="icon-frame icon-frame--sm text-gold-soft">
          <Icon size={18} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('alliance.cta.open')}</div>
          <h3 className="hero-title text-base sm:text-lg mt-0.5 truncate">{title}</h3>
          <p className="text-[11px] text-ink-mute mt-1 leading-snug">{subtitle}</p>
        </div>
        <CaretRight
          size={16}
          weight="bold"
          className="text-gold-soft group-hover:translate-x-1 transition-transform shrink-0 mt-1"
        />
      </div>
    </Link>
  )
}

function CatalogueChip({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: typeof Shield
  label: string
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-gold/20 bg-bg-card/40 px-3 py-4 text-center transition-colors hover:border-gold/55 hover:bg-gold/10"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gold/30 bg-bg-deep/60 text-gold-soft group-hover:text-gold">
        <Icon size={18} weight="duotone" />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-cream">
        {label}
      </span>
    </Link>
  )
}

const TINT_STYLES: Record<StatTint, { card: string; chip: string; icon: string; value: string }> = {
  gold: {
    card: 'border-gold/30 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent',
    chip: 'bg-gold/15 border-gold/40',
    icon: 'text-gold-soft',
    value: 'text-gold',
  },
  crimson: {
    card: 'border-crimson/35 bg-gradient-to-br from-crimson/12 via-crimson/5 to-transparent',
    chip: 'bg-crimson/15 border-crimson/40',
    icon: 'text-crimson-glow',
    value: 'text-crimson-glow',
  },
  steel: {
    card: 'border-steel/40 bg-gradient-to-br from-steel/12 via-steel/5 to-transparent',
    chip: 'bg-steel/15 border-steel/45',
    icon: 'text-ink-cream',
    value: 'text-ink-cream',
  },
}

function StatTile({
  icon: Icon,
  labelKey,
  value,
  sub,
  tint = 'gold',
}: {
  icon: typeof Trophy
  labelKey: string
  value: string | number
  sub?: string
  tint?: StatTint
}) {
  const styles = TINT_STYLES[tint]
  const glow =
    tint === 'crimson'
      ? '0 0 18px -6px rgba(226,86,86,0.55)'
      : tint === 'steel'
        ? '0 0 18px -6px rgba(108,122,146,0.55)'
        : '0 0 18px -6px rgba(244,207,115,0.6)'
  return (
    <div
      className={`card-hero p-4 sm:p-5 ${styles.card}`}
      style={{ boxShadow: `inset 0 1px 0 0 rgba(255,219,138,0.10), 0 22px 36px -22px rgba(0,0,0,0.6), ${glow}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 h-11 w-11 rounded-xl border flex items-center justify-center ${styles.chip}`}
          style={{ boxShadow: glow }}
        >
          <Icon size={18} weight="duotone" className={styles.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <I18nText k={labelKey} maxLines={1} className="eyebrow-mute" />
          <div
            className={`font-mono text-2xl sm:text-3xl tabular-nums leading-none mt-1 truncate notranslate ${styles.value}`}
            translate="no"
            title={String(value)}
          >
            {value}
          </div>
          {sub && <div className="text-[10px] text-ink-mute mt-1.5 truncate" title={sub}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

function Compo({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="eyebrow-mute">{label}</div>
      <div className="font-mono text-xl sm:text-2xl text-gold tabular-nums leading-none mt-1">
        {value}
      </div>
    </div>
  )
}
