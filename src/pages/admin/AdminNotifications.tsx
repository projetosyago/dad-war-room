import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  BellRinging,
  CalendarBlank,
  CheckCircle,
  Image as ImageIcon,
  PaperPlaneTilt,
  RocketLaunch,
  Smiley,
  Target,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react'
import { ImageUploadField } from '../../components/ui/ImageUploadField'
import { useAuth } from '../../hooks/useAuth'
import { useRecentPushMessages } from '../../hooks/useNotifications'
import {
  createPushMessage,
  sendPushImmediately,
  type PushAudience,
  type PushTapTarget,
} from '../../repositories/notifications'

type Schedule = 'now' | 'later' | 'recurring'

interface DraftNotification {
  title: string
  body: string
  emoji: string
  imageUrl: string
  audience: PushAudience
  schedule: Schedule
  scheduledAt: string
  recurrenceRule: string
  tapTarget: PushTapTarget
  tapUrl: string
}

const EMOJIS = ['🐻', '⚔️', '🛡️', '🔔', '👑', '🏰', '🪙', '📣', '✨', '🔥']

const AUDIENCE_LABEL_KEYS: Record<PushAudience, string> = {
  all: 'admin.notifications.audience.all',
  voting: 'admin.notifications.audience.voting',
  admins: 'admin.notifications.audience.admins',
  allies: 'admin.notifications.audience.allies',
  custom: 'admin.notifications.audience.custom',
}

const SCHEDULE_LABEL_KEYS: Record<Schedule, string> = {
  now: 'admin.notifications.schedule.now',
  later: 'admin.notifications.schedule.later',
  recurring: 'admin.notifications.schedule.recurring',
}

const TAP_LABEL_KEYS: Record<PushTapTarget, string> = {
  hub: 'admin.notifications.tap.hub',
  events: 'admin.notifications.tap.events',
  polls: 'admin.notifications.tap.polls',
  alliance: 'admin.notifications.tap.alliance',
  url: 'admin.notifications.tap.url',
}

const DEFAULT_DRAFT: DraftNotification = {
  title: '',
  body: '',
  emoji: '🐻',
  imageUrl: '',
  audience: 'voting',
  schedule: 'now',
  scheduledAt: '',
  recurrenceRule: '',
  tapTarget: 'hub',
  tapUrl: '',
}

export function AdminNotifications() {
  const { t } = useTranslation()
  const auth = useAuth()
  const { messages, loading: loadingMessages, refetch } = useRecentPushMessages(20)

  const [draft, setDraft] = useState<DraftNotification>(DEFAULT_DRAFT)
  const [sentAt, setSentAt] = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function patch(p: Partial<DraftNotification>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  const canSend = useMemo(() => {
    const hasContent = draft.title.trim() && draft.body.trim()
    if (!hasContent) return false
    if (draft.schedule === 'later' && !draft.scheduledAt) return false
    if (draft.schedule === 'recurring' && !draft.recurrenceRule.trim()) return false
    if (draft.tapTarget === 'url' && !draft.tapUrl.trim()) return false
    return true
  }, [draft])

  async function send() {
    if (!canSend || submitting) return
    const createdBy = auth.account?.id ?? auth.user?.id
    if (!createdBy) {
      setSubmitError(t('admin.notifications.errors.mustBeSignedIn'))
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const scheduledFor =
        draft.schedule === 'later' && draft.scheduledAt
          ? new Date(draft.scheduledAt).toISOString()
          : null
      const recurrenceRule =
        draft.schedule === 'recurring' && draft.recurrenceRule.trim()
          ? draft.recurrenceRule.trim()
          : null

      const message = await createPushMessage({
        title: draft.title.trim(),
        body: draft.body.trim(),
        emoji: draft.emoji || null,
        imageUrl: draft.imageUrl.trim() || null,
        audience: draft.audience,
        tapTarget: draft.tapTarget,
        tapUrl: draft.tapTarget === 'url' ? draft.tapUrl.trim() || null : null,
        scheduledFor,
        recurrenceRule,
        createdBy,
      })

      if (draft.schedule === 'now') {
        await sendPushImmediately(message.id)
      }

      setSentAt(new Date())
      setDraft(DEFAULT_DRAFT)
      await refetch()
    } catch (e) {
      setSubmitError((e as Error).message || t('admin.notifications.errors.failedToSend'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-wide pt-6 sm:pt-12 pb-28 sm:pb-12">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" /> {t('admin.notifications.backToAdmin')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <BellRinging size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.notifications.eyebrow')}</div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
            {t('admin.notifications.title')}
          </h1>
        </div>
      </header>

      {sentAt && (
        <div className="card border-gold/40 p-3 text-xs text-gold-soft mb-4 flex items-center gap-2">
          <CheckCircle size={13} weight="duotone" />
          {t('admin.notifications.pushedTo', {
            audience: t(AUDIENCE_LABEL_KEYS[draft.audience]).toLowerCase(),
            time: sentAt.toLocaleTimeString(),
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-4 sm:gap-5">
        {/* Editor */}
        <section className="card-elev p-4 sm:p-5 space-y-4">
          <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.notifications.compose')}</h2>

          <div>
            <label className="text-[10px] tracking-[0.28em] uppercase text-ink-mute">{t('admin.notifications.titleLabel')}</label>
            <input
              type="text"
              value={draft.title}
              maxLength={60}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={t('admin.notifications.titlePlaceholder')}
              className="mt-1 w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
            />
            <div className="text-right text-[10px] text-ink-mute mt-0.5">{draft.title.length}/60</div>
          </div>

          <div>
            <label className="text-[10px] tracking-[0.28em] uppercase text-ink-mute">{t('admin.notifications.bodyLabel')}</label>
            <textarea
              value={draft.body}
              rows={4}
              maxLength={240}
              onChange={(e) => patch({ body: e.target.value })}
              placeholder={t('admin.notifications.bodyPlaceholder')}
              className="mt-1 w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none resize-none"
            />
            <div className="text-right text-[10px] text-ink-mute mt-0.5">{draft.body.length}/240</div>
          </div>

          <div>
            <label className="text-[10px] tracking-[0.28em] uppercase text-ink-mute flex items-center gap-1.5">
              <Smiley size={11} weight="duotone" /> {t('admin.notifications.emojiLabel')}
            </label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => patch({ emoji: e })}
                  className={`h-9 w-9 rounded-md border text-lg flex items-center justify-center transition-colors ${
                    draft.emoji === e
                      ? 'border-gold/45 bg-gold/12'
                      : 'border-gold/15 bg-bg-card hover:border-gold/30'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.28em] uppercase text-ink-mute flex items-center gap-1.5">
              <ImageIcon size={11} weight="duotone" /> {t('admin.notifications.imageLabel')}
            </label>
            <ImageUploadField
              bucket="notification-images"
              pathPrefix="notif-"
              value={draft.imageUrl || null}
              onChange={(url) => patch({ imageUrl: url ?? '' })}
              label={t('admin.notifications.uploadImage')}
              disabled={submitting}
            />
            <div className="text-[10px] tracking-[0.28em] uppercase text-ink-mute">
              {t('admin.notifications.orPasteUrl')}
            </div>
            <input
              type="url"
              value={draft.imageUrl}
              placeholder={t('admin.notifications.imageUrlPlaceholder')}
              onChange={(e) => patch({ imageUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] tracking-[0.28em] uppercase text-ink-mute flex items-center gap-1.5">
                <UsersThree size={11} weight="duotone" /> {t('admin.notifications.audienceLabel')}
              </label>
              <select
                value={draft.audience}
                onChange={(e) => patch({ audience: e.target.value as PushAudience })}
                className="mt-1 w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
              >
                {Object.entries(AUDIENCE_LABEL_KEYS).map(([k, v]) => (
                  <option key={k} value={k}>{t(v)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.28em] uppercase text-ink-mute flex items-center gap-1.5">
                <Target size={11} weight="duotone" /> {t('admin.notifications.tapTargetLabel')}
              </label>
              <select
                value={draft.tapTarget}
                onChange={(e) => patch({ tapTarget: e.target.value as PushTapTarget })}
                className="mt-1 w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
              >
                {Object.entries(TAP_LABEL_KEYS).map(([k, v]) => (
                  <option key={k} value={k}>{t(v)}</option>
                ))}
              </select>
              {draft.tapTarget === 'url' && (
                <input
                  type="url"
                  value={draft.tapUrl}
                  placeholder={t('admin.notifications.tapUrlPlaceholder')}
                  onChange={(e) => patch({ tapUrl: e.target.value })}
                  className="mt-2 w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] tracking-[0.28em] uppercase text-ink-mute flex items-center gap-1.5">
              <CalendarBlank size={11} weight="duotone" /> {t('admin.notifications.scheduleLabel')}
            </label>
            <div className="mt-1 flex gap-2">
              {(Object.keys(SCHEDULE_LABEL_KEYS) as Schedule[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => patch({ schedule: s })}
                  className={`flex-1 px-3 py-2 rounded-md border text-[11px] tracking-widest uppercase ${
                    draft.schedule === s
                      ? 'border-gold/45 bg-gold/12 text-gold-soft'
                      : 'border-gold/15 bg-bg-card text-ink-cream hover:border-gold/30'
                  }`}
                >
                  {t(SCHEDULE_LABEL_KEYS[s])}
                </button>
              ))}
            </div>
            {draft.schedule === 'later' && (
              <input
                type="datetime-local"
                value={draft.scheduledAt}
                onChange={(e) => patch({ scheduledAt: e.target.value })}
                className="mt-2 w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
              />
            )}
            {draft.schedule === 'recurring' && (
              <input
                type="text"
                value={draft.recurrenceRule}
                placeholder={t('admin.notifications.recurrencePlaceholder')}
                onChange={(e) => patch({ recurrenceRule: e.target.value })}
                className="mt-2 w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
              />
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gold/12">
            <button
              type="button"
              onClick={() => {
                setDraft(DEFAULT_DRAFT)
                setSubmitError(null)
              }}
              disabled={submitting}
              className="text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('admin.notifications.discard')}
            </button>
            <button
              type="button"
              disabled={!canSend || submitting}
              onClick={() => {
                void send()
              }}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] bg-gold/20 border border-gold/45 text-gold-soft hover:bg-gold/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {draft.schedule === 'now' ? (
                <>
                  <PaperPlaneTilt size={13} weight="duotone" /> {submitting ? t('admin.notifications.sending') : t('admin.notifications.send')}
                </>
              ) : (
                <>
                  <RocketLaunch size={13} weight="duotone" /> {submitting ? t('admin.notifications.scheduling') : t('admin.notifications.scheduleAction')}
                </>
              )}
            </button>
          </div>

          {submitError && (
            <div className="rounded-md border border-crimson/40 bg-crimson/10 p-3 text-xs text-crimson-glow flex items-start gap-2">
              <WarningCircle size={13} weight="duotone" className="mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </section>

        {/* Preview + history */}
        <aside className="space-y-4">
          <div className="card-elev p-4">
            <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-2">{t('admin.notifications.preview')}</h3>
            <div className="rounded-xl border border-gold/25 bg-bg-card/80 p-3 flex items-start gap-3">
              <span className="h-9 w-9 rounded-md bg-gold/10 border border-gold/25 text-xl flex items-center justify-center shrink-0">
                {draft.emoji || '🔔'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-ink-mute flex items-center justify-between gap-2">
                  <span>DAD War Room</span>
                  <span>{t('admin.notifications.previewNow')}</span>
                </div>
                <div className="text-sm font-semibold text-ink-cream truncate">
                  {draft.title || t('admin.notifications.previewDefaultTitle')}
                </div>
                <div className="text-[12px] text-ink-paper line-clamp-3 mt-0.5">
                  {draft.body || t('admin.notifications.previewDefaultBody')}
                </div>
                {draft.imageUrl && (
                  <img
                    src={draft.imageUrl}
                    alt=""
                    className="mt-2 w-full h-24 object-cover rounded-md border border-gold/15"
                  />
                )}
              </div>
            </div>
            <p className="text-[10px] text-ink-mute mt-2">
              {t('admin.notifications.targetArrow')} {t(TAP_LABEL_KEYS[draft.tapTarget])}{draft.tapTarget === 'url' && draft.tapUrl ? ` · ${draft.tapUrl}` : ''}
            </p>
          </div>

          <div className="card-elev p-4">
            <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-2">{t('admin.notifications.recentPushes')}</h3>
            {loadingMessages ? (
              <div className="py-6 text-center text-[11px] text-ink-mute">{t('admin.notifications.loading')}</div>
            ) : messages.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-ink-mute">
                {t('admin.notifications.noneSent')}
              </div>
            ) : (
              <ul className="divide-y divide-gold/10">
                {messages.map((m) => {
                  const sent = m.sentAt ?? m.createdAt
                  const openRate =
                    m.delivered > 0 ? Math.round((m.opened / m.delivered) * 100) : 0
                  return (
                    <li key={m.id} className="py-2.5">
                      <div className="text-sm text-ink-cream truncate">{m.title}</div>
                      <div className="text-[10px] text-ink-mute flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{new Date(sent).toLocaleString()}</span>
                        <span>·</span>
                        <span>{t(AUDIENCE_LABEL_KEYS[m.audience])}</span>
                      </div>
                      <div className="text-[11px] mt-1.5 flex items-center gap-3">
                        <span className="text-gold-soft">
                          {t('admin.notifications.deliveredCount', { count: m.delivered })}
                        </span>
                        <span className="text-ink-paper">
                          {t('admin.notifications.openedCount', { count: m.opened, pct: openRate })}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
