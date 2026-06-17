import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MagnifyingGlass, WarningCircle } from '@phosphor-icons/react'
import {
  RANK_ORDER,
  formatPower,
  highestTroopTier,
  tierSortValue,
} from '../data/roster'
import type { RosterMember } from '../data/roster'
import { MemberCard } from '../components/MemberCard'
import { useMembers } from '../hooks/useMembers'
import { useAccounts } from '../hooks/useAccounts'
import { membersToRoster } from '../lib/memberAdapter'
import { resolveAvatarUrl } from '../lib/heroAvatar'
import { cn } from '../lib/cn'

type SortKey = 'power' | 'tier' | 'rank' | 'nick'

export function Members() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('power')

  const SORTS: { id: SortKey; label: string }[] = [
    { id: 'power', label: t('members.sort.power') },
    { id: 'tier', label: t('members.sort.tier') },
    { id: 'rank', label: t('members.sort.rank') },
    { id: 'nick', label: t('members.sort.nick') },
  ]
  const { members: dbMembers, loading, error } = useMembers()
  const { accounts } = useAccounts()

  // Convert the DB shape into the static-roster shape MemberCard expects.
  const roster = useMemo(() => membersToRoster(dbMembers), [dbMembers])

  // Build nick → resolved avatar URL map so members with a linked account get
  // their uploaded/picked portrait; everyone else falls back consistently.
  const avatarByNick = useMemo(() => {
    const map = new Map<string, string>()
    const accountByMemberId = new Map(
      accounts.filter((a) => a.memberId).map((a) => [a.memberId as string, a]),
    )
    for (const m of dbMembers) {
      const account = accountByMemberId.get(m.id)
      map.set(
        m.nick,
        resolveAvatarUrl({
          uploadedUrl: account?.avatarImageUrl,
          heroSlug: account?.avatarHeroSlug,
          // Stable seed when no account is linked → consistent across renders.
          seed: account?.username ?? m.id,
        }),
      )
    }
    return map
  }, [dbMembers, accounts])

  const sorted: RosterMember[] = useMemo(() => {
    const filtered = roster.filter((m) =>
      query.trim() === '' ? true : m.nick.toLowerCase().includes(query.toLowerCase()),
    )
    const arr = [...filtered]
    arr.sort((a, b) => {
      switch (sort) {
        case 'power':
          return b.power_m - a.power_m
        case 'tier':
          return tierSortValue(highestTroopTier(b)) - tierSortValue(highestTroopTier(a))
        case 'rank':
          return RANK_ORDER[b.rank] - RANK_ORDER[a.rank] || b.power_m - a.power_m
        case 'nick':
          return a.nick.localeCompare(b.nick)
      }
    })
    return arr
  }, [query, sort, roster])

  const totalPower = useMemo(() => roster.reduce((s, m) => s + m.power_m, 0), [roster])

  return (
    <div className="container-wide pt-5 pb-12 sm:pt-10 sm:pb-16">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 sm:mb-6"
      >
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-1 text-center">{t('members.page.eyebrow')}</div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none text-center">
          {t('members.page.title')}
        </h1>
        <p className="text-xs sm:text-sm text-ink-mute mt-1.5">
          {loading ? t('members.page.loading') : t('members.page.memberCount', { count: roster.length })}
          {!loading && (
            <>
              {' '}· {t('members.page.combinedPower')}{' '}
              <span className="text-gold-soft">{formatPower(totalPower)}</span>
            </>
          )}
        </p>
        {error && (
          <div className="callout-warn mt-3 flex items-start gap-2 text-sm">
            <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}
      </motion.header>

      <div className="card p-3 sm:p-3.5 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="relative flex-1">
          <MagnifyingGlass
            size={15}
            weight="duotone"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('members.search.placeholder')}
            className="w-full rounded-lg bg-bg-deep pl-9 pr-3 py-2 text-sm text-ink-cream placeholder:text-ink-mute border border-gold/15 focus:outline-none focus:border-gold/45 transition-colors"
          />
        </label>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase tracking-[0.22em] text-ink-mute pr-1 shrink-0">
            {t('members.sort.label')}
          </span>
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={cn(
                'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] transition-all border',
                sort === s.id
                  ? 'bg-gold-gradient text-bg-deep border-gold'
                  : 'bg-bg-card/40 text-ink-soft border-gold/15 hover:border-gold/35',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ul
        className="grid gap-2.5 sm:gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <li
                key={i}
                className="rounded-2xl bg-bg-card/40 border border-gold/10 animate-pulse h-[78px]"
              />
            ))
          : sorted.map((m, idx) => (
              <MemberCard
                key={m.nick}
                m={m}
                index={idx}
                avatarUrl={avatarByNick.get(m.nick)}
                to={`/alliance/members/${encodeURIComponent(m.nick)}`}
              />
            ))}
        {!loading && sorted.length === 0 && (
          <li className="col-span-full text-center text-sm text-ink-mute py-8">
            {query.trim()
              ? t('members.empty.noMatch', { query })
              : t('members.empty.noMembers')}
          </li>
        )}
      </ul>
    </div>
  )
}
