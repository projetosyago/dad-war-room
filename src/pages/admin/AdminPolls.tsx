import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  ArrowCounterClockwise,
  Archive,
  Check,
  Clock,
  Copy,
  EyeSlash,
  ListChecks,
  LockSimple,
  PaperPlaneTilt,
  Plus,
  RadioButton,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { usePolls } from '../../hooks/usePolls'
import {
  archivePoll,
  closePollNow,
  createPoll,
  deletePoll,
  isPollOpen,
  publishPoll,
  reopenPoll,
  unarchivePoll,
} from '../../repositories/polls'
import type { Poll, PollStatus, ResultsVisibility } from '../../types/domain'
import { cn } from '../../lib/cn'

const MIN_OPTIONS = 2
const MAX_OPTIONS = 12

// ── Form schema ──────────────────────────────────────────────────
const pollFormSchema = z
  .object({
    title: z.string().trim().min(1, { message: 'required' }).max(140),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    type: z.enum(['single', 'multi']),
    status: z.enum(['draft', 'open']),
    opensAt: z.string().optional().or(z.literal('')),
    closesAt: z.string().optional().or(z.literal('')),
    resultsVisibility: z.enum(['during', 'after_close', 'admin_only']),
    options: z
      .array(z.object({ label: z.string() }))
      .min(MIN_OPTIONS)
      .max(MAX_OPTIONS),
  })
  .superRefine((data, ctx) => {
    const trimmed = data.options.map((o) => o.label.trim()).filter(Boolean)
    if (trimmed.length < MIN_OPTIONS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'minOptions',
      })
    }
    if (new Set(trimmed.map((o) => o.toLowerCase())).size !== trimmed.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'duplicates',
      })
    }
  })

type PollFormValues = z.infer<typeof pollFormSchema>

const DEFAULT_FORM_VALUES: PollFormValues = {
  title: '',
  description: '',
  type: 'single',
  status: 'open',
  opensAt: '',
  closesAt: '',
  resultsVisibility: 'during',
  options: [{ label: '' }, { label: '' }],
}

type StatusFilter = 'all' | 'open' | 'closed' | 'draft' | 'archived'

const STATUS_TINTS: Record<PollStatus, { labelKey: string; cls: string }> = {
  draft:    { labelKey: 'admin.polls.statusTints.draft',    cls: 'bg-ink-mute/15 text-ink-paper border-ink-mute/30' },
  open:     { labelKey: 'admin.polls.statusTints.open',     cls: 'bg-gold/15 text-gold-glow border-gold/40' },
  closed:   { labelKey: 'admin.polls.statusTints.closed',   cls: 'bg-bg-elev text-ink-mute border-ink-dim/40' },
  archived: { labelKey: 'admin.polls.statusTints.archived', cls: 'bg-steel/10 text-steel-soft border-steel/30' },
}

const VISIBILITY_LABELS: Record<ResultsVisibility, { labelKey: string; hintKey: string }> = {
  during:      { labelKey: 'admin.polls.visibility.during.label',     hintKey: 'admin.polls.visibility.during.hint' },
  after_close: { labelKey: 'admin.polls.visibility.afterClose.label', hintKey: 'admin.polls.visibility.afterClose.hint' },
  admin_only:  { labelKey: 'admin.polls.visibility.adminOnly.label',  hintKey: 'admin.polls.visibility.adminOnly.hint' },
}

export function AdminPolls() {
  const { t } = useTranslation()
  const { polls, loading, error: loadError, refetch } = usePolls({ includeDrafts: true, includeArchived: true })
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── New-poll form (react-hook-form + zod) ────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    mode: 'onTouched',
    defaultValues: DEFAULT_FORM_VALUES,
  })
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: 'options',
  })
  const watchedType = watch('type')

  const filtered = polls.filter((p) => (filter === 'all' ? true : p.status === filter))
  const counts: Record<StatusFilter, number> = {
    all: polls.length,
    open: polls.filter((p) => p.status === 'open').length,
    closed: polls.filter((p) => p.status === 'closed').length,
    draft: polls.filter((p) => p.status === 'draft').length,
    archived: polls.filter((p) => p.status === 'archived').length,
  }

  function resetForm() {
    reset(DEFAULT_FORM_VALUES)
  }

  /** Map zod error-message codes to localised strings. */
  function optionsErrorMessage(): string | null {
    const msg = errors.options?.message ?? errors.options?.root?.message
    if (!msg) return null
    if (msg === 'minOptions') return t('admin.polls.errors.minOptions', { min: MIN_OPTIONS })
    if (msg === 'duplicates') return t('admin.polls.errors.duplicates')
    return msg
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null); setFeedback(null)
    const trimmed = values.options.map((o) => o.label.trim()).filter(Boolean)
    try {
      const created = await createPoll({
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        type: values.type,
        status: values.status,
        opensAt: values.opensAt ? new Date(values.opensAt).toISOString() : null,
        closesAt: values.closesAt ? new Date(values.closesAt).toISOString() : null,
        resultsVisibility: values.resultsVisibility,
        options: trimmed.map((label) => ({ label })),
      })
      setFeedback(t('admin.polls.feedback.created', { title: created.title, status: created.status }))
      resetForm()
      setShowForm(false)
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.polls.errors.failedToCreate'))
    }
  })

  async function runAction(pollId: string, label: string, fn: () => Promise<void>) {
    setBusyId(pollId); setError(null); setFeedback(null)
    try {
      await fn()
      setFeedback(label)
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.polls.errors.actionFailed'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleCopyLink(token: string, id: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${token}`)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError(t('admin.polls.errors.clipboardBlocked'))
    }
  }

  return (
    <div className="container-wide pt-6 sm:pt-12 pb-28 sm:pb-12">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4">
        <ArrowLeft size={14} weight="bold" /> {t('admin.polls.backToAdmin')}
      </Link>

      <header className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center shrink-0">
            <ListChecks size={18} weight="duotone" className="text-gold-soft" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.polls.eyebrow')}</div>
            <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
              {t('admin.polls.title')}
            </h1>
          </div>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-gold self-start sm:self-auto" aria-expanded={showForm}>
          <Plus size={16} weight="bold" /> {showForm ? t('admin.polls.closeForm') : t('admin.polls.newPoll')}
        </button>
      </header>

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(['all', 'open', 'closed', 'draft', 'archived'] as StatusFilter[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              'inline-flex items-center text-[11px] tracking-widest uppercase rounded-full px-3 py-1.5 border transition-colors',
              filter === k
                ? 'bg-gold/15 text-gold-glow border-gold/45'
                : 'bg-bg-card text-ink-mute border-gold/15 hover:border-gold/35 hover:text-ink-cream',
            )}
          >
            {t(`admin.polls.filters.${k}`)}
            <span className="ml-1.5 opacity-60">{counts[k]}</span>
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card-elev p-4 sm:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <h2 className="sm:col-span-2 font-display-clean text-base text-gold tracking-wider uppercase">{t('admin.polls.form.heading')}</h2>

          <label className="flex flex-col gap-1.5 sm:col-span-2 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.polls.form.titleLabel')}</span>
            <input
              {...register('title')}
              placeholder={t('admin.polls.form.titlePlaceholder')} maxLength={140}
              aria-invalid={errors.title ? 'true' : undefined}
              className={cn(
                'w-full min-w-0 rounded-xl bg-bg-card border px-3 py-2.5 text-sm text-ink-cream focus:outline-none transition-colors',
                errors.title ? 'border-danger/60 focus:border-danger' : 'border-gold/20 focus:border-gold/60',
              )}
            />
            {errors.title && (
              <span className="text-[11px] text-danger">{t('admin.polls.form.titleLabel')}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">
              {t('admin.polls.form.descriptionLabel')} <span className="text-ink-dim normal-case tracking-normal">{t('admin.polls.form.descriptionHint')}</span>
            </span>
            <textarea
              rows={3}
              {...register('description')}
              placeholder={t('admin.polls.form.descriptionPlaceholder')}
              aria-invalid={errors.description ? 'true' : undefined}
              className={cn(
                'w-full min-w-0 rounded-xl bg-bg-card border px-3 py-2.5 text-sm text-ink-cream font-mono leading-snug focus:outline-none transition-colors',
                errors.description ? 'border-danger/60 focus:border-danger' : 'border-gold/20 focus:border-gold/60',
              )}
            />
            {errors.description?.message && (
              <span className="text-[11px] text-danger">{errors.description.message}</span>
            )}
          </label>

          <fieldset className="flex flex-col gap-1.5 min-w-0">
            <legend className="text-[11px] tracking-widest uppercase text-ink-mute mb-1">{t('admin.polls.form.typeLabel')}</legend>
            <div className="flex gap-2">
              <TypePick active={watchedType === 'single'} onClick={() => setValue('type', 'single', { shouldDirty: true })} Icon={RadioButton} label={t('admin.polls.form.typeSingle')} hint={t('admin.polls.form.typeSingleHint')} />
              <TypePick active={watchedType === 'multi'}  onClick={() => setValue('type', 'multi',  { shouldDirty: true })} Icon={ListChecks}  label={t('admin.polls.form.typeMulti')}  hint={t('admin.polls.form.typeMultiHint')} />
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.polls.form.initialStatusLabel')}</span>
            <select
              {...register('status')}
              className="w-full min-w-0 max-w-full rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
            >
              <option value="open">{t('admin.polls.form.statusOpenOption')}</option>
              <option value="draft">{t('admin.polls.form.statusDraftOption')}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">
              {t('admin.polls.form.opensAtLabel')} <span className="text-ink-dim normal-case tracking-normal">{t('admin.polls.form.opensAtHint')}</span>
            </span>
            <input
              type="datetime-local"
              {...register('opensAt')}
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream font-mono focus:outline-none focus:border-gold/60 transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">
              {t('admin.polls.form.closesAtLabel')} <span className="text-ink-dim normal-case tracking-normal">{t('admin.polls.form.closesAtHint')}</span>
            </span>
            <input
              type="datetime-local"
              {...register('closesAt')}
              className="w-full min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream font-mono focus:outline-none focus:border-gold/60 transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1.5 min-w-0 sm:col-span-2">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.polls.form.resultsVisibilityLabel')}</span>
            <select
              {...register('resultsVisibility')}
              className="w-full min-w-0 max-w-full rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
            >
              {Object.entries(VISIBILITY_LABELS).map(([key, info]) => (
                <option key={key} value={key}>{t(info.labelKey)} — {t(info.hintKey)}</option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            <div className="text-[11px] tracking-widest uppercase text-ink-mute mb-2">
              {t('admin.polls.form.optionsLabel')}
              <span className="text-ink-dim normal-case tracking-normal ml-1.5">— {MIN_OPTIONS}–{MAX_OPTIONS}</span>
            </div>
            <div className="flex flex-col gap-2">
              {optionFields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2">
                  <span className="text-[10px] tracking-widest uppercase text-ink-mute w-6 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <input
                    {...register(`options.${i}.label` as const)}
                    placeholder={t('admin.polls.form.optionPlaceholder', { n: i + 1 })} maxLength={80}
                    className="flex-1 min-w-0 rounded-xl bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:outline-none focus:border-gold/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={optionFields.length <= MIN_OPTIONS}
                    className="btn-ghost !min-h-[36px] !p-2 disabled:opacity-30"
                    aria-label={t('admin.polls.form.removeOption')}
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ))}
              {optionsErrorMessage() && (
                <span className="text-[11px] text-danger">{optionsErrorMessage()}</span>
              )}
              {optionFields.length < MAX_OPTIONS && (
                <button type="button" onClick={() => appendOption({ label: '' })} className="btn-ghost text-xs self-start">
                  <Plus size={12} weight="bold" /> {t('admin.polls.form.addOption')}
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => { resetForm(); setShowForm(false) }} className="btn-ghost text-xs" disabled={isSubmitting}>
              {t('admin.polls.form.cancel')}
            </button>
            <button type="submit" className="btn-gold disabled:opacity-60" disabled={isSubmitting}>
              <Plus size={16} weight="bold" /> {isSubmitting ? t('admin.polls.form.creating') : t('admin.polls.form.create')}
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
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="px-4 sm:px-5 py-3.5 animate-pulse">
                <div className="h-3 bg-bg-elev rounded w-40 mb-2" />
                <div className="h-2.5 bg-bg-elev rounded w-24" />
              </li>
            ))
          : filtered.length === 0
            ? (
                <li className="px-4 sm:px-5 py-10 text-center">
                  <ListChecks size={28} weight="duotone" className="mx-auto text-ink-mute mb-2" />
                  <div className="text-sm text-ink-paper">
                    {filter === 'all' ? t('admin.polls.emptyAll') : t('admin.polls.emptyFiltered', { filter: t(`admin.polls.filters.${filter}`) })}
                  </div>
                </li>
              )
            : filtered.map((poll) => (
                <PollAdminRow
                  key={poll.id}
                  poll={poll}
                  busy={busyId === poll.id}
                  copied={copiedId === poll.id}
                  onCopyLink={() => handleCopyLink(poll.shareToken, poll.id)}
                  onPublish={() => runAction(poll.id, t('admin.polls.feedback.published', { title: poll.title }), () => publishPoll(poll.id))}
                  onClose={() => runAction(poll.id, t('admin.polls.feedback.closed', { title: poll.title }), () => closePollNow(poll.id))}
                  onReopen={() => runAction(poll.id, t('admin.polls.feedback.reopened', { title: poll.title }), () => reopenPoll(poll.id))}
                  onArchive={() => runAction(poll.id, t('admin.polls.feedback.archived', { title: poll.title }), () => archivePoll(poll.id))}
                  onUnarchive={() => runAction(poll.id, t('admin.polls.feedback.restored', { title: poll.title }), () => unarchivePoll(poll.id, 'closed'))}
                  onDelete={() => {
                    if (!window.confirm(t('admin.polls.confirmDelete', { title: poll.title }))) return
                    runAction(poll.id, t('admin.polls.feedback.deleted', { title: poll.title }), () => deletePoll(poll.id))
                  }}
                />
              ))}
      </ul>
    </div>
  )
}

function PollAdminRow({
  poll, busy, copied,
  onCopyLink, onPublish, onClose, onReopen, onArchive, onUnarchive, onDelete,
}: {
  poll: Poll
  busy: boolean
  copied: boolean
  onCopyLink: () => void
  onPublish: () => void
  onClose: () => void
  onReopen: () => void
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const open = isPollOpen(poll)
  const tint = STATUS_TINTS[poll.status]
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3.5">
      <span className={cn(
        'h-9 w-9 rounded-lg border flex items-center justify-center shrink-0',
        open ? 'border-gold/30 bg-gold/8' : 'border-ink-dim/40 bg-bg-elev/50',
      )}>
        {poll.type === 'single'
          ? <RadioButton size={14} weight="duotone" className={open ? 'text-gold-soft' : 'text-ink-mute'} />
          : <ListChecks size={14} weight="duotone" className={open ? 'text-gold-soft' : 'text-ink-mute'} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/alliance/polls/${poll.slug}`} className="text-sm text-ink-cream font-medium leading-tight truncate hover:text-gold-soft transition-colors">
            {poll.title}
          </Link>
          <span className={cn('text-[9px] font-bold tracking-[0.20em] uppercase rounded px-1.5 py-0.5 leading-none border', tint.cls)}>
            {t(tint.labelKey)}
          </span>
          {poll.resultsVisibility !== 'during' && (
            <span className="inline-flex items-center gap-1 text-[9px] tracking-widest uppercase text-ink-mute">
              <EyeSlash size={10} weight="duotone" /> {poll.resultsVisibility === 'admin_only' ? t('admin.polls.visibilityShort.adminOnly') : t('admin.polls.visibilityShort.afterClose')}
            </span>
          )}
        </div>
        <div className="text-[11px] text-ink-mute mt-0.5 flex flex-wrap gap-2">
          <span className="font-mono text-gold-soft">/p/{poll.shareToken}</span>
          <span>· /{poll.slug}</span>
          {open ? (
            <span className="inline-flex items-center gap-1 text-gold-soft">
              <Clock size={10} weight="duotone" />
              {poll.closesAt ? t('admin.polls.row.closesAt', { date: new Date(poll.closesAt).toLocaleString() }) : t('admin.polls.row.openIndefinitely')}
            </span>
          ) : poll.closedAt ? (
            <span className="inline-flex items-center gap-1 text-ink-mute">
              <LockSimple size={10} weight="duotone" /> {t('admin.polls.row.closedAt', { date: new Date(poll.closedAt).toLocaleString() })}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 shrink-0 self-end sm:self-auto">
        <button onClick={onCopyLink} className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5" title={t('admin.polls.actions.copyLinkTitle')}>
          <Copy size={12} weight="duotone" /> {copied ? t('admin.polls.actions.copied') : t('admin.polls.actions.link')}
        </button>
        {poll.status === 'draft' && (
          <button onClick={onPublish} disabled={busy} className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60" title={t('admin.polls.actions.publishTitle')}>
            <PaperPlaneTilt size={12} weight="duotone" /> {t('admin.polls.actions.publish')}
          </button>
        )}
        {poll.status === 'open' && (
          <button onClick={onClose} disabled={busy} className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60" title={t('admin.polls.actions.closeTitle')}>
            <LockSimple size={12} weight="duotone" /> {t('admin.polls.actions.close')}
          </button>
        )}
        {poll.status === 'closed' && (
          <>
            <button onClick={onReopen} disabled={busy} className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60" title={t('admin.polls.actions.reopenTitle')}>
              <ArrowCounterClockwise size={12} weight="bold" /> {t('admin.polls.actions.reopen')}
            </button>
            <button onClick={onArchive} disabled={busy} className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60" title={t('admin.polls.actions.archiveTitle')}>
              <Archive size={12} weight="duotone" /> {t('admin.polls.actions.archive')}
            </button>
          </>
        )}
        {poll.status === 'archived' && (
          <button onClick={onUnarchive} disabled={busy} className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60" title={t('admin.polls.actions.unarchiveTitle')}>
            <ArrowCounterClockwise size={12} weight="bold" /> {t('admin.polls.actions.restore')}
          </button>
        )}
        <button onClick={onDelete} disabled={busy} className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60" title={t('admin.polls.actions.deleteTitle')}>
          <Trash size={12} weight="duotone" />
        </button>
      </div>
    </li>
  )
}

function TypePick({
  active, onClick, Icon, label, hint,
}: {
  active: boolean
  onClick: () => void
  Icon: typeof RadioButton
  label: string
  hint: string
}) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        'flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-colors text-left',
        active ? 'bg-gold/15 border-gold/55 text-ink-cream' : 'bg-bg-card border-gold/15 text-ink-mute hover:border-gold/35',
      )}
    >
      <Icon size={16} weight="duotone" className={active ? 'text-gold-soft' : 'text-ink-mute'} />
      <span className="flex flex-col leading-tight">
        <span className="text-[12px] font-semibold uppercase tracking-widest">{label}</span>
        <span className="text-[10px] text-ink-mute normal-case tracking-normal">{hint}</span>
      </span>
    </button>
  )
}
