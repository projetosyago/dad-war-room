import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowCounterClockwise,
  Check,
  Crown,
  Handshake,
  Key,
  LinkSimple,
  LinkBreak,
  MagnifyingGlass,
  Plus,
  Power,
  ShieldStar,
  User,
  UsersThree,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useAccounts } from '../../hooks/useAccounts'
import { useAuth } from '../../hooks/useAuth'
import { useMembers } from '../../hooks/useMembers'
import {
  createAccount,
  resetAccountPassword,
  setAccountActive,
} from '../../repositories/accounts'
import { linkAccountToMember } from '../../repositories/members'
import type { AccountRole, Member, MemberAccount } from '../../types/domain'
import { AllyChip } from '../../components/ui/AllyChip'
import { cn } from '../../lib/cn'

interface RoleMeta {
  value: AccountRole
  labelKey: string
  shortLabel: string
  descriptionKey: string
  Icon: typeof Crown
  color: string
}

const ROLES: RoleMeta[] = [
  { value: 'ally',   labelKey: 'admin.accounts.roles.ally.label',   shortLabel: 'ALLY',   descriptionKey: 'admin.accounts.roles.ally.description',   Icon: Handshake,  color: 'text-steel-soft' },
  { value: 'member', labelKey: 'admin.accounts.roles.member.label', shortLabel: 'MEMBER', descriptionKey: 'admin.accounts.roles.member.description', Icon: User,       color: 'text-gold-soft' },
  { value: 'r2',     labelKey: 'admin.accounts.roles.r2.label',     shortLabel: 'R2',     descriptionKey: 'admin.accounts.roles.r2.description',     Icon: User,       color: 'text-gold-soft' },
  { value: 'r3',     labelKey: 'admin.accounts.roles.r3.label',     shortLabel: 'R3',     descriptionKey: 'admin.accounts.roles.r3.description',     Icon: User,       color: 'text-gold-soft' },
  { value: 'r4',     labelKey: 'admin.accounts.roles.r4.label',     shortLabel: 'R4',     descriptionKey: 'admin.accounts.roles.r4.description',     Icon: ShieldStar, color: 'text-gold-glow' },
  { value: 'r5',     labelKey: 'admin.accounts.roles.r5.label',     shortLabel: 'R5',     descriptionKey: 'admin.accounts.roles.r5.description',     Icon: Crown,      color: 'text-gold-glow' },
]

const ROLE_BY_VALUE: Record<AccountRole, RoleMeta> = Object.fromEntries(
  ROLES.map((r) => [r.value, r]),
) as Record<AccountRole, RoleMeta>

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
]

type Filter = 'all' | 'members' | 'allies'

function formatRelativeFromNow(
  iso: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!iso) return t('admin.accounts.relative.never')
  const then = new Date(iso).getTime()
  const now = Date.now()
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 60) return t('admin.accounts.relative.justNow')
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return t('admin.accounts.relative.minutesAgo', { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('admin.accounts.relative.hoursAgo', { count: hours })
  const days = Math.round(hours / 24)
  if (days < 30) return t('admin.accounts.relative.daysAgo', { count: days })
  const months = Math.round(days / 30)
  if (months < 12) return t('admin.accounts.relative.monthsAgo', { count: months })
  return t('admin.accounts.relative.yearsAgo', { count: Math.round(months / 12) })
}

export function AdminAccounts() {
  const { t } = useTranslation()
  const auth = useAuth()
  const { accounts, loading, error: loadError, refetch } = useAccounts()
  const { members } = useMembers()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [linkingAccount, setLinkingAccount] = useState<MemberAccount | null>(null)

  // member_id → Member lookup for showing the linked nick on each row.
  const memberById = useMemo(() => {
    const map = new Map<string, Member>()
    for (const m of members) map.set(m.id, m)
    return map
  }, [members])

  // member_ids already taken by other accounts — picker hides these.
  const linkedMemberIds = useMemo(() => {
    const set = new Set<string>()
    for (const a of accounts) if (a.memberId) set.add(a.memberId)
    return set
  }, [accounts])

  // New-account form state
  const [showForm, setShowForm] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AccountRole>('ally')
  const [languageCode, setLanguageCode] = useState('en')
  const [submitting, setSubmitting] = useState(false)

  const allowedRoles = useMemo<RoleMeta[]>(() => {
    // r4 cannot mint another r5 (Edge Function enforces, UI hides).
    if (auth.role === 'r4') return ROLES.filter((r) => r.value !== 'r5')
    return ROLES
  }, [auth.role])

  const filtered = useMemo(() => {
    if (filter === 'members') return accounts.filter((a) => a.role !== 'ally')
    if (filter === 'allies') return accounts.filter((a) => a.role === 'ally')
    return accounts
  }, [accounts, filter])

  const memberCount = accounts.filter((a) => a.role !== 'ally').length
  const allyCount = accounts.filter((a) => a.role === 'ally').length

  function resetForm() {
    setUsername('')
    setDisplayName('')
    setPassword('')
    setRole('ally')
    setLanguageCode('en')
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setFeedback(null)
    setSubmitting(true)
    try {
      const newAccount = await createAccount({
        username,
        password,
        role,
        displayName: displayName || undefined,
        languageCode,
      })
      setFeedback(t('admin.accounts.feedback.created', { name: newAccount.displayName, role: newAccount.role }))
      resetForm()
      setShowForm(false)
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.accounts.errors.failedToCreate'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(account: MemberAccount) {
    const newPassword = window.prompt(
      t('admin.accounts.resetPasswordPrompt', { name: account.displayName, username: account.username }),
    )
    if (!newPassword) return
    if (newPassword.length < 6) {
      window.alert(t('admin.accounts.passwordTooShort'))
      return
    }
    setBusyId(account.id)
    setError(null)
    setFeedback(null)
    try {
      await resetAccountPassword(account.id, newPassword)
      setFeedback(t('admin.accounts.feedback.passwordReset', { name: account.displayName }))
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.accounts.errors.failedToReset'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleLink(account: MemberAccount, memberId: string | null) {
    setBusyId(account.id)
    setError(null)
    setFeedback(null)
    try {
      await linkAccountToMember(account.id, memberId)
      if (memberId) {
        setFeedback(t('admin.accounts.feedback.linked', {
          name: account.displayName,
          target: memberById.get(memberId)?.nick ?? t('admin.accounts.rosterFallback'),
        }))
      } else {
        setFeedback(t('admin.accounts.feedback.unlinked', { name: account.displayName }))
      }
      refetch()
      setLinkingAccount(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.accounts.errors.failedToLink'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleToggleActive(account: MemberAccount) {
    if (account.id === auth.user?.id && account.active) {
      window.alert(t('admin.accounts.cantDeactivateSelf'))
      return
    }
    const confirmKey = account.active ? 'admin.accounts.confirmDeactivate' : 'admin.accounts.confirmReactivate'
    if (!window.confirm(t(confirmKey, { name: account.displayName }))) return
    setBusyId(account.id)
    setError(null)
    setFeedback(null)
    try {
      await setAccountActive(account.id, !account.active)
      setFeedback(t(!account.active ? 'admin.accounts.feedback.reactivated' : 'admin.accounts.feedback.deactivated', { name: account.displayName }))
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.accounts.errors.failedToToggle'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="container-wide pt-6 sm:pt-12 pb-28 sm:pb-12">
      <Link
        to="/admin/members"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" /> {t('admin.accounts.backToMembers')}
      </Link>

      <header className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center shrink-0">
            <UsersThree size={18} weight="duotone" className="text-gold-soft" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.accounts.eyebrow')}</div>
            <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
              {t('admin.accounts.title')}
            </h1>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-gold self-start sm:self-auto"
          aria-expanded={showForm}
        >
          <Plus size={16} weight="bold" /> {showForm ? t('admin.accounts.closeForm') : t('admin.accounts.newAccount')}
        </button>
      </header>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          {t('admin.accounts.filters.all')} <span className="ml-1.5 opacity-60">{accounts.length}</span>
        </FilterChip>
        <FilterChip active={filter === 'members'} onClick={() => setFilter('members')}>
          {t('admin.accounts.filters.members')} <span className="ml-1.5 opacity-60">{memberCount}</span>
        </FilterChip>
        <FilterChip active={filter === 'allies'} onClick={() => setFilter('allies')}>
          {t('admin.accounts.filters.allies')} <span className="ml-1.5 opacity-60">{allyCount}</span>
        </FilterChip>
      </div>

      {/* New-account form */}
      {showForm && (
        <form
          onSubmit={submitNew}
          className="card-elev p-4 sm:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <h2 className="sm:col-span-2 font-display-clean text-base text-gold tracking-wider uppercase">
            {t('admin.accounts.form.heading')}
          </h2>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.accounts.form.usernameLabel')}</span>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('admin.accounts.form.usernamePlaceholder')}
              pattern="[a-z0-9._\-]{2,32}"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
            />
            <span className="text-[10px] text-ink-dim">{t('admin.accounts.form.usernameHint')}</span>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.accounts.form.displayNameLabel')}</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Aliceᴰᴬᴰ"
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
            />
            <span className="text-[10px] text-ink-dim">{t('admin.accounts.form.displayNameHint')}</span>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0 sm:col-span-2">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.accounts.form.passwordLabel')}</span>
            <input
              required
              type="text"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('admin.accounts.form.passwordPlaceholder')}
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream font-mono focus:outline-none focus:border-gold/60 transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.accounts.form.roleLabel')}</span>
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value as AccountRole)}
              className="w-full min-w-0 max-w-full rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
            >
              {allowedRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(r.labelKey)}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-ink-dim leading-snug">
              {t(ROLE_BY_VALUE[role].descriptionKey)}
            </span>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.accounts.form.languageLabel')}</span>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="btn-ghost text-xs"
              disabled={submitting}
            >
              {t('admin.accounts.form.cancel')}
            </button>
            <button type="submit" className="btn-gold disabled:opacity-60" disabled={submitting}>
              <Plus size={16} weight="bold" /> {submitting ? t('admin.accounts.form.creating') : t('admin.accounts.form.create')}
            </button>
          </div>
        </form>
      )}

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
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="px-4 sm:px-5 py-4 animate-pulse">
              <div className="h-3 bg-bg-elev rounded w-40 mb-2" />
              <div className="h-2.5 bg-bg-elev rounded w-24" />
            </li>
          ))
        ) : filtered.length === 0 ? (
          <li className="px-4 sm:px-5 py-10 text-center">
            <UsersThree size={28} weight="duotone" className="mx-auto text-ink-mute mb-2" />
            <div className="text-sm text-ink-paper">{t('admin.accounts.emptyState')}</div>
          </li>
        ) : (
          filtered.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              linkedMember={account.memberId ? memberById.get(account.memberId) ?? null : null}
              busy={busyId === account.id}
              isSelf={account.id === auth.user?.id}
              onResetPassword={handleResetPassword}
              onToggleActive={handleToggleActive}
              onOpenLink={() => setLinkingAccount(account)}
              onUnlink={() => handleLink(account, null)}
            />
          ))
        )}
      </ul>

      {linkingAccount && (
        <LinkPicker
          account={linkingAccount}
          members={members}
          linkedMemberIds={linkedMemberIds}
          onClose={() => setLinkingAccount(null)}
          onPick={(memberId) => handleLink(linkingAccount, memberId)}
        />
      )}
    </div>
  )
}

function AccountRow({
  account,
  linkedMember,
  busy,
  isSelf,
  onResetPassword,
  onToggleActive,
  onOpenLink,
  onUnlink,
}: {
  account: MemberAccount
  linkedMember: Member | null
  busy: boolean
  isSelf: boolean
  onResetPassword: (a: MemberAccount) => void
  onToggleActive: (a: MemberAccount) => void
  onOpenLink: () => void
  onUnlink: () => void
}) {
  const { t } = useTranslation()
  const meta = ROLE_BY_VALUE[account.role]
  const Icon = meta.Icon
  const isAlly = account.role === 'ally'

  return (
    <li
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3.5',
        !account.active && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={cn(
            'h-10 w-10 rounded-lg border flex items-center justify-center shrink-0',
            isAlly
              ? 'border-steel/40 bg-steel/10'
              : 'border-gold/30 bg-gold/8',
          )}
        >
          <Icon size={16} weight="duotone" className={meta.color} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-ink-cream font-medium leading-tight truncate">
              {account.displayName}
              {isSelf && <span className="ml-1.5 text-[10px] text-gold-soft">· {t('admin.accounts.youLabel')}</span>}
            </span>
            {isAlly ? (
              <AllyChip />
            ) : (
              <span
                className={cn(
                  'inline-flex items-center text-[9px] font-bold tracking-[0.20em] uppercase rounded px-1.5 py-0.5 leading-none',
                  account.role === 'r4' || account.role === 'r5'
                    ? 'bg-gold/15 text-gold-glow border border-gold/35'
                    : 'bg-gold/10 text-gold-soft border border-gold/25',
                )}
              >
                {meta.shortLabel}
              </span>
            )}
            {linkedMember && (
              <span
                className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-gold-soft"
                title={t('admin.accounts.rosterTooltip', { nick: linkedMember.nick, rank: linkedMember.rank.toUpperCase() })}
              >
                <LinkSimple size={10} weight="bold" />
                {linkedMember.nick}
              </span>
            )}
          </div>
          <div className="text-[11px] text-ink-mute mt-0.5 truncate">
            @{account.username} · {t('admin.accounts.lastLogin', { when: formatRelativeFromNow(account.lastLoginAt, t) })} ·{' '}
            {account.languageCode.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 shrink-0 self-end sm:self-auto">
        {!isAlly && (
          linkedMember ? (
            <button
              onClick={onUnlink}
              disabled={busy}
              className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60"
              title={t('admin.accounts.unlinkTitle')}
            >
              <LinkBreak size={12} weight="duotone" /> {t('admin.accounts.unlink')}
            </button>
          ) : (
            <button
              onClick={onOpenLink}
              disabled={busy}
              className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60"
              title={t('admin.accounts.linkTitle')}
            >
              <LinkSimple size={12} weight="duotone" /> {t('admin.accounts.link')}
            </button>
          )
        )}
        <button
          onClick={() => onResetPassword(account)}
          disabled={busy}
          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60"
          title={t('admin.accounts.resetTitle')}
        >
          <Key size={12} weight="duotone" /> {t('admin.accounts.reset')}
        </button>
        <button
          onClick={() => onToggleActive(account)}
          disabled={busy || isSelf}
          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60"
          title={account.active ? t('admin.accounts.deactivateTitle') : t('admin.accounts.reactivateTitle')}
        >
          {account.active ? (
            <>
              <Power size={12} weight="duotone" /> {t('admin.accounts.off')}
            </>
          ) : (
            <>
              <ArrowCounterClockwise size={12} weight="bold" /> {t('admin.accounts.on')}
            </>
          )}
        </button>
      </div>
    </li>
  )
}

/**
 * Modal-ish overlay to pick a roster member to link this account to.
 * Hides members already taken by another account. Search by nick.
 */
function LinkPicker({
  account,
  members,
  linkedMemberIds,
  onClose,
  onPick,
}: {
  account: MemberAccount
  members: Member[]
  linkedMemberIds: Set<string>
  onClose: () => void
  onPick: (memberId: string) => void
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members
      .filter((m) => !linkedMemberIds.has(m.id) || m.id === account.memberId)
      .filter((m) => (q ? m.nick.toLowerCase().includes(q) : true))
  }, [members, linkedMemberIds, query, account.memberId])

  return (
    <>
      <div
        className="fixed inset-0 bg-bg-deep/80 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px]
                   z-50 card-elev rounded-t-2xl sm:rounded-l-2xl sm:rounded-t-none
                   max-h-[88dvh] sm:max-h-full overflow-hidden
                   flex flex-col"
      >
        <header className="flex items-center justify-between gap-3 p-5 border-b border-gold/15">
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.accounts.linkPicker.heading')}</div>
            <h2 className="font-display-clean text-sm text-ink-cream tracking-wider truncate">
              {account.displayName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost !min-h-[32px] !p-2"
            aria-label={t('admin.accounts.linkPicker.close')}
          >
            <X size={14} weight="bold" />
          </button>
        </header>

        <label className="relative m-4 mb-0 block">
          <MagnifyingGlass
            size={14}
            weight="duotone"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.accounts.linkPicker.searchPlaceholder')}
            className="w-full rounded-lg bg-bg-deep pl-9 pr-3 py-2 text-sm text-ink-cream placeholder:text-ink-mute border border-gold/15 focus:outline-none focus:border-gold/45 transition-colors"
          />
        </label>

        <ul className="flex-1 overflow-y-auto divide-y divide-gold/10 mt-3">
          {available.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-ink-mute">
              {query.trim()
                ? t('admin.accounts.linkPicker.noMatch', { query })
                : t('admin.accounts.linkPicker.allLinked')}
            </li>
          ) : (
            available.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => onPick(m.id)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gold/5 transition-colors text-left"
                >
                  <span className="text-sm text-ink-cream truncate flex-1">{m.nick}</span>
                  <span className="text-[10px] tracking-widest uppercase text-gold-soft shrink-0">
                    {m.rank.toUpperCase()}
                  </span>
                  <span className="text-[10px] tracking-widest uppercase text-ink-mute shrink-0">
                    {m.tgLevel ? `TG${m.tgLevel}` : m.townCenterLevel ? t('admin.accounts.lvlShort', { level: m.townCenterLevel }) : '—'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
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
