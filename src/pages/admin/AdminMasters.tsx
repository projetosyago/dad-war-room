import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Check,
  Plus,
  Shield,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useMasters } from '../../hooks/useMasters'
import { createMaster, deleteMaster, updateMaster } from '../../repositories/masters'
import { ImageUploadField } from '../../components/ui/ImageUploadField'
import type { Master } from '../../types/domain'
import { cn } from '../../lib/cn'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

interface MasterDraft {
  name: string
  slug: string
  unlockOrder: number
  portraitUrl: string | null
  description: string
  releasedAt: string
  active: boolean
}

const EMPTY_DRAFT: MasterDraft = {
  name: '',
  slug: '',
  unlockOrder: 1,
  portraitUrl: null,
  description: '',
  releasedAt: '',
  active: true,
}

export function AdminMasters() {
  const { t } = useTranslation()
  const { items, loading, error: loadError, refetch } = useMasters()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<MasterDraft>(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState<MasterDraft>(EMPTY_DRAFT)

  const createSlug = useMemo(
    () => (createDraft.slug.trim() === '' ? slugify(createDraft.name) : createDraft.slug),
    [createDraft.slug, createDraft.name],
  )

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 2000)
    return () => clearTimeout(id)
  }, [flash])

  const beginEdit = (m: Master) => {
    setEditing(m.id)
    setDraft({
      name: m.name,
      slug: m.slug,
      unlockOrder: m.unlockOrder,
      portraitUrl: m.portraitUrl,
      description: m.description ?? '',
      releasedAt: m.releasedAt ?? '',
      active: m.active,
    })
    setError(null)
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
  }

  const handleCreate = async () => {
    if (busy) return
    if (createDraft.name.trim().length === 0) {
      setError(t('admin.masters.errors.nameRequired'))
      return
    }
    const slug = (createSlug || slugify(createDraft.name)).trim()
    if (slug.length === 0) {
      setError(t('admin.masters.errors.invalidSlug'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createMaster({
        name: createDraft.name.trim(),
        slug,
        unlock_order: createDraft.unlockOrder,
        portrait_url: createDraft.portraitUrl,
        description: createDraft.description.trim() === '' ? null : createDraft.description.trim(),
        released_at: createDraft.releasedAt === '' ? null : createDraft.releasedAt,
        active: createDraft.active,
      })
      setCreating(false)
      setCreateDraft(EMPTY_DRAFT)
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.masters.errors.failedToCreate'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await deleteMaster(id)
      setConfirmDelete(null)
      if (editing === id) cancelEdit()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.masters.errors.failedToDelete'))
    } finally {
      setBusy(false)
    }
  }

  const save = async (id: string) => {
    if (busy) return
    if (draft.name.trim().length === 0) {
      setError(t('admin.masters.errors.nameRequiredShort'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateMaster(id, {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        unlock_order: draft.unlockOrder,
        portrait_url: draft.portraitUrl,
        description: draft.description.trim() === '' ? null : draft.description.trim(),
        released_at: draft.releasedAt === '' ? null : draft.releasedAt,
        active: draft.active,
      })
      setFlash({ id, ok: true })
      cancelEdit()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.masters.errors.failedToSave'))
      setFlash({ id, ok: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-wide py-8 sm:py-12">
      <Link
        to="/admin/alliance/catalogue"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" />
        {t('admin.masters.backToCatalogue')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <Shield size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">
            {t('admin.masters.eyebrow')}
          </div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider">
            {t('admin.masters.title')}
          </h1>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25"
        >
          <Plus size={13} weight="bold" />
          {creating ? t('admin.masters.cancel') : t('admin.masters.newMaster')}
        </button>
      </header>

      {creating && (
        <section className="card-hero p-4 sm:p-5 mb-5 space-y-3">
          <h2 className="eyebrow">{t('admin.masters.newMaster')}</h2>
          <MasterFormFields
            draft={createDraft}
            onChange={setCreateDraft}
            slugHint={createSlug}
          />
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => {
                setCreating(false)
                setError(null)
              }}
              className="inline-flex items-center gap-1 text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
            >
              <X size={11} weight="bold" /> {t('admin.masters.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25 disabled:opacity-50"
            >
              <Check size={12} weight="bold" /> {t('admin.masters.create')}
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
          : items.map((m) => {
              const isEditing = editing === m.id
              const flashOk = flash?.id === m.id && flash.ok
              return (
                <li
                  key={m.id}
                  className={cn('px-4 sm:px-5 py-3 transition-colors', flashOk && 'bg-gold/10')}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-md border border-gold/25 bg-bg-elev overflow-hidden shrink-0 flex items-center justify-center">
                      {m.portraitUrl ? (
                        <img src={m.portraitUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Shield size={14} weight="duotone" className="text-ink-mute" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink-cream font-medium leading-tight">
                        {m.name}
                      </div>
                      <div className="text-[10px] tracking-widest uppercase text-ink-mute mt-0.5">
                        <span className="font-mono normal-case tracking-normal text-gold-soft">
                          {m.slug}
                        </span>
                        <span className="ml-2">{t('admin.masters.unlockOrderLabel', { order: m.unlockOrder })}</span>
                        {!m.active && <span className="ml-2 text-danger">· {t('admin.masters.inactive')}</span>}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => beginEdit(m)}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          {t('admin.masters.edit')}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(m.id)}
                          className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-crimson-glow hover:opacity-80 px-2 py-1.5"
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
                        {t('admin.masters.confirmDelete.heading', { name: m.name })}
                      </p>
                      <p className="text-ink-paper mb-2">
                        {t('admin.masters.confirmDelete.body', { slug: m.slug })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
                        >
                          {t('admin.masters.cancel')}
                        </button>
                        <button
                          onClick={() => remove(m.id)}
                          disabled={busy}
                          className="ml-auto px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase bg-crimson/25 border border-crimson/50 text-crimson-glow hover:bg-crimson/40 disabled:opacity-50"
                        >
                          {t('admin.masters.confirmDelete.yes')}
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-3 space-y-3">
                      <MasterFormFields draft={draft} onChange={setDraft} slugHint={draft.slug} />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          <X size={12} weight="bold" />
                          {t('admin.masters.cancelEdit')}
                        </button>
                        <button
                          onClick={() => save(m.id)}
                          disabled={busy}
                          className="btn-gold text-[11px] !min-h-[32px] !py-1 !px-3 disabled:opacity-60"
                        >
                          <Check size={12} weight="bold" />
                          {t('admin.masters.save')}
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

function MasterFormFields({
  draft,
  onChange,
  slugHint,
}: {
  draft: MasterDraft
  onChange: (d: MasterDraft) => void
  slugHint: string
}) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.masters.fields.name')}</span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            maxLength={120}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">
            {t('admin.masters.fields.slugSuggested')} <span className="text-gold-soft">{slugHint || '—'}</span>
          </span>
          <input
            type="text"
            value={draft.slug}
            onChange={(e) => onChange({ ...draft, slug: e.target.value })}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none font-mono"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.masters.fields.unlockOrder')}</span>
        <input
          type="number"
          min={1}
          value={draft.unlockOrder}
          onChange={(e) => onChange({ ...draft, unlockOrder: Number(e.target.value) })}
          className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
        />
      </label>

      <div>
        <div className="text-[10px] tracking-widest uppercase text-ink-mute mb-1">{t('admin.masters.fields.portrait')}</div>
        <ImageUploadField
          bucket="milestone-bodies"
          pathPrefix="masters"
          value={draft.portraitUrl}
          onChange={(url) => onChange({ ...draft, portraitUrl: url })}
          label={t('admin.masters.fields.portraitUploadLabel')}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.masters.fields.description')}</span>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          rows={3}
          className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none resize-none"
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-2 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.masters.fields.releasedAt')}</span>
          <input
            type="date"
            value={draft.releasedAt}
            onChange={(e) => onChange({ ...draft, releasedAt: e.target.value })}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => onChange({ ...draft, active: e.target.checked })}
            className="accent-gold"
          />
          {t('admin.masters.fields.active')}
        </label>
      </div>
    </>
  )
}
