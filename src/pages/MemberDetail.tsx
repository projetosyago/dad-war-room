import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CalendarBlank,
  Crown,
  Pause,
  Sparkle,
  WarningCircle,
} from '@phosphor-icons/react'
import { useMemberDetail } from '../hooks/useMemberDetail'
import { useAccounts } from '../hooks/useAccounts'
import { PowerChart } from '../components/charts/PowerChart'
import { resolveAvatarUrl } from '../lib/heroAvatar'
import { formatPower } from '../data/roster'
import type { MemberParticipationView } from '../repositories/eventParticipants'

const RANK_LABEL: Record<string, string> = {
  r1: 'R1',
  r2: 'R2',
  r3: 'R3',
  r4: 'R4',
  r5: 'R5',
}

export function MemberDetail() {
  const { nick: rawNick } = useParams<{ nick: string }>()
  const nick = rawNick ? decodeURIComponent(rawNick) : ''
  const { member, snapshots, participations, loading, error } = useMemberDetail(nick)
  // We don't strictly need every account, just the one linked to this member.
  // Reusing useAccounts keeps the avatar resolver consistent with Members.tsx.
  const { accounts } = useAccounts()

  const account = useMemo(() => {
    if (!member) return null
    return accounts.find((a) => a.memberId === member.id) ?? null
  }, [accounts, member])

  const avatarUrl = useMemo(() => {
    if (!member) return null
    return resolveAvatarUrl({
      uploadedUrl: account?.avatarImageUrl,
      heroSlug: account?.avatarHeroSlug,
      seed: account?.username ?? member.id,
    })
  }, [member, account])

  return (
    <div className="container-narrow pt-5 pb-12 sm:pt-8 sm:pb-16 space-y-4">
      {/* Back affordance lives in the sticky Header now. The NotFoundCard below
          keeps its own "back to list" CTA because it's an empty-state action, not
          a header-style breadcrumb. */}
      {loading ? (
        <>
          <div className="card-hero h-[200px] animate-pulse" />
          <div className="card-hero h-[280px] animate-pulse" />
          <div className="card-hero h-[160px] animate-pulse" />
        </>
      ) : error ? (
        <div className="card-hero card-hero--crimson p-5 flex items-start gap-2">
          <WarningCircle size={16} weight="duotone" className="text-crimson-glow shrink-0 mt-0.5" />
          <p className="text-sm text-crimson-glow">{error.message}</p>
        </div>
      ) : !member ? (
        <NotFoundCard nick={nick} />
      ) : (
        <>
          <Hero
            nick={member.nick}
            rank={member.rank}
            powerM={member.powerM}
            tgLevel={member.tgLevel}
            dadTag={member.dadTag}
            status={member.status}
            statusNote={member.statusNote}
            avatarUrl={avatarUrl ?? '/images/icons/kingshot/heroes/howard.webp'}
          />
          <PowerChart snapshots={snapshots} />
          <ParticipationCard participations={participations} />
        </>
      )}
    </div>
  )
}

function NotFoundCard({ nick }: { nick: string }) {
  const { t } = useTranslation()
  return (
    <div className="card-hero p-6 sm:p-8 text-center">
      <div className="eyebrow text-crimson-glow/80">{t('members.detail.notFoundEyebrow')}</div>
      <h1 className="hero-title text-xl sm:text-2xl mt-1">
        {nick ? t('members.detail.notFoundWithNick', { nick }) : t('members.detail.notFoundNoNick')}
      </h1>
      <p className="text-sm text-ink-mute mt-2">
        {t('members.detail.notFoundDescription')}
      </p>
      <Link
        to="/alliance/members"
        className="btn-ghost mt-5 inline-flex"
      >
        <ArrowLeft size={14} weight="bold" />
        {t('members.detail.backToList')}
      </Link>
    </div>
  )
}

interface HeroProps {
  nick: string
  rank: string
  powerM: number
  tgLevel: number | null
  dadTag: string | null
  status: string
  statusNote: string | null
  avatarUrl: string
}

function Hero({
  nick,
  rank,
  powerM,
  tgLevel,
  dadTag,
  status,
  statusNote,
  avatarUrl,
}: HeroProps) {
  const { t } = useTranslation()
  const RANK_TITLE: Record<string, string> = {
    r1: t('members.rank.r1Title'),
    r2: t('members.rank.r2Title'),
    r3: t('members.rank.r3Title'),
    r4: t('members.rank.r4Title'),
    r5: t('members.rank.r5Title'),
  }
  const rankLabel = RANK_LABEL[rank] ?? rank.toUpperCase()
  const rankTitle = RANK_TITLE[rank] ?? ''
  const isOut = status === 'temporary_out'
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="card-hero card-hero--portrait"
    >
      <div className="relative flex items-center gap-4 p-5 sm:p-6 pb-4">
        {/* Avatar medallion — same double-ring as UserHeroCard for consistency */}
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute -inset-1.5 rounded-full bg-gold/25 blur-md"
          />
          <div
            className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full p-[2px]"
            style={{
              background:
                'linear-gradient(135deg, #ffe9a3 0%, #f4cf73 50%, #c89934 100%)',
            }}
          >
            <div
              className="rounded-full p-[1.5px] h-full w-full"
              style={{
                background:
                  'linear-gradient(135deg, #b04949 0%, #6d1818 100%)',
              }}
            >
              <img
                src={avatarUrl}
                alt={nick}
                className="rounded-full h-full w-full object-cover"
              />
            </div>
          </div>
          {dadTag && (
            <span className="absolute -bottom-1 -right-1 inline-flex items-center px-1.5 py-0.5 rounded-md bg-crimson text-ink-cream text-[9px] font-bold tracking-[0.18em] uppercase border border-crimson-glow/60 shadow-lg">
              DAD
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="eyebrow">{rankTitle || t('members.rank.defaultTitle')}</div>
          <h1 className="font-display tracking-[0.06em] text-2xl sm:text-3xl truncate leading-tight mt-0.5">
            <span className="text-gold-shimmer">{nick}</span>
          </h1>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="badge-gold inline-flex">
              <Crown size={11} weight="duotone" />
              {rankLabel}
            </span>
            {dadTag && (
              <span className="badge-mute inline-flex">
                <Sparkle size={11} weight="duotone" />
                {t('members.detail.dadTagLabel', { tag: dadTag })}
              </span>
            )}
            {isOut && (
              <span className="badge-danger inline-flex" title={statusNote ?? t('members.status.temporarilyOut')}>
                <Pause size={11} weight="duotone" />
                {t('members.status.temporaryOut')}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-end gap-6">
            <Stat
              value={formatPower(powerM)}
              label={t('members.stat.power')}
              imageSrc="/images/buildings/truegold-barracks.png"
              tint="steel"
            />
            {tgLevel != null && (
              <Stat
                value={`TG${tgLevel}`}
                label={t('members.stat.truegold')}
                imageSrc={`/images/tiers/tg${Math.min(8, Math.max(1, tgLevel))}.png`}
                tint="gold"
              />
            )}
          </div>
        </div>
      </div>
      {statusNote && isOut && (
        <div className="card-foot">
          <span className="text-[11px] text-ink-mute">{t('members.detail.noteLabel')}</span>
          <span className="text-xs text-crimson-glow/90 truncate ml-2">{statusNote}</span>
        </div>
      )}
    </motion.div>
  )
}

function Stat({
  value,
  label,
  imageSrc,
  tint,
}: {
  value: string
  label: string
  imageSrc: string
  tint: 'gold' | 'steel'
}) {
  const valueClass = tint === 'gold' ? 'text-gold' : 'text-[#9fb2cc]'
  return (
    <div className="flex flex-col items-start">
      <span
        className={`font-mono text-2xl sm:text-3xl tabular-nums leading-none ${valueClass}`}
      >
        {value}
      </span>
      <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] tracking-[0.28em] uppercase font-semibold text-ink-mute">
        <img src={imageSrc} alt="" className="h-3.5 w-3.5 object-contain" />
        {label}
      </span>
    </div>
  )
}

interface GroupedParticipation {
  eventName: string
  eventSlug: string
  count: number
  /** Most recent occurrence start, ISO string. */
  latestStartUtc: string
  occurrences: MemberParticipationView[]
}

function ParticipationCard({
  participations,
}: {
  participations: MemberParticipationView[]
}) {
  const { t } = useTranslation()
  const ROLE_LABEL: Record<string, string> = {
    leader: t('members.role.leader'),
    joiner: t('members.role.joiner'),
    standby: t('members.role.standby'),
  }
  // Group by event name so a member with 12 Bear hunts shows up as "Bear ×12"
  // instead of 12 identical rows. Inside each group we keep the raw history
  // for the expandable list.
  const grouped = useMemo<GroupedParticipation[]>(() => {
    const map = new Map<string, GroupedParticipation>()
    for (const p of participations) {
      const existing = map.get(p.eventSlug)
      if (existing) {
        existing.count += 1
        existing.occurrences.push(p)
        if (p.startsAtUtc > existing.latestStartUtc) {
          existing.latestStartUtc = p.startsAtUtc
        }
      } else {
        map.set(p.eventSlug, {
          eventName: p.eventName,
          eventSlug: p.eventSlug,
          count: 1,
          latestStartUtc: p.startsAtUtc,
          occurrences: [p],
        })
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      b.latestStartUtc.localeCompare(a.latestStartUtc),
    )
  }, [participations])

  return (
    <div className="card-hero p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="icon-frame icon-frame--sm text-gold-soft">
          <CalendarBlank size={20} weight="duotone" />
        </span>
        <div>
          <div className="eyebrow">{t('members.participation.eyebrow')}</div>
          <h2 className="hero-title text-lg sm:text-xl mt-0.5">{t('members.participation.title')}</h2>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="text-sm text-ink-mute py-6 text-center">
          {t('members.participation.empty')}
        </div>
      ) : (
        <ul className="space-y-2">
          {grouped.map((g) => (
            <li
              key={g.eventSlug}
              className="rounded-xl bg-bg-deep/40 border border-gold/10 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-ink-cream truncate">
                  {g.eventName}
                </span>
                <span className="badge-gold inline-flex shrink-0">
                  ×{g.count}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-ink-mute tracking-wide">
                {t('members.participation.latest')}:{' '}
                <span className="text-gold-soft/90">
                  {format(new Date(g.latestStartUtc), 'MMM dd, yyyy')}
                </span>
                {g.occurrences[0]?.role && (
                  <>
                    {' '}·{' '}
                    <span className="text-ink-soft">
                      {ROLE_LABEL[g.occurrences[0].role] ?? g.occurrences[0].role}
                    </span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
