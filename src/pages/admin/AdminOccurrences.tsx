import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ArrowLeft, CalendarPlus, Trash, WarningCircle, Check, Repeat, UsersThree } from '@phosphor-icons/react'
import { useEvents } from '../../hooks/useEvents'
import {
  listOccurrencesInRange,
  createOccurrence,
  createRecurringOccurrences,
  deleteOccurrence,
} from '../../repositories/occurrences'
import type { OccurrenceWithEvent } from '../../types/domain'

function defaultDateTime(hoursAhead = 6): string {
  const d = new Date(Date.now() + hoursAhead * 3600 * 1000)
  d.setSeconds(0, 0)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

export function AdminOccurrences() {
  const { t } = useTranslation()
  const { events, loading: eventsLoading } = useEvents()
  const [items, setItems] = useState<OccurrenceWithEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [eventId, setEventId] = useState<string>('')
  const [startsAt, setStartsAt] = useState<string>(defaultDateTime())
  const [duration, setDuration] = useState<number>(30)
  const [phaseLabel, setPhaseLabel] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [repeats, setRepeats] = useState<boolean>(false)
  const [intervalHours, setIntervalHours] = useState<number>(48)
  const [count, setCount] = useState<number>(10)
  const [submitting, setSubmitting] = useState(false)

  const reload = async () => {
    try {
      setLoading(true)
      setError(null)
      const from = new Date(Date.now() - 24 * 3600 * 1000)
      const to = new Date(Date.now() + 30 * 24 * 3600 * 1000)
      const data = await listOccurrencesInRange(from, to, { includeCancelled: true })
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.occurrences.errors.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  useEffect(() => {
    if (!eventId && events.length > 0) setEventId(events[0].id)
  }, [eventId, events])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !eventId) return
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      const startsAtUtc = new Date(startsAt).toISOString()
      const base = {
        event_id: eventId,
        duration_minutes: duration,
        phase_label: phaseLabel || null,
        notes: notes || null,
      }
      if (repeats) {
        await createRecurringOccurrences(base, new Date(startsAtUtc), intervalHours, count)
        setFeedback(t('admin.occurrences.feedback.addedMany', { count, hours: intervalHours }))
      } else {
        await createOccurrence({ ...base, starts_at_utc: startsAtUtc })
        setFeedback(t('admin.occurrences.feedback.added'))
      }
      setStartsAt(defaultDateTime())
      setPhaseLabel('')
      setNotes('')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.occurrences.errors.failedToSave'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.occurrences.confirmDelete'))) return
    try {
      await deleteOccurrence(id)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.occurrences.errors.failedToDelete'))
    }
  }

  return (
    <div className="container-wide py-8 sm:py-12">
      <Link
        to="/admin/events"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" />
        {t('admin.occurrences.backToEvents')}
      </Link>

      <header className="mb-6">
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.occurrences.eyebrow')}</div>
        <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider">
          {t('admin.occurrences.title')}
        </h1>
        <p className="text-sm text-ink-mute mt-1">
          {t('admin.occurrences.intro')}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="card-elev p-5 sm:p-6 mb-8 grid gap-3 sm:grid-cols-2"
      >
        <div className="sm:col-span-2 flex items-center gap-2 mb-1">
          <CalendarPlus size={16} weight="duotone" className="text-gold-soft" />
          <h2 className="font-display-clean text-base text-gold tracking-wider uppercase">
            {t('admin.occurrences.form.heading')}
          </h2>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.occurrences.form.eventLabel')}</span>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            disabled={eventsLoading}
            className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.shortName ?? ev.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">
            {t('admin.occurrences.form.startsAtLabel')}
          </span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
            className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">{t('admin.occurrences.form.durationLabel')}</span>
          <input
            type="number"
            min={5}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">
            {t('admin.occurrences.form.phaseLabel')}
          </span>
          <input
            type="text"
            value={phaseLabel}
            onChange={(e) => setPhaseLabel(e.target.value)}
            placeholder={t('admin.occurrences.form.phasePlaceholder')}
            className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream"
          />
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-[11px] tracking-widest uppercase text-ink-mute">
            {t('admin.occurrences.form.notesLabel')}
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2.5 text-sm text-ink-cream"
          />
        </label>

        <div className="sm:col-span-2 mt-1 rounded-xl border border-gold/15 bg-bg-card/40 p-3">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={repeats}
              onChange={(e) => setRepeats(e.target.checked)}
              className="accent-gold"
            />
            <Repeat size={14} weight="duotone" className="text-gold-soft" />
            <span className="text-ink-cream">{t('admin.occurrences.form.repeatLabel')}</span>
          </label>
          {repeats && (
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] tracking-widest uppercase text-ink-mute">
                  {t('admin.occurrences.form.intervalLabel')}
                </span>
                <input
                  type="number"
                  min={1}
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(parseInt(e.target.value) || 0)}
                  className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream"
                />
                <span className="text-[10px] text-ink-mute">{t('admin.occurrences.form.bearHint')}</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] tracking-widest uppercase text-ink-mute">
                  {t('admin.occurrences.form.countLabel')}
                </span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                  className="rounded-xl bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream"
                />
              </label>
            </div>
          )}
        </div>

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
            disabled={submitting || !eventId}
            className="btn-gold disabled:opacity-60"
          >
            <CalendarPlus size={16} weight="duotone" />
            {submitting
              ? t('admin.occurrences.form.saving')
              : repeats
                ? t('admin.occurrences.form.submitMany', { count })
                : t('admin.occurrences.form.submit')}
          </button>
        </div>
      </form>

      <h2 className="font-display-clean text-base text-gold tracking-wider uppercase mb-3">
        {t('admin.occurrences.upcomingHeading')}
      </h2>
      {loading ? (
        <div className="card animate-pulse p-6">{t('admin.occurrences.loading')}</div>
      ) : items.length === 0 ? (
        <div className="card p-6 text-sm text-ink-mute">
          {t('admin.occurrences.emptyState')}
        </div>
      ) : (
        <ul className="card divide-y divide-gold/15 overflow-hidden">
          {items.map((occ) => (
            <li
              key={occ.id}
              className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-gold/[0.04]"
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center border bg-bg-card/80"
                style={{
                  borderColor: `${occ.event.accentColor ?? '#ffdb8a'}55`,
                  boxShadow: `0 0 12px -4px ${occ.event.accentColor ?? '#ffdb8a'}55`,
                }}
              >
                <img
                  src={occ.event.iconUrl ?? '/images/events/bear-hunt.png'}
                  alt=""
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-ink-cream font-medium leading-tight truncate">
                  {occ.event.shortName ?? occ.event.name}
                  {occ.phaseLabel && (
                    <span className="ml-2 text-[10px] tracking-widest uppercase text-gold-soft">
                      · {occ.phaseLabel}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-mute mt-0.5 tabular-nums">
                  {format(new Date(occ.startsAtUtc), "EEE d MMM yyyy · HH:mm 'UTC'")}
                  <span className="ml-2">· {t('admin.occurrences.durationMin', { count: occ.durationMinutes })}</span>
                  {occ.cancelled && <span className="ml-2 text-danger">{t('admin.occurrences.cancelled')}</span>}
                </div>
              </div>
              <Link
                to={`/admin/events/occurrences/${occ.id}/participants`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold tracking-widest uppercase text-gold-soft border border-gold/30 hover:bg-gold/10"
                aria-label={t('admin.occurrences.manageSquad')}
              >
                <UsersThree size={12} weight="duotone" /> {t('admin.occurrences.squads')}
              </Link>
              <button
                onClick={() => handleDelete(occ.id)}
                className="text-ink-mute hover:text-danger p-2"
                aria-label={t('admin.occurrences.delete')}
              >
                <Trash size={16} weight="duotone" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
