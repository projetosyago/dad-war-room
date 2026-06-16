import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  BookOpen,
  CalendarPlus,
  Plus,
  Archive,
  ArrowCounterClockwise,
  WarningCircle,
  Check,
} from '@phosphor-icons/react'
import { useEvents } from '../../hooks/useEvents'
import { archiveEvent, createEvent, updateEvent } from '../../repositories/events'
import { cn } from '../../lib/cn'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function AdminEvents() {
  const { t } = useTranslation()
  const { events, loading, error: loadError, refetch } = useEvents()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [description, setDescription] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [isSeasonal, setIsSeasonal] = useState(true)

  const archive = async (id: string) => {
    if (!confirm(t('admin.events.confirmArchive'))) return
    setBusyId(id)
    setError(null)
    setFeedback(null)
    try {
      await archiveEvent(id)
      setFeedback(t('admin.events.feedback.archived'))
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.events.errorFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const unarchive = async (id: string) => {
    setBusyId(id)
    setError(null)
    setFeedback(null)
    try {
      await updateEvent(id, { status: 'coming-soon', archived_at: null })
      setFeedback(t('admin.events.feedback.restored'))
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.events.errorFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFeedback(null)
    try {
      await createEvent({
        slug: slugify(name),
        name,
        short_name: shortName || null,
        description: description || null,
        icon_url: iconUrl || null,
        is_seasonal: isSeasonal,
        status: 'coming-soon',
        display_order: 200,
      })
      setShowForm(false)
      setName('')
      setShortName('')
      setDescription('')
      setIconUrl('')
      setFeedback(t('admin.events.feedback.created'))
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.events.errorFailed'))
    }
  }

  return (
    <div className="container-wide py-8 sm:py-12">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" /> {t('admin.events.backToAdmin')}
      </Link>

      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
            <BookOpen size={18} weight="duotone" className="text-gold-soft" />
          </span>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.events.eyebrow')}</div>
            <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider">
              {t('admin.events.title')}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/events/occurrences" className="btn-ghost text-xs">
            <CalendarPlus size={14} weight="duotone" /> {t('admin.events.occurrencesLink')}
          </Link>
          <button onClick={() => setShowForm((v) => !v)} className="btn-gold">
            <Plus size={16} weight="bold" /> {showForm ? t('admin.events.close') : t('admin.events.newEvent')}
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={submitNew} className="card-elev p-5 sm:p-6 mb-6 grid gap-3 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-display-clean text-base text-gold tracking-wider uppercase">
            {t('admin.events.form.heading')}
          </h2>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.events.form.nameLabel')}</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.events.form.namePlaceholder')}
              className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.events.form.shortNameLabel')}</span>
            <input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder={t('admin.events.form.shortNamePlaceholder')}
              className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.events.form.descriptionLabel')}</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.events.form.iconUrlLabel')}</span>
            <input
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder={t('admin.events.form.iconUrlPlaceholder')}
              className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm self-end">
            <input
              type="checkbox"
              checked={isSeasonal}
              onChange={(e) => setIsSeasonal(e.target.checked)}
              className="accent-gold"
            />
            {t('admin.events.form.seasonal')}
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn-gold">
              <Plus size={16} weight="bold" /> {t('admin.events.form.create')}
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
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-4 sm:px-5 py-3 animate-pulse">
                <div className="h-3 bg-bg-elev rounded w-40 mb-2" />
                <div className="h-2.5 bg-bg-elev rounded w-24" />
              </li>
            ))
          : events.map((ev) => {
              const archived = ev.status === 'archived'
              return (
                <li
                  key={ev.id}
                  className={cn(
                    'flex items-center gap-3 px-4 sm:px-5 py-3',
                    archived && 'opacity-60',
                  )}
                >
                  <div className="h-10 w-10 rounded-lg bg-bg-card/80 border border-gold/20 flex items-center justify-center">
                    <img
                      src={ev.iconUrl ?? '/images/events/bear-hunt.png'}
                      alt=""
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink-cream font-medium leading-tight truncate">
                      {ev.shortName ?? ev.name}
                      {ev.isSeasonal && (
                        <span className="ml-2 text-[10px] tracking-widest uppercase text-gold-soft">
                          · {t('admin.events.seasonalBadge')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-mute mt-0.5 truncate">
                      {ev.description ?? ev.name} · {ev.status}
                    </div>
                  </div>
                  {archived ? (
                    <button
                      onClick={() => unarchive(ev.id)}
                      disabled={busyId === ev.id}
                      className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60"
                    >
                      <ArrowCounterClockwise size={12} weight="bold" /> {t('admin.events.actions.restore')}
                    </button>
                  ) : (
                    <button
                      onClick={() => archive(ev.id)}
                      disabled={busyId === ev.id}
                      className="btn-ghost text-[11px] !min-h-[32px] !py-1 !px-2.5 disabled:opacity-60"
                    >
                      <Archive size={12} weight="duotone" /> {t('admin.events.actions.archive')}
                    </button>
                  )}
                </li>
              )
            })}
      </ul>
    </div>
  )
}
