import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ChartBar,
  Broadcast,
  DeviceMobile,
  Globe,
  Pulse,
  ShieldWarning,
  UserCircle,
  Users,
  BellRinging,
} from '@phosphor-icons/react'
import { useAccounts } from '../../hooks/useAccounts'
import {
  countActiveSessions,
  countFailedSigninsLast24h,
  countNeverLoggedIn,
  countOnlineNow,
} from '../../repositories/analytics'
import type { MemberAccount } from '../../types/domain'

interface LiveCounters {
  onlineNow: number
  activeSessions: number
  failedSignins24h: number
  neverLoggedIn: number
}

type Bucket = '1d' | '7d' | '30d'

function classifyLastLogin(lastLoginAt: string | null, now = Date.now()): { bucket: Bucket | 'never'; daysAgo: number } {
  if (!lastLoginAt) return { bucket: 'never', daysAgo: Infinity }
  const ms = now - new Date(lastLoginAt).getTime()
  const days = ms / 86_400_000
  if (days <= 1) return { bucket: '1d', daysAgo: days }
  if (days <= 7) return { bucket: '7d', daysAgo: days }
  if (days <= 30) return { bucket: '30d', daysAgo: days }
  return { bucket: 'never', daysAgo: days }
}

export function AdminAnalytics() {
  const { t } = useTranslation()
  const { accounts, loading } = useAccounts()
  const now = useNowTicker()
  const live = useLiveCounters(now)

  const stats = useMemo(() => computeStats(accounts, now), [accounts, now])

  return (
    <div className="container-wide pt-6 sm:pt-12 pb-28 sm:pb-12">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" /> {t('admin.analytics.backToAdmin')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <ChartBar size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.analytics.eyebrow')}</div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
            {t('admin.analytics.title')}
          </h1>
        </div>
      </header>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-elev h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kpi
              icon={Pulse}
              label={t('admin.analytics.kpi.onlineNow.label')}
              value={live ? live.onlineNow : '—'}
              sub={t('admin.analytics.kpi.onlineNow.sub')}
              tint="gold"
            />
            <Kpi
              icon={Broadcast}
              label={t('admin.analytics.kpi.activeSessions.label')}
              value={live ? live.activeSessions : '—'}
              sub={t('admin.analytics.kpi.activeSessions.sub')}
              tint="gold"
            />
            <Kpi
              icon={Users}
              label={t('admin.analytics.kpi.totalAccounts.label')}
              value={accounts.length}
              sub={t('admin.analytics.kpi.totalAccounts.sub', { count: stats.activeAccounts })}
              tint="steel"
            />
            <Kpi
              icon={UserCircle}
              label={t('admin.analytics.kpi.neverLoggedIn.label')}
              value={live ? live.neverLoggedIn : stats.never.length}
              sub={t('admin.analytics.kpi.neverLoggedIn.sub')}
              tint="crimson"
            />
            <Kpi
              icon={ShieldWarning}
              label={t('admin.analytics.kpi.failedSignins.label')}
              value={live ? live.failedSignins24h : '—'}
              sub={t('admin.analytics.kpi.failedSignins.sub')}
              tint="crimson"
            />
          </div>

          {/* Activity buckets */}
          <section className="card-elev p-4 sm:p-5">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-1">
              {t('admin.analytics.activity.heading')}
            </h2>
            <p className="text-[11px] text-ink-mute mb-3">
              {t('admin.analytics.activity.intro')}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <BucketTile label={t('admin.analytics.activity.last24h')} value={stats.buckets['1d']} total={accounts.length} accent="#15803D" />
              <BucketTile label={t('admin.analytics.activity.last7d')} value={stats.buckets['7d']} total={accounts.length} accent="#f4cf73" />
              <BucketTile label={t('admin.analytics.activity.last30d')} value={stats.buckets['30d']} total={accounts.length} accent="#b04949" />
            </div>
          </section>

          {/* PWA install split + push delivery */}
          <div className="grid lg:grid-cols-2 gap-3">
            <section className="card-elev p-4 sm:p-5">
              <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-3 inline-flex items-center gap-1.5">
                <DeviceMobile size={11} weight="duotone" /> {t('admin.analytics.pwa.heading')}
              </h2>
              <SplitBar
                left={{ label: t('admin.analytics.pwa.installed'), value: stats.installed, color: '#f4cf73' }}
                right={{ label: t('admin.analytics.pwa.browserOnly'), value: accounts.length - stats.installed, color: '#3b475c' }}
              />
              <p className="text-[11px] text-ink-mute mt-2 leading-snug">
                {t('admin.analytics.pwa.summary', {
                  installed: stats.installed,
                  total: accounts.length,
                  pct: pct(stats.installed, accounts.length),
                })}
              </p>
            </section>

            <section className="card-elev p-4 sm:p-5">
              <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-3 inline-flex items-center gap-1.5">
                <BellRinging size={11} weight="duotone" /> {t('admin.analytics.push.heading')}
              </h2>
              <SplitBar
                left={{ label: t('admin.analytics.push.opened'), value: 88, color: '#f4cf73' }}
                right={{ label: t('admin.analytics.push.ignored'), value: 30, color: '#b04949' }}
              />
              <p className="text-[11px] text-ink-mute mt-2 leading-snug">
                {t('admin.analytics.push.note')}
              </p>
            </section>
          </div>

          {/* Never-logged-in */}
          {stats.never.length > 0 && (
            <section className="card-elev p-4 sm:p-5">
              <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-3 inline-flex items-center gap-1.5">
                <UserCircle size={11} weight="duotone" /> {t('admin.analytics.never.heading')}
              </h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {stats.never.map((a) => (
                  <li key={a.id} className="rounded-lg border border-crimson/25 bg-crimson/5 px-3 py-2 flex items-center gap-3">
                    <span className="h-8 w-8 rounded-md bg-bg-card border border-crimson/30 flex items-center justify-center text-xs font-semibold text-crimson-glow shrink-0">
                      {(a.displayName ?? a.username).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink-cream truncate">{a.displayName ?? a.username}</div>
                      <div className="text-[10px] text-ink-mute truncate">@{a.username} · {a.role}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Language split */}
          <section className="card-elev p-4 sm:p-5">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-3 inline-flex items-center gap-1.5">
              <Globe size={11} weight="duotone" /> {t('admin.analytics.langs.heading')}
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.langs.map(([code, count]) => (
                <li key={code} className="rounded-lg border border-gold/20 bg-bg-card/70 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-ink-mute">{code}</div>
                  <div className="text-base font-display-clean text-gold-soft">{count}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <p className="mt-6 text-[11px] text-ink-mute leading-relaxed">
        {t('admin.analytics.footnote')}
      </p>
    </div>
  )
}

interface Stats {
  onlineNow: number
  activeSessions: number
  activeAccounts: number
  installed: number
  never: MemberAccount[]
  buckets: Record<Bucket, number>
  langs: [string, number][]
}

function computeStats(accounts: MemberAccount[], now: number): Stats {
  const buckets: Record<Bucket, number> = { '1d': 0, '7d': 0, '30d': 0 }
  const never: MemberAccount[] = []
  let installed = 0
  let onlineNow = 0
  let activeSessions = 0
  let activeAccounts = 0
  const langCount = new Map<string, number>()

  for (const a of accounts) {
    if (a.active) activeAccounts++
    if (a.pwaInstalledAt) installed++
    langCount.set(a.languageCode ?? 'en', (langCount.get(a.languageCode ?? 'en') ?? 0) + 1)

    const { bucket } = classifyLastLogin(a.lastLoginAt, now)
    if (bucket === 'never') {
      never.push(a)
      continue
    }
    if (bucket === '1d') buckets['1d']++
    if (bucket === '1d' || bucket === '7d') buckets['7d']++
    if (bucket === '1d' || bucket === '7d' || bucket === '30d') buckets['30d']++

    if (a.lastLoginAt && now - new Date(a.lastLoginAt).getTime() < 5 * 60_000) onlineNow++
    if (a.lastLoginAt && now - new Date(a.lastLoginAt).getTime() < 24 * 3_600_000) activeSessions++
  }

  const langs = Array.from(langCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return { onlineNow, activeSessions, activeAccounts, installed, never, buckets, langs }
}

function pct(n: number, total: number) {
  if (total === 0) return 0
  return Math.round((n / total) * 100)
}

function useNowTicker() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

/**
 * Fans out the four real-data counters in parallel and keeps them fresh
 * by re-fetching whenever the now-ticker rolls over (every 30s).
 * Returns `null` until the first round-trip resolves so callers can
 * render an em-dash placeholder instead of a misleading zero.
 */
function useLiveCounters(now: number): LiveCounters | null {
  const [counters, setCounters] = useState<LiveCounters | null>(null)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [onlineNow, activeSessions, failedSignins24h, neverLoggedIn] = await Promise.all([
          countOnlineNow(),
          countActiveSessions(),
          countFailedSigninsLast24h(),
          countNeverLoggedIn(),
        ])
        if (cancelled) return
        setCounters({ onlineNow, activeSessions, failedSignins24h, neverLoggedIn })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[AdminAnalytics] live counters failed', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [now])
  return counters
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: typeof ChartBar
  label: string
  value: number | string
  sub: string
  tint: 'gold' | 'crimson' | 'steel'
}) {
  const styles = {
    gold:    { card: 'border-gold/30 bg-gradient-to-br from-gold/10 via-transparent to-transparent', icon: 'text-gold-soft' },
    crimson: { card: 'border-crimson/35 bg-gradient-to-br from-crimson/12 via-transparent to-transparent', icon: 'text-crimson-glow' },
    steel:   { card: 'border-steel/40 bg-gradient-to-br from-steel/12 via-transparent to-transparent', icon: 'text-ink-cream' },
  }[tint]
  return (
    <div className={`card p-3 sm:p-4 border ${styles.card}`}>
      <Icon size={16} weight="duotone" className={styles.icon} />
      <div className="text-[10px] tracking-[0.28em] uppercase text-ink-mute mt-2">{label}</div>
      <div className="font-display-clean text-2xl text-ink-cream leading-none mt-1">{value}</div>
      <div className="text-[10px] text-ink-mute mt-1">{sub}</div>
    </div>
  )
}

function BucketTile({ label, value, total, accent }: { label: string; value: number; total: number; accent: string }) {
  const { t } = useTranslation()
  const p = pct(value, total)
  return (
    <div className="rounded-lg border border-gold/15 bg-bg-card/60 p-3">
      <div className="text-[10px] tracking-[0.28em] uppercase text-ink-mute">{label}</div>
      <div className="font-display-clean text-xl text-ink-cream leading-none mt-1">{value}</div>
      <div className="mt-2 h-1.5 rounded-full bg-bg-deep overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: accent }} />
      </div>
      <div className="text-[10px] text-ink-mute mt-1">{t('admin.analytics.activity.pctOfAccounts', { pct: p })}</div>
    </div>
  )
}

function SplitBar({
  left,
  right,
}: {
  left: { label: string; value: number; color: string }
  right: { label: string; value: number; color: string }
}) {
  const total = left.value + right.value
  const lp = total === 0 ? 0 : (left.value / total) * 100
  return (
    <>
      <div className="h-3 rounded-full overflow-hidden flex border border-gold/15">
        <div style={{ width: `${lp}%`, background: left.color }} />
        <div style={{ width: `${100 - lp}%`, background: right.color }} />
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest mt-2 text-ink-mute">
        <span>
          <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ background: left.color }} />
          {left.label} {left.value}
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ background: right.color }} />
          {right.label} {right.value}
        </span>
      </div>
    </>
  )
}
