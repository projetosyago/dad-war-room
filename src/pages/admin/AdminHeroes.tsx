import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Check,
  Plus,
  Trash,
  UsersThree,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useHeroes } from '../../hooks/useHeroes'
import { createHero, deleteHero, updateHero } from '../../repositories/heroes'
import { ImageUploadField } from '../../components/ui/ImageUploadField'
import type { Hero, TroopBranch } from '../../types/domain'
import { cn } from '../../lib/cn'

const BRANCH_OPTIONS: { value: TroopBranch | ''; labelKey: string }[] = [
  { value: '', labelKey: 'admin.heroes.branch.none' },
  { value: 'infantry', labelKey: 'admin.heroes.branch.infantry' },
  { value: 'cavalry', labelKey: 'admin.heroes.branch.cavalry' },
  { value: 'archer', labelKey: 'admin.heroes.branch.archer' },
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

interface HeroDraft {
  name: string
  slug: string
  generation: number
  role: string
  preferredBranch: TroopBranch | ''
  portraitUrl: string | null
  description: string
  releasedAt: string
  displayOrder: number
  active: boolean
}

const EMPTY_DRAFT: HeroDraft = {
  name: '',
  slug: '',
  generation: 1,
  role: '',
  preferredBranch: '',
  portraitUrl: null,
  description: '',
  releasedAt: '',
  displayOrder: 0,
  active: true,
}

export function AdminHeroes() {
  const { t } = useTranslation()
  const { items, loading, error: loadError, refetch } = useHeroes({ includeInactive: true })
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<HeroDraft>(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState<HeroDraft>(EMPTY_DRAFT)

  const createSlug = useMemo(
    () => (createDraft.slug.trim() === '' ? slugify(createDraft.name) : createDraft.slug),
    [createDraft.slug, createDraft.name],
  )

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 2000)
    return () => clearTimeout(id)
  }, [flash])

  const beginEdit = (h: Hero) => {
    setEditing(h.id)
    setDraft({
      name: h.name,
      slug: h.slug,
      generation: h.generation,
      role: h.role ?? '',
      preferredBranch: h.preferredBranch ?? '',
      portraitUrl: h.portraitUrl,
      description: h.description ?? '',
      releasedAt: h.releasedAt ?? '',
      displayOrder: h.displayOrder,
      active: h.active,
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
      setError(t('admin.heroes.errors.nameRequired'))
      return
    }
    const slug = (createSlug || slugify(createDraft.name)).trim()
    if (slug.length === 0) {
      setError(t('admin.heroes.errors.invalidSlug'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createHero({
        name: createDraft.name.trim(),
        slug,
        generation: createDraft.generation,
        role: createDraft.role.trim() === '' ? null : createDraft.role.trim(),
        preferred_branch: createDraft.preferredBranch === '' ? null : createDraft.preferredBranch,
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
      setError(e instanceof Error ? e.message : t('admin.heroes.errors.failedToCreate'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await deleteHero(id)
      setConfirmDelete(null)
      if (editing === id) cancelEdit()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.heroes.errors.failedToDelete'))
    } finally {
      setBusy(false)
    }
  }

  const save = async (id: string) => {
    if (busy) return
    if (draft.name.trim().length === 0) {
      setError(t('admin.heroes.errors.nameRequiredShort'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateHero(id, {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        generation: draft.generation,
        role: draft.role.trim() === '' ? null : draft.role.trim(),
        preferred_branch: draft.preferredBranch === '' ? null : draft.preferredBranch,
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
      setError(e instanceof Error ? e.message : t('admin.heroes.errors.failedToSave'))
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
        {t('admin.heroes.backToCatalogue')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <UsersThree size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">
            {t('admin.heroes.eyebrow')}
          </div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider">
            {t('admin.heroes.title')}
          </h1>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25"
        >
          <Plus size={13} weight="bold" />
          {creating ? t('admin.heroes.cancel') : t('admin.heroes.newHero')}
        </button>
      </header>

      {creating && (
        <section className="card-hero p-4 sm:p-5 mb-5 space-y-3">
          <h2 className="eyebrow">{t('admin.heroes.newHero')}</h2>
          <HeroFormFields
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
              <X size={11} weight="bold" /> {t('admin.heroes.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25 disabled:opacity-50"
            >
              <Check size={12} weight="bold" /> {t('admin.heroes.create')}
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
          : items.map((h) => {
              const isEditing = editing === h.id
              const flashOk = flash?.id === h.id && flash.ok
              return (
                <li
                  key={h.id}
                  className={cn('px-4 sm:px-5 py-3 transition-colors', flashOk && 'bg-gold/10')}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-md border border-gold/25 bg-bg-elev overflow-hidden shrink-0 flex items-center justify-center">
                      {h.portraitUrl ? (
                        <img src={h.portraitUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UsersThree size={14} weight="duotone" className="text-ink-mute" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink-cream font-medium leading-tight">
                        {h.name}
                      </div>
                      <div className="text-[10px] tracking-widest uppercase text-ink-mute mt-0.5">
                        <span className="font-mono normal-case tracking-normal text-gold-soft">
                          {h.slug}
                        </span>
                        <span className="ml-2">{t('admin.heroes.genLabel', { gen: h.generation })}</span>
                        {!h.active && <span className="ml-2 text-danger">· {t('admin.heroes.inactive')}</span>}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => beginEdit(h)}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          {t('admin.heroes.edit')}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(h.id)}
                          className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-crimson-glow hover:opacity-80 px-2 py-1.5"
                        >
                          <Trash size={12} weight="duotone" />
                        </button>
                      </div>
                    )}
                  </div>

                  {confirmDelete === h.id && (
                    <div className="mt-3 rounded-lg border border-crimson/45 bg-crimson/10 px-3 py-2.5 text-xs">
                      <p className="text-crimson-glow font-semibold mb-1 inline-flex items-center gap-1.5">
                        <WarningCircle size={13} weight="duotone" />
                        {t('admin.heroes.confirmDelete.heading', { name: h.name })}
                      </p>
                      <p className="text-ink-paper mb-2">
                        {t('admin.heroes.confirmDelete.body', { slug: h.slug })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
                        >
                          {t('admin.heroes.cancel')}
                        </button>
                        <button
                          onClick={() => remove(h.id)}
                          disabled={busy}
                          className="ml-auto px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase bg-crimson/25 border border-crimson/50 text-crimson-glow hover:bg-crimson/40 disabled:opacity-50"
                        >
                          {t('admin.heroes.confirmDelete.yes')}
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-3 space-y-3">
                      <HeroFormFields draft={draft} onChange={setDraft} slugHint={draft.slug} />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          <X size={12} weight="bold" />
                          {t('admin.heroes.cancelEdit')}
                        </button>
                        <button
                          onClick={() => save(h.id)}
                          disabled={busy}
                          className="btn-gold text-[11px] !min-h-[32px] !py-1 !px-3 disabled:opacity-60"
                        >
                          <Check size={12} weight="bold" />
                          {t('admin.heroes.save')}
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

function HeroFormFields({
  draft,
  onChange,
  slugHint,
}: {
  draft: HeroDraft
  onChange: (d: HeroDraft) => void
  slugHint: string
}) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.heroes.fields.name')}</span>
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
            {t('admin.heroes.fields.slugSuggested')} <span className="text-gold-soft">{slugHint || '—'}</span>
          </span>
          <input
            type="text"
            value={draft.slug}
            onChange={(e) => onChange({ ...draft, slug: e.target.value })}
            placeholder={t('admin.heroes.fields.slugPlaceholder')}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none font-mono"
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.heroes.fields.generation')}</span>
          <input
            type="number"
            min={1}
            max={12}
            value={draft.generation}
            onChange={(e) => onChange({ ...draft, generation: Number(e.target.value) })}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.heroes.fields.role')}</span>
          <input
            type="text"
            value={draft.role}
            onChange={(e) => onChange({ ...draft, role: e.target.value })}
            placeholder={t('admin.heroes.fields.rolePlaceholder')}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.heroes.fields.preferredBranch')}</span>
          <select
            value={draft.preferredBranch}
            onChange={(e) =>
              onChange({ ...draft, preferredBranch: e.target.value as TroopBranch | '' })
            }
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          >
            {BRANCH_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {t(b.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="text-[10px] tracking-widest uppercase text-ink-mute mb-1">{t('admin.heroes.fields.portrait')}</div>
        <ImageUploadField
          bucket="milestone-bodies"
          pathPrefix="heroes"
          value={draft.portraitUrl}
          onChange={(url) => onChange({ ...draft, portraitUrl: url })}
          label={t('admin.heroes.fields.portraitUploadLabel')}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.heroes.fields.description')}</span>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          rows={3}
          className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none resize-none"
        />
      </label>

      <div className="grid sm:grid-cols-3 gap-2 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.heroes.fields.releasedAt')}</span>
          <input
            type="date"
            value={draft.releasedAt}
            onChange={(e) => onChange({ ...draft, releasedAt: e.target.value })}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.heroes.fields.displayOrder')}</span>
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
          {t('admin.heroes.fields.active')}
        </label>
      </div>
    </>
  )
}
