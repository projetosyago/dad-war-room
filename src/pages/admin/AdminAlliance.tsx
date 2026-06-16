import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  BookOpen,
  CaretRight,
  CheckCircle,
  Crown,
  FloppyDisk,
  Megaphone,
  ShieldStar,
  Trophy,
} from '@phosphor-icons/react'
import { useAllianceSettings } from '../../hooks/useAllianceSettings'
import { updateAllianceSettings } from '../../repositories/allianceSettings'

/**
 * Aliança admin hub — entry point for everything that edits public-facing
 * alliance state. Surfaces the Kingdom Timeline subroute so admins find it
 * (otherwise milestones become invisible after A2 nav refactor). Also hosts
 * the editor for the alliance_settings singleton (rank, motto, brand colors,
 * capture date) shown on /alliance.
 */
export function AdminAlliance() {
  const { t } = useTranslation()
  return (
    <div className="container-wide pt-6 sm:pt-12 pb-28 sm:pb-12">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" /> {t('admin.alliance.backToAdmin')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <ShieldStar size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.alliance.eyebrow')}</div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
            {t('admin.alliance.title')}
          </h1>
        </div>
      </header>

      {/* Live sub-tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <AdminAllianceCta
          to="/admin/alliance/timeline"
          icon={Crown}
          title={t('admin.alliance.cards.timeline.title')}
          subtitle={t('admin.alliance.cards.timeline.subtitle')}
        />
        <AdminAllianceCta
          to="/admin/alliance/catalogue"
          icon={BookOpen}
          title={t('admin.alliance.cards.catalogue.title')}
          subtitle={t('admin.alliance.cards.catalogue.subtitle')}
        />
        <AdminAllianceCta
          to="/admin/notifications"
          icon={Megaphone}
          title={t('admin.alliance.cards.announcements.title')}
          subtitle={t('admin.alliance.cards.announcements.subtitle')}
        />
      </div>

      <AllianceMetadataEditor />
    </div>
  )
}

function AllianceMetadataEditor() {
  const { t } = useTranslation()
  const { settings, loading, error, refetch } = useAllianceSettings()
  const [rank, setRank] = useState('')
  const [motto, setMotto] = useState('')
  const [tagline, setTagline] = useState('')
  const [brandPrimary, setBrandPrimary] = useState('')
  const [brandAccent, setBrandAccent] = useState('')
  const [capturedAt, setCapturedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!settings) return
    setRank(settings.rank ?? '')
    setMotto(settings.motto ?? '')
    setTagline(settings.tagline ?? '')
    setBrandPrimary(settings.brandPrimary ?? '')
    setBrandAccent(settings.brandAccent ?? '')
    setCapturedAt(settings.capturedAt ?? '')
  }, [settings])

  const onSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await updateAllianceSettings({
        rank: rank.trim() === '' ? null : rank.trim(),
        motto: motto.trim() === '' ? null : motto.trim(),
        tagline: tagline.trim() === '' ? null : tagline.trim(),
        brandPrimary: brandPrimary.trim() === '' ? null : brandPrimary.trim(),
        brandAccent: brandAccent.trim() === '' ? null : brandAccent.trim(),
        capturedAt: capturedAt.trim() === '' ? null : capturedAt.trim(),
      })
      setSavedAt(Date.now())
      await refetch()
    } catch (e) {
      setSaveError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card-hero card-hero--steel">
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
        <span className="icon-frame icon-frame--sm text-gold-soft">
          <Trophy size={18} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('admin.alliance.metadata.eyebrow')}</div>
          <h2 className="hero-title text-lg sm:text-xl mt-0.5">{t('admin.alliance.metadata.title')}</h2>
          <p className="text-xs text-ink-mute mt-1 leading-snug">
            <Trans
              i18nKey="admin.alliance.metadata.intro"
              components={{
                allianceLink: <Link to="/alliance" className="text-gold-soft hover:underline" />,
                c: <code className="text-gold-soft" />,
              }}
            />
          </p>
        </div>
      </div>

      <div className="px-5 sm:px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('admin.alliance.metadata.rankLabel')}>
          <input
            type="text"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            placeholder={t('admin.alliance.metadata.rankPlaceholder')}
            className="w-full rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
            disabled={loading || saving}
          />
        </Field>

        <Field label={t('admin.alliance.metadata.taglineLabel')}>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder={t('admin.alliance.metadata.taglinePlaceholder')}
            className="w-full rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
            disabled={loading || saving}
          />
        </Field>

        <Field label={t('admin.alliance.metadata.mottoLabel')} wide>
          <textarea
            value={motto}
            onChange={(e) => setMotto(e.target.value)}
            placeholder={t('admin.alliance.metadata.mottoPlaceholder')}
            rows={2}
            className="w-full rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none resize-none"
            disabled={loading || saving}
          />
        </Field>

        <Field label={t('admin.alliance.metadata.brandPrimaryLabel')}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={brandPrimary}
              onChange={(e) => setBrandPrimary(e.target.value)}
              placeholder="#f4cf73"
              className="w-full rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none font-mono"
              disabled={loading || saving}
            />
            <span
              aria-hidden
              className="h-9 w-9 rounded-md border border-gold/25 shrink-0"
              style={{ background: brandPrimary || 'transparent' }}
            />
          </div>
        </Field>

        <Field label={t('admin.alliance.metadata.brandAccentLabel')}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={brandAccent}
              onChange={(e) => setBrandAccent(e.target.value)}
              placeholder="#e25656"
              className="w-full rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none font-mono"
              disabled={loading || saving}
            />
            <span
              aria-hidden
              className="h-9 w-9 rounded-md border border-gold/25 shrink-0"
              style={{ background: brandAccent || 'transparent' }}
            />
          </div>
        </Field>

        <Field label={t('admin.alliance.metadata.capturedAtLabel')}>
          <input
            type="date"
            value={capturedAt}
            onChange={(e) => setCapturedAt(e.target.value)}
            className="w-full rounded-lg bg-bg-card border border-gold/20 px-3 py-2 text-sm text-ink-cream focus:border-gold/45 outline-none"
            disabled={loading || saving}
          />
        </Field>
      </div>

      <div className="card-foot flex items-center justify-between gap-3">
        <div className="text-[11px] text-ink-mute min-w-0">
          {error ? (
            <span className="text-crimson-glow">{t('admin.alliance.metadata.loadError', { message: error.message })}</span>
          ) : saveError ? (
            <span className="text-crimson-glow">{t('admin.alliance.metadata.saveError', { message: saveError })}</span>
          ) : savedAt ? (
            <span className="inline-flex items-center gap-1 text-gold-soft">
              <CheckCircle size={12} weight="duotone" /> {t('admin.alliance.metadata.saved')}
            </span>
          ) : settings ? (
            <span>{t('admin.alliance.metadata.updatedAt', { date: new Date(settings.updatedAt).toLocaleString() })}</span>
          ) : loading ? (
            <span>{t('admin.alliance.metadata.loading')}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={loading || saving}
          className="inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/12 px-3 py-1.5 text-xs font-medium text-gold-soft hover:bg-gold/18 disabled:opacity-50"
        >
          <FloppyDisk size={14} weight="duotone" />
          {saving ? t('admin.alliance.metadata.saving') : t('admin.alliance.metadata.save')}
        </button>
      </div>
    </section>
  )
}

function Field({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="eyebrow-mute block mb-1">{label}</span>
      {children}
    </label>
  )
}

function AdminAllianceCta({
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  to: string
  icon: typeof Crown
  title: string
  subtitle: string
}) {
  return (
    <Link
      to={to}
      className="card-elev p-4 sm:p-5 flex items-center gap-3 hover:border-gold/40 hover:-translate-y-0.5 transition-all group"
    >
      <span className="h-11 w-11 rounded-xl border border-gold/30 bg-gold/8 flex items-center justify-center shrink-0">
        <Icon size={18} weight="duotone" className="text-gold-soft" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display-clean text-sm sm:text-base text-ink-cream tracking-wider uppercase">
          {title}
        </div>
        <p className="text-[11px] text-ink-mute mt-0.5 leading-snug">{subtitle}</p>
      </div>
      <CaretRight
        size={15}
        weight="bold"
        className="text-ink-dim group-hover:text-gold-soft group-hover:translate-x-0.5 transition-all shrink-0"
      />
    </Link>
  )
}
