import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Check,
  Plus,
  Sword,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useTroopTiers } from '../../hooks/useTroopTiers'
import {
  createTroopTier,
  deleteTroopTier,
  updateTroopTier,
} from '../../repositories/troopTiers'
import { ImageUploadField } from '../../components/ui/ImageUploadField'
import type { TroopTier } from '../../types/domain'
import { cn } from '../../lib/cn'

interface TierDraft {
  tierLabel: string
  isTruegold: boolean
  displayOrder: number
  trainingBuildingLevel: number | ''
  iconUrl: string | null
  description: string
}

const EMPTY_DRAFT: TierDraft = {
  tierLabel: '',
  isTruegold: false,
  displayOrder: 0,
  trainingBuildingLevel: '',
  iconUrl: null,
  description: '',
}

export function AdminTroopTiers() {
  const { t } = useTranslation()
  const { items, loading, error: loadError, refetch } = useTroopTiers()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<TierDraft>(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState<TierDraft>(EMPTY_DRAFT)

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 2000)
    return () => clearTimeout(id)
  }, [flash])

  const beginEdit = (t: TroopTier) => {
    setEditing(t.id)
    setDraft({
      tierLabel: t.tierLabel,
      isTruegold: t.isTruegold,
      displayOrder: t.displayOrder,
      trainingBuildingLevel: t.trainingBuildingLevel ?? '',
      iconUrl: t.iconUrl,
      description: t.description ?? '',
    })
    setError(null)
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
  }

  const handleCreate = async () => {
    if (busy) return
    if (createDraft.tierLabel.trim().length === 0) {
      setError(t('admin.troopTiers.errors.tierLabelRequired'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createTroopTier({
        tier_label: createDraft.tierLabel.trim(),
        is_truegold: createDraft.isTruegold,
        display_order: createDraft.displayOrder,
        training_building_level:
          createDraft.trainingBuildingLevel === '' ? null : Number(createDraft.trainingBuildingLevel),
        icon_url: createDraft.iconUrl,
        description:
          createDraft.description.trim() === '' ? null : createDraft.description.trim(),
      })
      setCreating(false)
      setCreateDraft(EMPTY_DRAFT)
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.troopTiers.errors.failedToCreate'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await deleteTroopTier(id)
      setConfirmDelete(null)
      if (editing === id) cancelEdit()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.troopTiers.errors.failedToDelete'))
    } finally {
      setBusy(false)
    }
  }

  const save = async (id: string) => {
    if (busy) return
    if (draft.tierLabel.trim().length === 0) {
      setError(t('admin.troopTiers.errors.tierLabelRequiredShort'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateTroopTier(id, {
        tier_label: draft.tierLabel.trim(),
        is_truegold: draft.isTruegold,
        display_order: draft.displayOrder,
        training_building_level:
          draft.trainingBuildingLevel === '' ? null : Number(draft.trainingBuildingLevel),
        icon_url: draft.iconUrl,
        description: draft.description.trim() === '' ? null : draft.description.trim(),
      })
      setFlash({ id, ok: true })
      cancelEdit()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.troopTiers.errors.failedToSave'))
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
        {t('admin.troopTiers.backToCatalogue')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <Sword size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">
            {t('admin.troopTiers.eyebrow')}
          </div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider">
            {t('admin.troopTiers.title')}
          </h1>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25"
        >
          <Plus size={13} weight="bold" />
          {creating ? t('admin.troopTiers.cancel') : t('admin.troopTiers.newTier')}
        </button>
      </header>

      {creating && (
        <section className="card-hero p-4 sm:p-5 mb-5 space-y-3">
          <h2 className="eyebrow">{t('admin.troopTiers.newTier')}</h2>
          <TierFormFields draft={createDraft} onChange={setCreateDraft} />
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => {
                setCreating(false)
                setError(null)
              }}
              className="inline-flex items-center gap-1 text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
            >
              <X size={11} weight="bold" /> {t('admin.troopTiers.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25 disabled:opacity-50"
            >
              <Check size={12} weight="bold" /> {t('admin.troopTiers.create')}
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
          : items.map((ti) => {
              const isEditing = editing === ti.id
              const flashOk = flash?.id === ti.id && flash.ok
              return (
                <li
                  key={ti.id}
                  className={cn('px-4 sm:px-5 py-3 transition-colors', flashOk && 'bg-gold/10')}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-md border border-gold/25 bg-bg-elev overflow-hidden shrink-0 flex items-center justify-center">
                      {ti.iconUrl ? (
                        <img src={ti.iconUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Sword size={14} weight="duotone" className="text-ink-mute" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink-cream font-medium leading-tight">
                        {ti.tierLabel}
                      </div>
                      <div className="text-[10px] tracking-widest uppercase text-ink-mute mt-0.5">
                        {t('admin.troopTiers.orderLabel', { order: ti.displayOrder })}
                        {ti.isTruegold && (
                          <span className="ml-2 text-gold-soft">· {t('admin.troopTiers.truegoldBadge')}</span>
                        )}
                        {ti.trainingBuildingLevel != null && (
                          <span className="ml-2">· {t('admin.troopTiers.buildingLv', { lv: ti.trainingBuildingLevel })}</span>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => beginEdit(ti)}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          {t('admin.troopTiers.edit')}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(ti.id)}
                          className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-crimson-glow hover:opacity-80 px-2 py-1.5"
                        >
                          <Trash size={12} weight="duotone" />
                        </button>
                      </div>
                    )}
                  </div>

                  {confirmDelete === ti.id && (
                    <div className="mt-3 rounded-lg border border-crimson/45 bg-crimson/10 px-3 py-2.5 text-xs">
                      <p className="text-crimson-glow font-semibold mb-1 inline-flex items-center gap-1.5">
                        <WarningCircle size={13} weight="duotone" />
                        {t('admin.troopTiers.confirmDelete.heading', { name: ti.tierLabel })}
                      </p>
                      <p className="text-ink-paper mb-2">
                        {t('admin.troopTiers.confirmDelete.body')}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
                        >
                          {t('admin.troopTiers.cancel')}
                        </button>
                        <button
                          onClick={() => remove(ti.id)}
                          disabled={busy}
                          className="ml-auto px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase bg-crimson/25 border border-crimson/50 text-crimson-glow hover:bg-crimson/40 disabled:opacity-50"
                        >
                          {t('admin.troopTiers.confirmDelete.yes')}
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-3 space-y-3">
                      <TierFormFields draft={draft} onChange={setDraft} />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5"
                        >
                          <X size={12} weight="bold" />
                          {t('admin.troopTiers.cancelEdit')}
                        </button>
                        <button
                          onClick={() => save(ti.id)}
                          disabled={busy}
                          className="btn-gold text-[11px] !min-h-[32px] !py-1 !px-3 disabled:opacity-60"
                        >
                          <Check size={12} weight="bold" />
                          {t('admin.troopTiers.save')}
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

function TierFormFields({
  draft,
  onChange,
}: {
  draft: TierDraft
  onChange: (d: TierDraft) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid sm:grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.troopTiers.fields.tierLabel')}</span>
          <input
            type="text"
            value={draft.tierLabel}
            onChange={(e) => onChange({ ...draft, tierLabel: e.target.value })}
            placeholder={t('admin.troopTiers.fields.tierLabelPlaceholder')}
            maxLength={16}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.troopTiers.fields.displayOrder')}</span>
          <input
            type="number"
            value={draft.displayOrder}
            onChange={(e) => onChange({ ...draft, displayOrder: Number(e.target.value) })}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest uppercase text-ink-mute">
            {t('admin.troopTiers.fields.trainingBuildingLevel')}
          </span>
          <input
            type="number"
            value={draft.trainingBuildingLevel}
            onChange={(e) =>
              onChange({
                ...draft,
                trainingBuildingLevel: e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            placeholder={t('admin.troopTiers.fields.optional')}
            className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
          />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={draft.isTruegold}
          onChange={(e) => onChange({ ...draft, isTruegold: e.target.checked })}
          className="accent-gold"
        />
        {t('admin.troopTiers.fields.truegoldTier')}
      </label>

      <div>
        <div className="text-[10px] tracking-widest uppercase text-ink-mute mb-1">{t('admin.troopTiers.fields.icon')}</div>
        <ImageUploadField
          bucket="milestone-bodies"
          pathPrefix="troop-tiers"
          value={draft.iconUrl}
          onChange={(url) => onChange({ ...draft, iconUrl: url })}
          label={t('admin.troopTiers.fields.iconUploadLabel')}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.troopTiers.fields.description')}</span>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          rows={3}
          className="rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none resize-none"
        />
      </label>
    </>
  )
}
