import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CheckCircle, PencilSimple, UserCircle, X } from '@phosphor-icons/react'
import { useAuth } from '../../hooks/useAuth'
import {
  updateMyProfile,
  changeMyPassword,
} from '../../repositories/accounts'
import {
  HERO_SLUGS,
  heroAvatarUrlForSlug,
  resolveAvatarUrl,
} from '../../lib/heroAvatar'
import { ImageUploadField } from '../ui/ImageUploadField'

type Status = { kind: 'ok'; msg: string } | { kind: 'err'; msg: string } | null

export function ProfileEditor() {
  const { t } = useTranslation()
  const auth = useAuth()
  const [editing, setEditing] = useState<'name' | 'pass' | 'avatar' | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  if (auth.status !== 'signed-in' || !auth.account) return null
  const account = auth.account

  function close() {
    setEditing(null)
    setStatus(null)
  }

  return (
    <div className="card-hero p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="icon-frame icon-frame--sm text-gold-soft">
          <UserCircle size={18} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('settings.profile.eyebrow')}</div>
          <h3 className="hero-title text-base sm:text-lg mt-0.5">@{account.username}</h3>
        </div>
      </div>

      <ul className="divide-y divide-gold/10">
        <ProfileRow
          label={t('settings.profile.displayName')}
          value={account.displayName ?? account.username}
          onEdit={() => setEditing('name')}
        />
        <ProfileRow
          label={t('settings.profile.password')}
          value="••••••••"
          onEdit={() => setEditing('pass')}
        />
        <ProfileRow
          label={t('settings.profile.avatar')}
          value={
            account.avatarImageUrl
              ? t('settings.profile.avatarValue.custom')
              : account.avatarHeroSlug
                ? t('settings.profile.avatarValue.hero', { slug: account.avatarHeroSlug })
                : t('settings.profile.avatarValue.default')
          }
          onEdit={() => setEditing('avatar')}
        />
      </ul>

      {status && (
        <div
          className={`text-xs rounded-md px-3 py-2 ${
            status.kind === 'ok'
              ? 'bg-gold/10 border border-gold/30 text-gold-soft'
              : 'bg-crimson/10 border border-crimson/30 text-crimson-glow'
          }`}
        >
          {status.kind === 'ok' && <CheckCircle size={12} weight="duotone" className="inline mr-1" />}
          {status.msg}
        </div>
      )}

      {editing === 'name' && (
        <NameEditor
          initial={account.displayName ?? account.username}
          busy={busy}
          onCancel={close}
          onSave={async (value) => {
            setBusy(true)
            setStatus(null)
            try {
              await updateMyProfile(account.id, { displayName: value })
              await auth.refresh()
              setStatus({ kind: 'ok', msg: t('settings.profile.feedback.displayNameUpdated') })
              setEditing(null)
            } catch (e) {
              setStatus({ kind: 'err', msg: (e as Error).message || t('settings.profile.feedback.failed') })
            } finally {
              setBusy(false)
            }
          }}
        />
      )}

      {editing === 'pass' && (
        <PasswordEditor
          busy={busy}
          onCancel={close}
          onSave={async (next) => {
            setBusy(true)
            setStatus(null)
            try {
              await changeMyPassword(next)
              setStatus({ kind: 'ok', msg: t('settings.profile.feedback.passwordChanged') })
              setEditing(null)
            } catch (e) {
              setStatus({ kind: 'err', msg: (e as Error).message || t('settings.profile.feedback.failed') })
            } finally {
              setBusy(false)
            }
          }}
        />
      )}

      {editing === 'avatar' && (
        <AvatarEditor
          account={account}
          busy={busy}
          onCancel={close}
          onPickHero={async (slug) => {
            setBusy(true)
            setStatus(null)
            try {
              await updateMyProfile(account.id, {
                avatarHeroSlug: slug,
                avatarImageUrl: null,
              })
              await auth.refresh()
              setStatus({ kind: 'ok', msg: t('settings.profile.feedback.avatarUpdated') })
              setEditing(null)
            } catch (e) {
              setStatus({ kind: 'err', msg: (e as Error).message || t('settings.profile.feedback.failedShort') })
            } finally {
              setBusy(false)
            }
          }}
          onSaveUrl={async (url) => {
            setBusy(true)
            setStatus(null)
            try {
              await updateMyProfile(account.id, {
                avatarImageUrl: url.trim() === '' ? null : url.trim(),
                avatarHeroSlug: null,
              })
              await auth.refresh()
              setStatus({ kind: 'ok', msg: t('settings.profile.feedback.avatarUpdated') })
              setEditing(null)
            } catch (e) {
              setStatus({ kind: 'err', msg: (e as Error).message || t('settings.profile.feedback.failedShort') })
            } finally {
              setBusy(false)
            }
          }}
          onClear={async () => {
            setBusy(true)
            setStatus(null)
            try {
              await updateMyProfile(account.id, {
                avatarImageUrl: null,
                avatarHeroSlug: null,
              })
              await auth.refresh()
              setStatus({ kind: 'ok', msg: t('settings.profile.feedback.avatarReset') })
              setEditing(null)
            } catch (e) {
              setStatus({ kind: 'err', msg: (e as Error).message || t('settings.profile.feedback.failedShort') })
            } finally {
              setBusy(false)
            }
          }}
        />
      )}
    </div>
  )
}

function ProfileRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: string
  onEdit: () => void
}) {
  const { t } = useTranslation()
  return (
    <li className="py-2.5 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] tracking-[0.28em] uppercase text-ink-mute">{label}</div>
        <div className="text-sm text-ink-cream truncate">{value}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-[10px] tracking-[0.28em] uppercase text-gold-soft hover:text-gold-glow inline-flex items-center gap-1 shrink-0"
      >
        <PencilSimple size={11} weight="duotone" /> {t('settings.profile.edit')}
      </button>
    </li>
  )
}

function NameEditor({
  initial,
  busy,
  onCancel,
  onSave,
}: {
  initial: string
  busy: boolean
  onCancel: () => void
  onSave: (value: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState(initial)
  return (
    <div className="rounded-lg border border-gold/25 p-3 space-y-2 bg-bg-card/60">
      <label className="text-[10px] tracking-[0.28em] uppercase text-gold-soft">{t('settings.profile.newDisplayName')}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={40}
        className="w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
      />
      <FormActions busy={busy} disabled={value.trim().length === 0 || value === initial} onCancel={onCancel} onSave={() => onSave(value.trim())} />
    </div>
  )
}

function PasswordEditor({
  busy,
  onCancel,
  onSave,
}: {
  busy: boolean
  onCancel: () => void
  onSave: (newPassword: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const tooShort = value.length > 0 && value.length < 8
  const mismatch = confirm.length > 0 && confirm !== value
  const canSave = value.length >= 8 && confirm === value
  return (
    <div className="rounded-lg border border-gold/25 p-3 space-y-2 bg-bg-card/60">
      <label className="text-[10px] tracking-[0.28em] uppercase text-gold-soft">{t('settings.profile.newPassword')}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="new-password"
        className="w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
      />
      {tooShort && <p className="text-[11px] text-crimson-glow">{t('settings.profile.passwordMinimum')}</p>}
      <label className="text-[10px] tracking-[0.28em] uppercase text-gold-soft pt-1 block">{t('settings.profile.confirm')}</label>
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        className="w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
      />
      {mismatch && <p className="text-[11px] text-crimson-glow">{t('settings.profile.passwordsDontMatch')}</p>}
      <FormActions busy={busy} disabled={!canSave} onCancel={onCancel} onSave={() => onSave(value)} />
    </div>
  )
}

function AvatarEditor({
  account,
  busy,
  onCancel,
  onPickHero,
  onSaveUrl,
  onClear,
}: {
  account: {
    id: string
    username: string
    avatarImageUrl: string | null
    avatarHeroSlug: string | null
  }
  busy: boolean
  onCancel: () => void
  onPickHero: (slug: string) => Promise<void>
  onSaveUrl: (url: string) => Promise<void>
  onClear: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'hero' | 'url'>(account.avatarImageUrl ? 'url' : 'hero')
  const [urlValue, setUrlValue] = useState(account.avatarImageUrl ?? '')
  const currentSlug = account.avatarHeroSlug
  const previewUrl = resolveAvatarUrl({
    uploadedUrl: account.avatarImageUrl,
    heroSlug: account.avatarHeroSlug,
    seed: account.username,
  })

  return (
    <div className="rounded-lg border border-gold/25 p-3 space-y-3 bg-bg-card/60">
      {/* Preview + tabs */}
      <div className="flex items-center gap-3">
        <span className="h-14 w-14 rounded-lg border border-gold/35 bg-bg overflow-hidden flex items-center justify-center">
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.28em] uppercase text-gold-soft">{t('settings.profile.preview')}</div>
          <div className="text-xs text-ink-cream truncate font-mono">{previewUrl}</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="text-[10px] tracking-widest uppercase text-crimson-glow hover:opacity-80 disabled:opacity-50"
          title={t('settings.profile.resetTooltip')}
        >
          {t('settings.profile.reset')}
        </button>
      </div>

      <div className="inline-flex rounded-md border border-gold/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setTab('hero')}
          className={`px-3 py-1.5 text-[11px] tracking-widest uppercase ${
            tab === 'hero' ? 'bg-gold/15 text-gold-soft' : 'text-ink-mute hover:text-ink-cream'
          }`}
        >
          {t('settings.profile.chooseHero')}
        </button>
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`px-3 py-1.5 text-[11px] tracking-widest uppercase border-l border-gold/20 ${
            tab === 'url' ? 'bg-gold/15 text-gold-soft' : 'text-ink-mute hover:text-ink-cream'
          }`}
        >
          {t('settings.profile.customImage')}
        </button>
      </div>

      {tab === 'hero' ? (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
          {HERO_SLUGS.map((slug) => {
            const active = currentSlug === slug
            const src = heroAvatarUrlForSlug(slug)!
            return (
              <button
                key={slug}
                type="button"
                onClick={() => onPickHero(slug)}
                disabled={busy}
                title={slug}
                className={`relative h-12 w-12 rounded-md border overflow-hidden transition-all ${
                  active
                    ? 'border-gold/60 bg-gold/15 scale-105 shadow-[0_0_10px_-2px_rgba(244,207,115,0.55)]'
                    : 'border-gold/15 bg-bg hover:border-gold/40'
                } disabled:opacity-60`}
              >
                <img src={src} alt={slug} className="h-full w-full object-cover" loading="lazy" />
                {active && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gold text-bg-deep flex items-center justify-center">
                    <Check size={9} weight="bold" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <ImageUploadField
            bucket="avatars"
            pathPrefix={account.id}
            value={null}
            onChange={(url) => {
              if (url) void onSaveUrl(url)
            }}
            label={t('settings.profile.uploadImage')}
          />
          <div className="relative flex items-center gap-2">
            <span className="h-px flex-1 bg-gold/15" />
            <span className="text-[10px] tracking-[0.28em] uppercase text-ink-mute">{t('settings.profile.or')}</span>
            <span className="h-px flex-1 bg-gold/15" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.28em] uppercase text-gold-soft">{t('settings.profile.imageUrl')}</label>
            <input
              type="url"
              value={urlValue}
              placeholder="https://…/avatar.png"
              onChange={(e) => setUrlValue(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream focus:border-gold/45 outline-none"
            />
            <p className="text-[10px] text-ink-mute">
              {t('settings.profile.imageUrlHint')}
            </p>
            <FormActions
              busy={busy}
              disabled={urlValue.trim() === (account.avatarImageUrl ?? '')}
              onCancel={onCancel}
              onSave={() => onSaveUrl(urlValue)}
            />
          </div>
        </div>
      )}

      {tab === 'hero' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
          >
            <X size={11} weight="bold" /> {t('settings.profile.close')}
          </button>
        </div>
      )}
    </div>
  )
}

function FormActions({
  busy,
  disabled,
  onCancel,
  onSave,
  clearLabel,
  onClear,
}: {
  busy: boolean
  disabled: boolean
  onCancel: () => void
  onSave: () => void
  clearLabel?: string
  onClear?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1 text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
      >
        <X size={11} weight="bold" /> {t('settings.profile.cancel')}
      </button>
      {clearLabel && onClear && (
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="ml-auto inline-flex items-center text-[11px] tracking-widest uppercase text-crimson-glow hover:opacity-90 disabled:opacity-50"
        >
          {clearLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={busy || disabled}
        className={`${clearLabel ? '' : 'ml-auto'} inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {busy ? '…' : t('settings.profile.save')}
      </button>
    </div>
  )
}
