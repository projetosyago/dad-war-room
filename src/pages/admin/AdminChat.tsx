import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ChatCircle,
  Hourglass,
  Image as ImageIcon,
  ShieldCheck,
  Trash,
  Warning,
} from '@phosphor-icons/react'

/**
 * Chat moderation panel. The backend (table + Realtime channel) ships in
 * Fase Y; this UI is wired against a local config object today so the panel
 * is meaningful immediately — once the chat lands, swap the persistence
 * layer for the `chat_settings` table without touching the UI.
 */

const STORAGE_KEY = 'dad-war-room.chat-config'

interface ChatConfig {
  messagesPerHour: number          // per-user soft cap
  minSecondsBetweenMessages: number
  maxFileSizeMb: number
  imagesAllowed: boolean
}

const DEFAULT_CONFIG: ChatConfig = {
  messagesPerHour: 60,
  minSecondsBetweenMessages: 3,
  maxFileSizeMb: 5,
  imagesAllowed: true,
}

function loadConfig(): ChatConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

function saveConfig(c: ChatConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}

export function AdminChat() {
  const { t } = useTranslation()
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG)
  const [dirty, setDirty] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    setConfig(loadConfig())
  }, [])

  function patch(p: Partial<ChatConfig>) {
    setConfig((c) => ({ ...c, ...p }))
    setDirty(true)
  }

  function save() {
    saveConfig(config)
    setDirty(false)
    setSavedAt(new Date())
  }

  function reset() {
    setConfig(DEFAULT_CONFIG)
    setDirty(true)
  }

  function clearAll() {
    // Backend wiring (Fase Y) goes here: DELETE FROM chat_messages
    setConfirmingClear(false)
    setSavedAt(new Date())
  }

  return (
    <div className="container-wide pt-6 sm:pt-12 pb-28 sm:pb-12">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-gold mb-4"
      >
        <ArrowLeft size={14} weight="bold" /> {t('admin.chat.backToAdmin')}
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-gold/12 border border-gold/35 flex items-center justify-center">
          <ChatCircle size={18} weight="duotone" className="text-gold-soft" />
        </span>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft">{t('admin.chat.eyebrow')}</div>
          <h1 className="font-display-clean text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
            {t('admin.chat.title')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[10px] tracking-[0.28em] uppercase text-crimson-glow">
              {t('admin.chat.unsaved')}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShieldCheck size={13} weight="duotone" /> {t('admin.chat.save')}
          </button>
        </div>
      </header>

      {savedAt && (
        <div className="text-[11px] text-gold-soft mb-4">
          {t('admin.chat.savedAt', { time: savedAt.toLocaleTimeString() })}
        </div>
      )}

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <ConfigCard
          icon={Hourglass}
          title={t('admin.chat.rateLimit.title')}
          subtitle={t('admin.chat.rateLimit.subtitle')}
        >
          <NumberRow
            label={t('admin.chat.rateLimit.messagesPerHour')}
            value={config.messagesPerHour}
            min={1}
            max={1000}
            onChange={(v) => patch({ messagesPerHour: v })}
          />
          <NumberRow
            label={t('admin.chat.rateLimit.minSeconds')}
            value={config.minSecondsBetweenMessages}
            min={0}
            max={120}
            onChange={(v) => patch({ minSecondsBetweenMessages: v })}
            suffix="s"
          />
        </ConfigCard>

        <ConfigCard
          icon={ImageIcon}
          title={t('admin.chat.attachments.title')}
          subtitle={t('admin.chat.attachments.subtitle')}
        >
          <ToggleRow
            label={t('admin.chat.attachments.allowImages')}
            checked={config.imagesAllowed}
            onChange={(v) => patch({ imagesAllowed: v })}
          />
          <NumberRow
            label={t('admin.chat.attachments.maxFileSize')}
            value={config.maxFileSizeMb}
            min={1}
            max={50}
            suffix="MB"
            onChange={(v) => patch({ maxFileSizeMb: v })}
          />
        </ConfigCard>

        <ConfigCard
          icon={Trash}
          title={t('admin.chat.purge.title')}
          subtitle={t('admin.chat.purge.subtitle')}
          tone="danger"
        >
          {!confirmingClear ? (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] bg-crimson/15 border border-crimson/40 text-crimson-glow hover:bg-crimson/25"
            >
              <Trash size={13} weight="duotone" /> {t('admin.chat.purge.clearAll')}
            </button>
          ) : (
            <div className="rounded-lg border border-crimson/45 bg-crimson/10 px-3 py-2.5 text-xs text-ink-cream">
              <p className="font-semibold mb-2 inline-flex items-center gap-1.5 text-crimson-glow">
                <Warning size={13} weight="duotone" /> {t('admin.chat.purge.confirmHeading')}
              </p>
              <p className="mb-3 text-ink-paper">
                {t('admin.chat.purge.confirmBody')}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase text-ink-mute hover:text-ink-cream"
                >
                  {t('admin.chat.purge.cancel')}
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="ml-auto px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase bg-crimson/25 border border-crimson/50 text-crimson-glow hover:bg-crimson/40"
                >
                  {t('admin.chat.purge.confirmYes')}
                </button>
              </div>
            </div>
          )}
        </ConfigCard>

        <ConfigCard
          icon={ShieldCheck}
          title={t('admin.chat.defaults.title')}
          subtitle={t('admin.chat.defaults.subtitle')}
        >
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] bg-bg-card border border-gold/30 text-ink-cream hover:border-gold/45"
          >
            {t('admin.chat.defaults.restore')}
          </button>
        </ConfigCard>
      </div>

      <p className="mt-6 text-[11px] text-ink-mute leading-relaxed">
        {t('admin.chat.footnote')}
      </p>
    </div>
  )
}

function ConfigCard({
  icon: Icon,
  title,
  subtitle,
  tone = 'gold',
  children,
}: {
  icon: typeof ChatCircle
  title: string
  subtitle: string
  tone?: 'gold' | 'danger'
  children: React.ReactNode
}) {
  const border = tone === 'danger' ? 'border-crimson/30' : 'border-gold/20'
  return (
    <section className={`card-elev p-4 sm:p-5 border ${border}`}>
      <header className="flex items-start gap-2 mb-3">
        <span
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
            tone === 'danger'
              ? 'bg-crimson/10 border-crimson/40 text-crimson-glow'
              : 'bg-gold/10 border-gold/30 text-gold-soft'
          }`}
        >
          <Icon size={14} weight="duotone" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display-clean text-sm text-ink-cream tracking-wider uppercase">
            {title}
          </h3>
          <p className="text-[11px] text-ink-mute mt-0.5 leading-snug">{subtitle}</p>
        </div>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function NumberRow({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="flex-1 text-xs text-ink-cream">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 px-2 py-1.5 rounded-md bg-bg-card border border-gold/25 text-sm text-ink-cream text-right tabular-nums focus:border-gold/45 outline-none"
      />
      {suffix && <span className="text-[11px] text-ink-mute w-6">{suffix}</span>}
    </label>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <span className="flex-1 text-xs text-ink-cream">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-gold/40' : 'bg-bg-card border border-gold/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink-cream transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}
