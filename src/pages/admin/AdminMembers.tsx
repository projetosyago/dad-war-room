import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Check,
  Crown,
  MagnifyingGlass,
  PencilSimple,
  ShieldStar,
  Sword,
  UsersThree,
  UserCircle,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useMembers } from '../../hooks/useMembers'
import { updateMember } from '../../repositories/members'
import type {
  AllianceRank,
  Member,
  MemberStatusValue,
  MemberSubgroup,
} from '../../types/domain'
import { cn } from '../../lib/cn'

const RANKS: { value: AllianceRank; label: string; Icon: typeof Crown; tint: string }[] = [
  { value: 'r5', label: 'R5', Icon: Crown,      tint: 'text-gold-glow' },
  { value: 'r4', label: 'R4', Icon: ShieldStar, tint: 'text-gold-glow' },
  { value: 'r3', label: 'R3', Icon: Sword,      tint: 'text-gold-soft' },
  { value: 'r2', label: 'R2', Icon: UserCircle, tint: 'text-gold-soft' },
  { value: 'r1', label: 'R1', Icon: UserCircle, tint: 'text-gold-soft' },
]

const SUBGROUPS: { value: MemberSubgroup; labelKey: string }[] = [
  { value: 'supreme',    labelKey: 'admin.members.subgroups.supreme' },
  { value: 'enforcerer', labelKey: 'admin.members.subgroups.enforcerer' },
  { value: 'alpha',      labelKey: 'admin.members.subgroups.alpha' },
  { value: 'lieutenant', labelKey: 'admin.members.subgroups.lieutenant' },
]

const STATUSES: { value: MemberStatusValue; labelKey: string; tint: string }[] = [
  { value: 'active',        labelKey: 'admin.members.statuses.active',        tint: 'text-success' },
  { value: 'temporary_out', labelKey: 'admin.members.statuses.temporaryOut',  tint: 'text-gold-soft' },
  { value: 'left',          labelKey: 'admin.members.statuses.left',          tint: 'text-ink-mute' },
]

const RANK_META = Object.fromEntries(RANKS.map((r) => [r.value, r]))

type Filter = 'all' | AllianceRank | 'temp_out'

function formatPower(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)}B`
  return `${m.toFixed(1)}M`
}

function tierLabel(m: Member, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (m.tgLevel != null) return `TG${m.tgLevel}`
  if (m.townCenterLevel != null) return t('admin.members.lvlLabel', { level: m.townCenterLevel })
  return '—'
}

export function AdminMembers() {
  const { t } = useTranslation()
  const { members, loading, error: loadError, refetch } = useMembers(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Member | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = members
    if (filter === 'temp_out') list = list.filter((m) => m.status === 'temporary_out')
    else if (filter !== 'all') list = list.filter((m) => m.rank === filter)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((m) => m.nick.toLowerCase().includes(q))
    return list
  }, [members, filter, query])

  const counts = useMemo(() => {
    const byRank = { r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 } as Record<AllianceRank, number>
    let tempOut = 0
    let totalActive = 0
    let totalPower = 0
    for (const m of members) {
      if (m.status === 'left') continue
      byRank[m.rank]++
      totalActive++
      totalPower += m.powerM
      if (m.status === 'temporary_out') tempOut++
    }
    return { byRank, tempOut, totalActive, totalPower }
  }, [members])

  return (
    <div className="container-wide pt-6 sm:pt-12 pb-28 sm:pb-12">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" /> {t('admin.members.backToAdmin')}
      </Link>

      <header className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center shrink-0">
            <UsersThree size={18} weight="duotone" className="text-gold-soft" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.members.eyebrow')}</div>
            <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
              {t('admin.members.title')}
            </h1>
            <p className="text-[11px] text-ink-mute mt-1">
              {t('admin.members.statsMembers', { count: counts.totalActive })} ·{' '}
              <span className="text-gold-soft">{formatPower(counts.totalPower)}</span> {t('admin.members.combinedPower')}
              {counts.tempOut > 0 && (
                <> · <span className="text-warning">{t('admin.members.statsTempOut', { count: counts.tempOut })}</span></>
              )}
            </p>
          </div>
        </div>
        <Link to="/admin/members/accounts" className="btn-ghost text-xs self-start sm:self-auto">
          <UserCircle size={14} weight="duotone" /> {t('admin.members.accountsLink')}
        </Link>
      </header>

      {/* Filters + search */}
      <div className="card p-3 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="relative flex-1 min-w-0">
          <MagnifyingGlass
            size={15}
            weight="duotone"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.members.searchPlaceholder')}
            className="w-full min-w-0 rounded-lg bg-bg-deep pl-9 pr-3 py-2 text-sm text-ink-cream placeholder:text-ink-mute border border-gold/15 focus:outline-none focus:border-gold/45 transition-colors"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            {t('admin.members.filters.all')} <span className="ml-1.5 opacity-60">{counts.totalActive}</span>
          </FilterChip>
          {RANKS.map((r) => (
            <FilterChip key={r.value} active={filter === r.value} onClick={() => setFilter(r.value)}>
              {r.label} <span className="ml-1.5 opacity-60">{counts.byRank[r.value]}</span>
            </FilterChip>
          ))}
          {counts.tempOut > 0 && (
            <FilterChip active={filter === 'temp_out'} onClick={() => setFilter('temp_out')}>
              {t('admin.members.filters.out')} <span className="ml-1.5 opacity-60">{counts.tempOut}</span>
            </FilterChip>
          )}
        </div>
      </div>

      {feedback && (
        <div className="callout-gold mb-4 flex items-start gap-2 text-sm">
          <Check size={14} weight="bold" className="text-gold shrink-0 mt-0.5" />
          <span>{feedback}</span>
        </div>
      )}
      {error && (
        <div className="callout-warn mb-4 flex items-start gap-2 text-sm">
          <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {loadError && (
        <div className="callout-warn mb-4 flex items-start gap-2 text-sm">
          <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span>{loadError.message}</span>
        </div>
      )}

      <ul className="card divide-y divide-gold/15 overflow-hidden">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-4 sm:px-5 py-3.5 animate-pulse">
                <div className="h-3 bg-bg-elev rounded w-40 mb-2" />
                <div className="h-2.5 bg-bg-elev rounded w-24" />
              </li>
            ))
          : filtered.length === 0
            ? (
                <li className="px-4 sm:px-5 py-10 text-center">
                  <UsersThree size={28} weight="duotone" className="mx-auto text-ink-mute mb-2" />
                  <div className="text-sm text-ink-paper">{t('admin.members.emptyState')}</div>
                </li>
              )
            : filtered.map((m) => (
                <MemberRow key={m.id} member={m} onEdit={() => setEditing(m)} />
              ))}
      </ul>

      {editing && (
        <EditDrawer
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={(nick) => {
            setEditing(null)
            setFeedback(t('admin.members.feedbackSaved', { nick }))
            setError(null)
            refetch()
          }}
          onError={(msg) => {
            setError(msg)
            setFeedback(null)
          }}
        />
      )}
    </div>
  )
}

function MemberRow({ member, onEdit }: { member: Member; onEdit: () => void }) {
  const { t } = useTranslation()
  const meta = RANK_META[member.rank]
  const Icon = meta.Icon
  const isOut = member.status === 'temporary_out'
  const isLeft = member.status === 'left'

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-4 sm:px-5 py-3.5',
        isLeft && 'opacity-40',
        isOut && 'opacity-75',
      )}
    >
      <span className="h-10 w-10 rounded-lg border border-gold/30 bg-gold/8 flex items-center justify-center shrink-0">
        <Icon size={16} weight="duotone" className={meta.tint} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-ink-cream font-medium leading-tight truncate">
            {member.nick}
          </span>
          <span className="inline-flex items-center text-[9px] font-bold tracking-[0.20em] uppercase rounded bg-gold/10 text-gold-soft border border-gold/25 px-1.5 py-0.5 leading-none">
            {member.rank.toUpperCase()}
          </span>
          {member.subgroup && (
            <span className="text-[9px] tracking-widest uppercase text-ink-mute">
              {member.subgroup}
            </span>
          )}
          {isOut && (
            <span className="text-[9px] tracking-widest uppercase text-warning">
              · {t('admin.members.tempOutShort')}
            </span>
          )}
          {isLeft && (
            <span className="text-[9px] tracking-widest uppercase text-ink-mute">· {t('admin.members.leftShort')}</span>
          )}
        </div>
        <div className="text-[11px] text-ink-mute mt-0.5 truncate">
          {tierLabel(member, t)} · <span className="text-gold-soft">{formatPower(member.powerM)}</span>
          {member.langHint && <> · {member.langHint}</>}
          {member.dadTag && <> · DAD {member.dadTag}</>}
        </div>
      </div>

      <button
        onClick={onEdit}
        className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 shrink-0"
        title={t('admin.members.editButton')}
      >
        <PencilSimple size={12} weight="duotone" /> {t('admin.members.editButton')}
      </button>
    </li>
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
        'inline-flex items-center text-[11px] tracking-widest uppercase rounded-full px-3 py-1.5 border transition-colors',
        active
          ? 'bg-gold/15 text-gold-glow border-gold/45'
          : 'bg-bg-card text-ink-mute border-gold/15 hover:border-gold/35 hover:text-ink-cream',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Edit drawer — inline panel below the list (no modal lib dependency).
 * Mobile-friendly: fixed bottom sheet on small screens, side drawer on desktop.
 */
function EditDrawer({
  member,
  onClose,
  onSaved,
  onError,
}: {
  member: Member
  onClose: () => void
  onSaved: (nick: string) => void
  onError: (msg: string) => void
}) {
  const { t } = useTranslation()
  const [nick, setNick] = useState(member.nick)
  const [rank, setRank] = useState<AllianceRank>(member.rank)
  const [subgroup, setSubgroup] = useState<MemberSubgroup | ''>(member.subgroup ?? '')
  const [powerM, setPowerM] = useState(member.powerM.toString())
  const [tgLevel, setTgLevel] = useState<string>(member.tgLevel?.toString() ?? '')
  const [tcLevel, setTcLevel] = useState<string>(member.townCenterLevel?.toString() ?? '')
  const [status, setStatus] = useState<MemberStatusValue>(member.status)
  const [statusNote, setStatusNote] = useState(member.statusNote ?? '')
  const [langHint, setLangHint] = useState(member.langHint ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (tgLevel && tcLevel) {
      onError(t('admin.members.errors.tgOrTc'))
      return
    }
    setSubmitting(true)
    try {
      await updateMember(member.id, {
        nick: nick.trim(),
        rank,
        subgroup: subgroup ? (subgroup as MemberSubgroup) : null,
        powerM: parseFloat(powerM) || 0,
        tgLevel: tgLevel ? parseInt(tgLevel, 10) : null,
        townCenterLevel: tcLevel ? parseInt(tcLevel, 10) : null,
        status,
        statusNote: statusNote.trim() || null,
        langHint: langHint.trim() || null,
      })
      onSaved(nick.trim())
    } catch (e) {
      onError(e instanceof Error ? e.message : t('admin.members.errors.failedToSave'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-bg-deep/80 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        onSubmit={submit}
        className="fixed inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[440px]
                   z-50 card-elev rounded-t-2xl sm:rounded-l-2xl sm:rounded-t-none
                   max-h-[88dvh] sm:max-h-full overflow-y-auto
                   p-5 sm:p-6 flex flex-col gap-3"
      >
        <header className="flex items-center justify-between gap-3 mb-1">
          <h2 className="font-display-clean text-base text-gold tracking-wider uppercase truncate">
            {t('admin.members.edit.heading', { nick: member.nick })}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost !min-h-[32px] !p-2" aria-label={t('admin.members.edit.close')}>
            <X size={14} weight="bold" />
          </button>
        </header>

        <label className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.members.edit.nickLabel')}</span>
          <input
            required
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.members.edit.rankLabel')}</span>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value as AllianceRank)}
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
            >
              {RANKS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.members.edit.subgroupLabel')}</span>
            <select
              value={subgroup}
              onChange={(e) => setSubgroup(e.target.value as MemberSubgroup | '')}
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
            >
              <option value="">{t('admin.members.edit.noneOption')}</option>
              {SUBGROUPS.map((s) => (
                <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">
            {t('admin.members.edit.powerLabel')} <span className="text-ink-dim normal-case tracking-normal">{t('admin.members.edit.powerHint')}</span>
          </span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={powerM}
            onChange={(e) => setPowerM(e.target.value)}
            className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream font-mono focus:outline-none focus:border-gold/60 transition-colors"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.members.edit.tgLabel')}</span>
            <input
              type="number" min="1" max="8"
              value={tgLevel}
              onChange={(e) => { setTgLevel(e.target.value); if (e.target.value) setTcLevel('') }}
              placeholder={t('admin.members.edit.tgPlaceholder')}
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream font-mono focus:outline-none focus:border-gold/60 transition-colors"
            />
          </label>
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.members.edit.tcLabel')}</span>
            <input
              type="number" min="1" max="30"
              value={tcLevel}
              onChange={(e) => { setTcLevel(e.target.value); if (e.target.value) setTgLevel('') }}
              placeholder={t('admin.members.edit.tcPlaceholder')}
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream font-mono focus:outline-none focus:border-gold/60 transition-colors"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.members.edit.statusLabel')}</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MemberStatusValue)}
            className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
            ))}
          </select>
        </label>

        {(status === 'temporary_out' || status === 'left') && (
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">
              {status === 'temporary_out' ? t('admin.members.edit.tempOutNote') : t('admin.members.edit.leftNote')}
            </span>
            <textarea
              rows={2}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">
            {t('admin.members.edit.langHintLabel')} <span className="text-ink-dim normal-case tracking-normal">{t('admin.members.edit.langHintHint')}</span>
          </span>
          <input
            value={langHint}
            onChange={(e) => setLangHint(e.target.value)}
            placeholder={t('admin.members.edit.optional')}
            className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
          />
        </label>

        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onClose} className="btn-ghost" disabled={submitting}>
            {t('admin.members.edit.cancel')}
          </button>
          <button type="submit" className="btn-gold disabled:opacity-60" disabled={submitting}>
            <Check size={14} weight="bold" /> {submitting ? t('admin.members.edit.saving') : t('admin.members.edit.save')}
          </button>
        </div>
      </form>
    </>
  )
}
