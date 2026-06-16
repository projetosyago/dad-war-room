import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Check,
  PawPrint,
  Plus,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { usePets } from '../../hooks/usePets'
import { createPet, deletePet, updatePet } from '../../repositories/pets'
import { ImageUploadField } from '../../components/ui/ImageUploadField'
import type { Pet } from '../../types/domain'
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

interface PetDraft {
  name: string
  slug: string
  generation: number
  portraitUrl: string | null
  description: string
  releasedAt: string
  displayOrder: number
  active: boolean
}

const EMPTY_DRAFT: PetDraft = {
  name: '',
  slug: '',
  generation: 1,
  portraitUrl: null,
  description: '',
  releasedAt: '',
  displayOrder: 0,
  active: true,
}

export function AdminPets() {
  const { t } = useTranslation()
  const { items, loading, error: loadError, refetch } = usePets({ includeInactive: true })
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<PetDraft>(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState<PetDraft>(EMPTY_DRAFT)

  const createSlug = useMemo(
    () => (createDraft.slug.trim() === '' ? slugify(createDraft.name) : createDraft.slug),
    [createDraft.slug, createDraft.name],
  )

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 2000)
    return () => clearTimeout(id)
  }, [flash])

  const beginEdit = (p: Pet) => {
    setEditing(p.id)
    setDraft({
      name: p.name,
      slug: p.slug,
      generation: p.generation,
      portraitUrl: p.portraitUrl,
      description: p.description ?? '',
      releasedAt: p.releasedAt ?? '',
      displayOrder: p.displayOrder,
      active: p.active,
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
      setError(t('admin.pets.errors.nameRequired'))
      return
    }
    const slug = (createSlug || slugify(createDraft.name)).trim()
    if (slug.length === 0) {
      setError(t('admin.pets.errors.invalidSlug'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createPet({
        name: createDraft.name.trim(),
        slug,
        generation: createDraft.generation,
        portrait_url: createDraft.portraitUrl,
        description: createDraft.description.trim() === '' ? null : createDraft.description.trim(),
        released_at: createDraft.releasedAt === '' ? null : createDraft.releasedAt,
        display_order: createDraft.displayOrder,
        active: createDraft.active,
      })
      setCreating(false)
      setCreateDraft(EMPTY_DRAFT)
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.pets.errors.failedToCreate'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await deletePet(id)
      setConfirmDelete(null)
      if (editing === id) cancelEdit()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.pets.errors.failedToDelete'))
    } finally {
      setBusy(false)
    }
  }

  const save = async (id: string) => {
    if (busy) return
    if (draft.name.trim().length === 0) {
      setError(t('admin.pets.errors.nameRequiredShort'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updatePet(id, {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        generation: draft.generation,
        portrait_url: draft.portraitUrl,
        description: draft.description.trim() === '' ? null : draft.description.trim(),
        released_at: draft.releasedAt === '' ? null : draft.releasedAt,
        display_order: draft.displayOrder,
        active: draft.active,
      })
      setFlash({ id, ok: true })
      cancelEdit()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.pets.errors.failedToSave'))
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
        {t('admin.pets.backToCatalogue')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <PawPrint size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">
            {t('admin.pets.eyebrow')}
          </div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider">
            {t('admin.pets.title')}
          </h1>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25"
        >
          <Plus size={13} weight="bold" />
          {creating ? t('admin.pets.cancel') : t('admin.pets.newPet')}
        </button>
      </header>

      {creating && (
        <section className="card-hero p-4 sm:p-5 mb-5 space-y-3">
          <h2 className="eyebrow">{t('admin.pets.newPet')}</h2>
          <PetFormFields draft={createDraft} onChange={setCreateDraft} slugHint={createSlug} />
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => {
                setCreating(false)
                setError(null)
              }}
              className="inline-flex items-center gap-1 text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
            >
              <X size={11} weight="bold" /> {t('admin.pets.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25 disabled:opacity-50"
            >
              <Check size={12} weight="bold" /> {t('admin.pets.create')}
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
          : items.map((p) => {
              const isEditing = editing === p.id
              const flashOk = flash?.id === p.id && flash.ok
              return (
                <li
                  key={p.id}
                  className={cn('px-4 sm:px-5 py-3 transition-colors', flashOk && 'bg-gold/10')}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-md border border-gold/25 bg-bg-elev overflow-hidden shrink-0 flex items-center justify-center">
                      {p.portraitUrl ? (
                        <img src={p.portraitUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <PawPrint size={14} weight="duotone" className="text-ink-mute" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink-cream font-medium leading-tight">
                        {p.name}
                      </div>
                      <div className="text-[10px] tracking-widest uppercase text-ink-mute mt-0.5">
                        <span className="font-mono normal-case tracking-normal text-gold-soft">
                          {p.slug}
                        </span>
                        <span className="ml-2">{t('admin.pets.genLabel', { gen: p.generation })}</span>
                        {!p.active && <span className="ml-2 text-danger">· {t('admin.pets.inactive')}</span>}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => beginEdit(p)}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          {t('admin.pets.edit')}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p.id)}
                          className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-crimson-glow hover:opacity-80 px-2 py-1.5"
                        >
                          <Trash size={12} weight="duotone" />
                        </button>
                      </div>
                    )}
                  </div>

                  {confirmDelete === p.id && (
                    <div className="mt-3 rounded-lg border border-crimson/45 bg-crimson/10 px-3 py-2.5 text-xs">
                      <p className="text-crimson-glow font-semibold mb-1 inline-flex items-center gap-1.5">
                        <WarningCircle size={13} weight="duotone" />
                        {t('admin.pets.confirmDelete.heading', { name: p.name })}
                      </p>
                      <p className="text-ink-paper mb-2">
                        {t('admin.pets.confirmDelete.body', { slug: p.slug })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
                        >
                          {t('admin.pets.cancel')}
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          disabled={busy}
                          className="ml-auto px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase bg-crimson/25 border border-crimson/50 text-crimson-glow hover:bg-crimson/40 disabled:opacity-50"
                        >
                          {t('admin.pets.confirmDelete.yes')}
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-3 space-y-3">
                      <PetFormFields draft={draft} onChange={setDraft} slugHint={draft.slug} />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          <X size={12} weight="bold" />
                          {t('admin.pets.cancelEdit')}
                        </button>
                        <button
                          onClick={() => save(p.id)}
                          disabled={busy}
                          className="btn-gold text-[11px] !min-h-[32px] !py-1 !px-3 disabled:opacity-60"
                        >
                          <Check size={12} weight="bold" />
                          {t('admin.pets.save')}
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

function PetFormFields({
  draft,
  onChange,
  slugHint,
}: {
  draft: PetDraft
  onChange: (d: PetDraft) => void
  slugHint: string
}) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.pets.fields.name')}</span>
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
            {t('admin.pets.fields.slugSuggested')} <span className="text-gold-soft">{slugHint || '—'}</span>
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
        <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.pets.fields.generation')}</span>
        <input
          type="number"
          min={1}
          value={draft.generation}
          onChange={(e) => onChange({ ...draft, generation: Number(e.target.value) })}
          className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
        />
      </label>

      <div>
        <div className="text-[10px] tracking-widest uppercase text-ink-mute mb-1">{t('admin.pets.fields.portrait')}</div>
        <ImageUploadField
          bucket="milestone-bodies"
          pathPrefix="pets"
          value={draft.portraitUrl}
          onChange={(url) => onChange({ ...draft, portraitUrl: url })}
          label={t('admin.pets.fields.portraitUploadLabel')}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.pets.fields.description')}</span>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          rows={3}
          className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none resize-none"
        />
      </label>

      <div className="grid sm:grid-cols-3 gap-2 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.pets.fields.releasedAt')}</span>
          <input
            type="date"
            value={draft.releasedAt}
            onChange={(e) => onChange({ ...draft, releasedAt: e.target.value })}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.pets.fields.displayOrder')}</span>
          <input
            type="number"
            value={draft.displayOrder}
            onChange={(e) => onChange({ ...draft, displayOrder: Number(e.target.value) })}
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
          {t('admin.pets.fields.active')}
        </label>
      </div>
    </>
  )
}
