import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Crown,
  Check,
  WarningCircle,
  X,
  ArrowSquareOut,
  Plus,
  Trash,
} from '@phosphor-icons/react'
import { useAllMilestones } from '../../hooks/useMilestones'
import {
  createMilestone,
  deleteMilestone,
  updateMilestone,
} from '../../repositories/milestones'
import { RichTextEditor } from '../../components/admin/RichTextEditor'
import { IconPicker } from '../../components/admin/IconPicker'
import { resolveMilestoneIcon } from '../../lib/milestoneIcon'
import type { MilestoneCategory } from '../../types/domain'
import { cn } from '../../lib/cn'

const CATEGORY_OPTIONS: { value: MilestoneCategory; labelKey: string }[] = [
  { value: 'truegold', labelKey: 'admin.milestones.categories.truegold' },
  { value: 'heroes', labelKey: 'admin.milestones.categories.heroes' },
  { value: 'pets', labelKey: 'admin.milestones.categories.pets' },
  { value: 'pvp', labelKey: 'admin.milestones.categories.pvp' },
  { value: 'feature', labelKey: 'admin.milestones.categories.feature' },
  { value: 'master', labelKey: 'admin.milestones.categories.master' },
  { value: 'fog', labelKey: 'admin.milestones.categories.fog' },
  { value: 'war-academy', labelKey: 'admin.milestones.categories.warAcademy' },
  { value: 'other', labelKey: 'admin.milestones.categories.other' },
]

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function AdminMilestones() {
  const { t } = useTranslation()
  const { milestones, loading, error: loadError, refetch } = useAllMilestones()
  const [editing, setEditing] = useState<string | null>(null)
  const [nameValue, setNameValue] = useState<string>('')
  const [notesValue, setNotesValue] = useState<string>('')
  const [dateValue, setDateValue] = useState<string>('')
  const [achievedValue, setAchievedValue] = useState<boolean>(false)
  const [bodyHtmlValue, setBodyHtmlValue] = useState<string>('')
  const [iconUrlValue, setIconUrlValue] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // New-milestone draft state
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    category: 'other' as MilestoneCategory,
    unlockDate: '',
    notes: '',
    slug: '',
  })

  const draftSlug = useMemo(
    () => (draft.slug.trim() === '' ? slugify(draft.name) : draft.slug),
    [draft.slug, draft.name],
  )

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 2000)
    return () => clearTimeout(id)
  }, [flash])

  const beginEdit = (m: {
    id: string
    name: string
    notes: string | null
    unlockDateUtc: string | null
    achieved: boolean
    bodyHtml: string | null
    iconUrl: string | null
  }) => {
    setEditing(m.id)
    setNameValue(m.name)
    setNotesValue(m.notes ?? '')
    setDateValue(m.unlockDateUtc ? format(new Date(m.unlockDateUtc), "yyyy-MM-dd'T'HH:mm") : '')
    setAchievedValue(m.achieved)
    setBodyHtmlValue(m.bodyHtml ?? '')
    setIconUrlValue(m.iconUrl)
    setError(null)
  }

  const cancelEdit = () => {
    setEditing(null)
    setNameValue('')
    setNotesValue('')
    setDateValue('')
    setAchievedValue(false)
    setBodyHtmlValue('')
    setIconUrlValue(null)
  }

  const createDraft = async () => {
    if (busy) return
    if (draft.name.trim().length === 0) {
      setError(t('admin.milestones.errors.nameRequired'))
      return
    }
    const slug = (draftSlug || slugify(draft.name)).trim()
    if (slug.length === 0) {
      setError(t('admin.milestones.errors.invalidSlug'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createMilestone({
        name: draft.name.trim(),
        slug,
        category: draft.category,
        notes: draft.notes.trim() === '' ? null : draft.notes.trim(),
        unlock_date_utc: draft.unlockDate ? new Date(draft.unlockDate).toISOString() : null,
      })
      setCreating(false)
      setDraft({ name: '', category: 'other', unlockDate: '', notes: '', slug: '' })
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.milestones.errors.failedToCreate'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await deleteMilestone(id)
      setConfirmDelete(null)
      if (editing === id) cancelEdit()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.milestones.errors.failedToDelete'))
    } finally {
      setBusy(false)
    }
  }

  const save = async (id: string) => {
    if (busy) return
    if (nameValue.trim().length === 0) {
      setError(t('admin.milestones.errors.nameRequiredShort'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateMilestone(id, {
        name: nameValue.trim(),
        notes: notesValue.trim() === '' ? null : notesValue.trim(),
        unlock_date_utc: dateValue ? new Date(dateValue).toISOString() : null,
        achieved: achievedValue,
        body_html: bodyHtmlValue.trim() === '' ? null : bodyHtmlValue,
        icon_url: iconUrlValue,
      })
      setFlash({ id, ok: true })
      cancelEdit()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.milestones.errors.failedToSave'))
      setFlash({ id, ok: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-wide py-8 sm:py-12">
      <Link
        to="/admin/alliance"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" />
        {t('admin.milestones.backToAlliance')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <Crown size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.milestones.eyebrow')}</div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider">
            {t('admin.milestones.title')}
          </h1>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25"
        >
          <Plus size={13} weight="bold" />
          {creating ? t('admin.milestones.cancel') : t('admin.milestones.newMilestone')}
        </button>
      </header>

      <p className="text-sm text-ink-mute mb-6">
        {t('admin.milestones.intro')}
      </p>

      {creating && (
        <section className="card-hero p-4 sm:p-5 mb-5 space-y-3">
          <h2 className="eyebrow">{t('admin.milestones.newMilestone')}</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.milestones.fields.name')}</span>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                maxLength={120}
                placeholder={t('admin.milestones.fields.namePlaceholder')}
                className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.milestones.fields.category')}</span>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as MilestoneCategory })}
                className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.milestones.fields.unlockDate')}</span>
              <input
                type="datetime-local"
                value={draft.unlockDate}
                onChange={(e) => setDraft({ ...draft, unlockDate: e.target.value })}
                className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest uppercase text-ink-mute">
                {t('admin.milestones.fields.slugAuto')} <span className="text-gold-soft">{draftSlug || '—'}</span>
              </span>
              <input
                type="text"
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                placeholder={t('admin.milestones.fields.slugPlaceholder')}
                className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.milestones.fields.notes')}</span>
            <input
              type="text"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              maxLength={200}
              className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
            />
          </label>
          <p className="text-[10px] text-ink-mute">
            {t('admin.milestones.afterCreateHint')}
          </p>
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => { setCreating(false); setError(null) }}
              className="inline-flex items-center gap-1 text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
            >
              <X size={11} weight="bold" /> {t('admin.milestones.cancel')}
            </button>
            <button
              onClick={createDraft}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25 disabled:opacity-50"
            >
              <Check size={12} weight="bold" /> {t('admin.milestones.create')}
            </button>
          </div>
        </section>
      )}

      {loadError && (
        <div className="callout-warn mb-6 text-sm flex gap-2 items-start">
          <WarningCircle size={16} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span>{loadError.message}</span>
        </div>
      )}

      {error && (
        <div className="callout-warn mb-4 text-sm flex gap-2 items-start">
          <WarningCircle size={16} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <ul className="card divide-y divide-gold/12 overflow-hidden">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="px-4 sm:px-5 py-3 animate-pulse">
                <div className="h-3 bg-bg-elev rounded w-48 mb-2" />
                <div className="h-2.5 bg-bg-elev rounded w-32" />
              </li>
            ))
          : milestones.map((m) => {
              const isEditing = editing === m.id
              const flashOk = flash?.id === m.id && flash.ok
              return (
                <li
                  key={m.id}
                  className={cn(
                    'px-4 sm:px-5 py-3 transition-colors',
                    flashOk && 'bg-gold/10',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink-cream font-medium leading-tight">{m.name}</div>
                      <div className="text-[10px] tracking-widest uppercase text-ink-mute mt-0.5">
                        {m.category}
                        {m.unlockDateUtc && !isEditing && (
                          <span className="ml-2 text-gold-soft normal-case tracking-normal">
                            {format(new Date(m.unlockDateUtc), 'EEE d MMM yyyy · HH:mm')} UTC
                          </span>
                        )}
                        {m.achieved && !isEditing && (
                          <span className="ml-2 text-success text-[10px]">· {t('admin.milestones.achievedBadge')}</span>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/timeline/${m.slug}`}
                          className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-ink-mute hover:text-gold-soft"
                          title={t('admin.milestones.openPublic')}
                        >
                          <ArrowSquareOut size={11} weight="bold" /> {t('admin.milestones.view')}
                        </Link>
                        <button
                          onClick={() => beginEdit(m)}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          {t('admin.milestones.edit')}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(m.id)}
                          className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-crimson-glow hover:opacity-80 px-2 py-1.5"
                          title={t('admin.milestones.deleteTitle')}
                        >
                          <Trash size={12} weight="duotone" />
                        </button>
                      </div>
                    )}
                  </div>

                  {confirmDelete === m.id && (
                    <div className="mt-3 rounded-lg border border-crimson/45 bg-crimson/10 px-3 py-2.5 text-xs">
                      <p className="text-crimson-glow font-semibold mb-1 inline-flex items-center gap-1.5">
                        <WarningCircle size={13} weight="duotone" />
                        {t('admin.milestones.confirmDelete.heading', { name: m.name })}
                      </p>
                      <p className="text-ink-paper mb-2">
                        {t('admin.milestones.confirmDelete.body', { slug: m.slug })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
                        >
                          {t('admin.milestones.cancel')}
                        </button>
                        <button
                          onClick={() => remove(m.id)}
                          disabled={busy}
                          className="ml-auto px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase bg-crimson/25 border border-crimson/50 text-crimson-glow hover:bg-crimson/40 disabled:opacity-50"
                        >
                          {t('admin.milestones.confirmDelete.yes')}
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-3 space-y-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] tracking-widest uppercase text-ink-mute">
                          {t('admin.milestones.fields.milestoneName')}
                        </span>
                        <input
                          type="text"
                          value={nameValue}
                          onChange={(e) => setNameValue(e.target.value)}
                          maxLength={120}
                          className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] tracking-widest uppercase text-ink-mute">
                          {t('admin.milestones.fields.notesPublic')}
                        </span>
                        <input
                          type="text"
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          maxLength={200}
                          placeholder={t('admin.milestones.fields.notesPublicPlaceholder')}
                          className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
                        />
                      </label>

                      <div className="grid gap-2 sm:grid-cols-[1fr,auto] items-end">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] tracking-widest uppercase text-ink-mute">
                            {t('admin.milestones.fields.unlockDateUtc')}
                          </span>
                          <input
                            type="datetime-local"
                            value={dateValue}
                            onChange={(e) => setDateValue(e.target.value)}
                            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-1.5 text-sm text-ink-cream"
                          />
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={achievedValue}
                            onChange={(e) => setAchievedValue(e.target.checked)}
                            className="accent-gold"
                          />
                          {t('admin.milestones.fields.achieved')}
                        </label>
                      </div>

                      <div>
                        <div className="text-[10px] tracking-widest uppercase text-ink-mute mb-1">
                          {t('admin.milestones.fields.icon')}
                        </div>
                        <IconPicker
                          value={iconUrlValue}
                          onChange={setIconUrlValue}
                          defaultSuggestion={
                            resolveMilestoneIcon(m.category, nameValue || m.name)?.src ?? null
                          }
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] tracking-widest uppercase text-ink-mute">
                            {t('admin.milestones.fields.contentFor', { slug: m.slug })}
                          </span>
                          <Link
                            to={`/timeline/${m.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase text-gold-soft hover:text-gold-shimmer"
                          >
                            {t('admin.milestones.preview')} <ArrowSquareOut size={10} weight="bold" />
                          </Link>
                        </div>
                        <RichTextEditor
                          value={bodyHtmlValue}
                          onChange={setBodyHtmlValue}
                          placeholder={t('admin.milestones.bodyPlaceholder')}
                          minHeight="240px"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          <X size={12} weight="bold" />
                          {t('admin.milestones.cancelEdit')}
                        </button>
                        <button
                          onClick={() => save(m.id)}
                          disabled={busy}
                          className="btn-gold text-[11px] !min-h-[32px] !py-1 !px-3 disabled:opacity-60"
                        >
                          <Check size={12} weight="bold" />
                          {t('admin.milestones.save')}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
      </ul>
    </div>
  )
}
