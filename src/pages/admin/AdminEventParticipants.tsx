import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  ArrowLeft,
  UsersThree,
  Plus,
  Trash,
  Check,
  X,
  WarningCircle,
  PencilSimple,
  CrownSimple,
  UserCircle,
  Moon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabase'
import { useMembers } from '../../hooks/useMembers'
import { useEventParticipants } from '../../hooks/useEventParticipants'
import {
  addParticipant,
  removeParticipant,
  updateParticipant,
} from '../../repositories/eventParticipants'
import { formatPower } from '../../data/roster'
import type { ParticipationRole } from '../../types/domain'

interface OccurrenceHeader {
  startsAtUtc: string
  phaseLabel: string | null
  durationMinutes: number
  eventName: string
  eventShortName: string | null
  eventAccent: string | null
}

const ROLE_OPTIONS: { value: ParticipationRole; labelKey: string }[] = [
  { value: 'leader', labelKey: 'admin.eventParticipants.roles.leader' },
  { value: 'joiner', labelKey: 'admin.eventParticipants.roles.joiner' },
  { value: 'standby', labelKey: 'admin.eventParticipants.roles.standby' },
]

function RoleBadge({ role }: { role: ParticipationRole | null }) {
  const { t } = useTranslation()
  if (role === 'leader') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft">
        <CrownSimple size={11} weight="fill" /> {t('admin.eventParticipants.roles.leader')}
      </span>
    )
  }
  if (role === 'joiner') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-widest uppercase bg-cyan-400/12 border border-cyan-400/35 text-cyan-200">
        <UserCircle size={11} weight="duotone" /> {t('admin.eventParticipants.roles.joiner')}
      </span>
    )
  }
  if (role === 'standby') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-widest uppercase bg-ink-mute/15 border border-ink-mute/40 text-ink-mute">
        <Moon size={11} weight="duotone" /> {t('admin.eventParticipants.roles.standby')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-widest uppercase bg-ink-mute/10 border border-ink-mute/25 text-ink-mute">
      {t('admin.eventParticipants.roles.unset')}
    </span>
  )
}

/**
 * Admin · per-occurrence squad editor. Manages rows in event_participants
 * — add a member with role + notes, edit notes/role inline, remove with a
 * two-step crimson confirm. Read-only to everyone except admins (RLS).
 */
export function AdminEventParticipants() {
  const { t } = useTranslation()
  const { id: occurrenceId } = useParams<{ id: string }>()

  const [header, setHeader] = useState<OccurrenceHeader | null>(null)
  const [headerLoading, setHeaderLoading] = useState(true)
  const [headerError, setHeaderError] = useState<string | null>(null)

  const { items, loading: listLoading, error: listError, refetch } = useEventParticipants(occurrenceId)
  const { members, loading: membersLoading } = useMembers()

  // Add-form draft
  const [draftMemberId, setDraftMemberId] = useState<string>('')
  const [draftRole, setDraftRole] = useState<ParticipationRole>('joiner')
  const [draftNotes, setDraftNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Inline edit state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<ParticipationRole | null>(null)
  const [editNotes, setEditNotes] = useState<string>('')

  // Two-step delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Fetch occurrence + event in one shot so the header is informative.
  useEffect(() => {
    if (!occurrenceId) return
    let alive = true
    ;(async () => {
      try {
        setHeaderLoading(true)
        setHeaderError(null)
        const { data, error: e } = await supabase
          .from('event_occurrences')
          .select(
            'starts_at_utc, phase_label, duration_minutes, event:events(name, short_name, accent_color)',
          )
          .eq('id', occurrenceId)
          .maybeSingle()
        if (e) throw e
        if (!data) {
          if (alive) setHeaderError(t('admin.eventParticipants.errors.notFound'))
          return
        }
        type Row = {
          starts_at_utc: string
          phase_label: string | null
          duration_minutes: number
          event: { name: string; short_name: string | null; accent_color: string | null } | null
        }
        const row = data as unknown as Row
        if (!alive) return
        setHeader({
          startsAtUtc: row.starts_at_utc,
          phaseLabel: row.phase_label,
          durationMinutes: row.duration_minutes,
          eventName: row.event?.name ?? t('admin.eventParticipants.eventFallback'),
          eventShortName: row.event?.short_name ?? null,
          eventAccent: row.event?.accent_color ?? null,
        })
      } catch (err) {
        if (alive) setHeaderError(err instanceof Error ? err.message : t('admin.eventParticipants.errors.failedToLoad'))
      } finally {
        if (alive) setHeaderLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [occurrenceId])

  // Auto-dismiss flash messages so the form stays clean.
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 2200)
    return () => clearTimeout(timer)
  }, [feedback])

  const assignedIds = useMemo(() => new Set(items.map((i) => i.memberId)), [items])
  const availableMembers = useMemo(
    () => members.filter((m) => !assignedIds.has(m.id)),
    [members, assignedIds],
  )

  // Default the dropdown to the first available member whenever the assigned
  // set changes. Derived-from-state pattern — needs TanStack migration or a
  // reducer to fold into render. Keeping as-is for now.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!draftMemberId && availableMembers.length > 0) {
      setDraftMemberId(availableMembers[0].id)
    }
    if (draftMemberId && assignedIds.has(draftMemberId)) {
      setDraftMemberId(availableMembers[0]?.id ?? '')
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [availableMembers, assignedIds, draftMemberId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!occurrenceId || !draftMemberId || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await addParticipant({
        occurrenceId,
        memberId: draftMemberId,
        role: draftRole,
        notes: draftNotes.trim() === '' ? null : draftNotes.trim(),
      })
      setDraftNotes('')
      setFeedback(t('admin.eventParticipants.feedback.added'))
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.eventParticipants.errors.failedToAdd'))
    } finally {
      setSubmitting(false)
    }
  }

  const beginEdit = (memberId: string, role: ParticipationRole | null, notes: string | null) => {
    setEditingMemberId(memberId)
    setEditRole(role)
    setEditNotes(notes ?? '')
    setError(null)
  }

  const cancelEdit = () => {
    setEditingMemberId(null)
    setEditRole(null)
    setEditNotes('')
  }

  const saveEdit = async (memberId: string) => {
    if (!occurrenceId || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await updateParticipant(occurrenceId, memberId, {
        role: editRole,
        notes: editNotes.trim() === '' ? null : editNotes.trim(),
      })
      cancelEdit()
      setFeedback(t('admin.eventParticipants.feedback.updated'))
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.eventParticipants.errors.failedToUpdate'))
    } finally {
      setSubmitting(false)
    }
  }

  const doRemove = async (memberId: string) => {
    if (!occurrenceId || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await removeParticipant(occurrenceId, memberId)
      setConfirmDelete(null)
      if (editingMemberId === memberId) cancelEdit()
      setFeedback(t('admin.eventParticipants.feedback.removed'))
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.eventParticipants.errors.failedToRemove'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-wide py-8 sm:py-12">
      <Link
        to="/admin/events/occurrences"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" /> {t('admin.eventParticipants.backToOccurrences')}
      </Link>

      {/* Header card */}
      <section className="card-hero p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-3">
          <span
            className="h-11 w-11 rounded-lg flex items-center justify-center border bg-bg-card/80 shrink-0"
            style={{
              borderColor: `${header?.eventAccent ?? '#ffdb8a'}55`,
              boxShadow: `0 0 12px -4px ${header?.eventAccent ?? '#ffdb8a'}55`,
            }}
          >
            <UsersThree size={20} weight="duotone" className="text-gold-soft" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="eyebrow">{t('admin.eventParticipants.eyebrow')}</div>
            {headerLoading ? (
              <div className="h-7 w-64 mt-1 rounded animate-pulse bg-gold/10" />
            ) : header ? (
              <>
                <h1 className="hero-title text-lg sm:text-xl mt-1">
                  {header.eventShortName ?? header.eventName}
                  {header.phaseLabel && (
                    <span className="ml-2 text-[10px] tracking-widest uppercase text-gold-soft">
                      · {header.phaseLabel}
                    </span>
                  )}
                </h1>
                <div className="text-[11px] text-ink-mute mt-1 tabular-nums">
                  {format(new Date(header.startsAtUtc), "EEE d MMM yyyy · HH:mm 'UTC'")}
                  <span className="ml-2">· {t('admin.eventParticipants.durationMin', { count: header.durationMinutes })}</span>
                </div>
              </>
            ) : headerError ? (
              <h1 className="hero-title text-lg sm:text-xl mt-1 text-danger">{headerError}</h1>
            ) : null}
          </div>
        </div>
      </section>

      {/* Add form */}
      <form onSubmit={handleAdd} className="card-hero p-5 sm:p-6 mb-6 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center gap-2 mb-1">
          <Plus size={14} weight="bold" className="text-gold-soft" />
          <h2 className="font-display-clean text-base text-gold tracking-wider uppercase">
            {t('admin.eventParticipants.addHeading')}
          </h2>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.eventParticipants.memberLabel')}</span>
          <select
            value={draftMemberId}
            onChange={(e) => setDraftMemberId(e.target.value)}
            disabled={membersLoading || availableMembers.length === 0}
            className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:border-gold/45 outline-none"
          >
            {availableMembers.length === 0 ? (
              <option value="">{t('admin.eventParticipants.allAssigned')}</option>
            ) : (
              availableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nick} · {m.rank.toUpperCase()} · {formatPower(m.powerM)}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.eventParticipants.roleLabel')}</span>
          <select
            value={draftRole}
            onChange={(e) => setDraftRole(e.target.value as ParticipationRole)}
            className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:border-gold/45 outline-none"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {t(r.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.eventParticipants.notesLabel')}</span>
          <textarea
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            rows={2}
            placeholder={t('admin.eventParticipants.notesPlaceholder')}
            className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>

        {error && (
          <div className="sm:col-span-2 callout-warn flex items-start gap-2 text-sm">
            <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {feedback && (
          <div className="sm:col-span-2 callout-gold flex items-start gap-2 text-sm">
            <Check size={14} weight="bold" className="text-gold shrink-0 mt-0.5" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !draftMemberId || availableMembers.length === 0}
            className="btn-gold disabled:opacity-60"
          >
            <Plus size={14} weight="bold" />
            {submitting ? t('admin.eventParticipants.adding') : t('admin.eventParticipants.addButton')}
          </button>
        </div>
      </form>

      {/* Participants list */}
      <h2 className="font-display-clean text-base text-gold tracking-wider uppercase mb-3">
        {t('admin.eventParticipants.assignedHeading', { count: items.length })}
      </h2>

      {listError && (
        <div className="callout-warn mb-4 text-sm flex items-start gap-2">
          <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span>{listError.message}</span>
        </div>
      )}

      {listLoading ? (
        <ul className="card divide-y divide-gold/12 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="px-4 sm:px-5 py-3 animate-pulse">
              <div className="h-4 w-1/3 bg-gold/10 rounded mb-2" />
              <div className="h-3 w-1/2 bg-gold/5 rounded" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="card p-6 text-sm text-ink-mute text-center">
          {t('admin.eventParticipants.emptyState')}
        </div>
      ) : (
        <ul className="card divide-y divide-gold/15 overflow-hidden">
          {items.map((p) => {
            const isEditing = editingMemberId === p.memberId
            const isConfirming = confirmDelete === p.memberId
            return (
              <li key={p.memberId} className="px-4 sm:px-5 py-3 hover:bg-gold/[0.04]">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-ink-cream font-medium truncate">
                        {p.member.nick}
                      </span>
                      <span className="text-[10px] tracking-widest uppercase text-gold-soft border border-gold/30 rounded px-1.5 py-0.5">
                        {p.member.rank.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-ink-mute tabular-nums">
                        {formatPower(p.member.powerM)}
                        {p.member.tgLevel != null && (
                          <span className="ml-1.5 text-gold-soft">TG{p.member.tgLevel}</span>
                        )}
                      </span>
                      {p.member.status !== 'active' && (
                        <span className="text-[10px] tracking-widest uppercase text-ink-mute border border-ink-mute/30 rounded px-1.5 py-0.5">
                          {p.member.status === 'temporary_out' ? t('admin.eventParticipants.statusTempOut') : t('admin.eventParticipants.statusLeft')}
                        </span>
                      )}
                      <span className="ml-auto"><RoleBadge role={p.role} /></span>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]">
                        <select
                          value={editRole ?? ''}
                          onChange={(e) =>
                            setEditRole(
                              e.target.value === '' ? null : (e.target.value as ParticipationRole),
                            )
                          }
                          className="rounded-lg bg-bg-card border border-gold/20 px-2.5 py-2 text-xs text-ink-cream focus:border-gold/45 outline-none"
                        >
                          <option value="">{t('admin.eventParticipants.roles.unsetOption')}</option>
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {t(r.labelKey)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder={t('admin.eventParticipants.notesInputPlaceholder')}
                          className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-xs text-ink-cream focus:border-gold/45 outline-none"
                        />
                        <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-1 text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
                          >
                            <X size={11} weight="bold" /> {t('admin.eventParticipants.cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(p.memberId)}
                            disabled={submitting}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25 disabled:opacity-50"
                          >
                            <Check size={12} weight="bold" /> {t('admin.eventParticipants.save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      p.notes && (
                        <p className="text-[12px] text-ink-mute mt-1 leading-snug">{p.notes}</p>
                      )
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => beginEdit(p.memberId, p.role, p.notes)}
                        className="text-ink-mute hover:text-gold p-2"
                        aria-label={t('admin.eventParticipants.editAria', { nick: p.member.nick })}
                      >
                        <PencilSimple size={15} weight="duotone" />
                      </button>
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => doRemove(p.memberId)}
                            disabled={submitting}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold tracking-widest uppercase bg-danger/15 border border-danger/40 text-danger hover:bg-danger/25 disabled:opacity-50"
                          >
                            <Trash size={11} weight="duotone" /> {t('admin.eventParticipants.confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="text-ink-mute hover:text-ink-cream p-1.5"
                            aria-label={t('admin.eventParticipants.cancelDelete')}
                          >
                            <X size={13} weight="bold" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(p.memberId)}
                          className="text-ink-mute hover:text-danger p-2"
                          aria-label={t('admin.eventParticipants.removeAria', { nick: p.member.nick })}
                        >
                          <Trash size={15} weight="duotone" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
