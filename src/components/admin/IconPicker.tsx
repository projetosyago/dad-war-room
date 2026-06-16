import { useState } from 'react'
import { Check, X } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { ImageUploadField } from '../ui/ImageUploadField'

/**
 * Browse-and-pick over /public/images assets. Lets the admin choose a built-in
 * icon for a milestone (or any asset-typed entity) OR paste a custom URL.
 * Emits the chosen path string via onChange. Empty string = "no override".
 *
 * Salles 2026-06-15: this resolves the "preciso escolher/mudar/upar o ícone".
 */

interface IconGroup {
  labelKey: string
  paths: string[]
}

const GROUPS: IconGroup[] = [
  {
    labelKey: 'admin.iconPicker.groups.truegoldTiers',
    paths: ['tg1', 'tg2', 'tg3', 'tg4', 'tg5', 'tg6', 'tg7', 'tg8'].map(
      (t) => `/images/tiers/${t}.png`,
    ),
  },
  {
    labelKey: 'admin.iconPicker.groups.items',
    paths: [
      '/images/items/truegold.png',
      '/images/items/truegold-dust.png',
      '/images/items/truegold-tempered.png',
      '/images/items/hero-xp.png',
      '/images/items/gold.png',
    ],
  },
  {
    labelKey: 'admin.iconPicker.groups.buildings',
    paths: [
      '/images/buildings/town-center.png',
      '/images/buildings/town-center-tg.png',
      '/images/buildings/hero-hall.png',
      '/images/buildings/war-academy.png',
      '/images/buildings/barracks.png',
      '/images/buildings/truegold-barracks.png',
      '/images/buildings/range.png',
      '/images/buildings/truegold-range.png',
      '/images/buildings/stable.png',
      '/images/buildings/truegold-stable.png',
      '/images/buildings/truegold-crucible.png',
    ],
  },
  {
    labelKey: 'admin.iconPicker.groups.events',
    paths: [
      '/images/events/bear-hunt.png',
      '/images/events/kvk.png',
      '/images/events/viking-vengeance.png',
      '/images/events/tri-alliance.png',
      '/images/events/cesars-fury.png',
      '/images/events/swordland-showdown.png',
    ],
  },
  {
    labelKey: 'admin.iconPicker.groups.heroes',
    paths: [
      'alcar', 'amadeus', 'amane', 'ava', 'charles', 'chenko', 'diana', 'edwin',
      'eric', 'fahd', 'forrest', 'gordon', 'helga', 'hilde', 'howard', 'jabel',
      'jaegar', 'long-fei', 'margot', 'marlin', 'olive', 'petra', 'quinn', 'rosa',
      'saul', 'seth', 'sophia', 'thrud', 'triton', 'wee-woo', 'yang', 'yeonwoo', 'zoe',
    ].map((slug) => `/images/heroes/${slug}.png`),
  },
]

export interface IconPickerProps {
  value: string | null
  onChange: (path: string | null) => void
  /** Optional: a system-suggested path so the admin can revert to "auto". */
  defaultSuggestion?: string | null
}

export function IconPicker({ value, onChange, defaultSuggestion }: IconPickerProps) {
  const { t } = useTranslation()
  const [customUrl, setCustomUrl] = useState<string>(
    value && !value.startsWith('/images/') ? value : '',
  )

  function pick(path: string) {
    onChange(path)
    setCustomUrl('')
  }

  function applyCustom() {
    const u = customUrl.trim()
    onChange(u === '' ? null : u)
  }

  return (
    <div className="rounded-lg border border-gold/20 bg-bg-card/60 p-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 rounded-md border border-gold/35 bg-bg flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="" className="h-8 w-8 object-contain" />
          ) : defaultSuggestion ? (
            <img src={defaultSuggestion} alt="" className="h-8 w-8 object-contain opacity-50" />
          ) : (
            <X size={14} weight="bold" className="text-ink-mute" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-widest uppercase text-ink-mute">{t('admin.iconPicker.currentIcon')}</div>
          <div className="text-xs text-ink-cream truncate font-mono">
            {value ?? (defaultSuggestion ? t('admin.iconPicker.autoLabel', { path: defaultSuggestion }) : t('admin.iconPicker.noOverride'))}
          </div>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] tracking-widest uppercase text-crimson-glow hover:opacity-80"
          >
            {t('admin.iconPicker.clear')}
          </button>
        )}
      </div>

      {GROUPS.map((g) => (
        <div key={g.labelKey}>
          <div className="text-[10px] tracking-widest uppercase text-ink-mute mb-1.5">{t(g.labelKey)}</div>
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
            {g.paths.map((p) => {
              const active = value === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => pick(p)}
                  title={p.split('/').pop()}
                  className={`relative h-10 w-10 rounded-md border flex items-center justify-center overflow-hidden transition-all ${
                    active
                      ? 'border-gold/60 bg-gold/15 scale-105'
                      : 'border-gold/15 bg-bg hover:border-gold/40'
                  }`}
                >
                  <img src={p} alt="" className="h-8 w-8 object-contain" loading="lazy" />
                  {active && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gold text-bg-deep flex items-center justify-center">
                      <Check size={9} weight="bold" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="pt-1 border-t border-gold/10">
        <div className="text-[10px] tracking-widest uppercase text-ink-mute mb-1">
          {t('admin.iconPicker.customUrlLabel')}
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder={t('admin.iconPicker.customUrlPlaceholder')}
            className="flex-1 rounded-md bg-bg-card border border-gold/20 px-3 py-1.5 text-xs text-ink-cream focus:border-gold/45 outline-none"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="px-3 py-1.5 rounded-md text-[11px] tracking-widest uppercase bg-gold/15 border border-gold/40 text-gold-soft hover:bg-gold/25"
          >
            {t('admin.iconPicker.apply')}
          </button>
        </div>
      </div>

      <div className="pt-1 border-t border-gold/10">
        <ImageUploadField
          bucket="milestone-bodies"
          pathPrefix="milestone-icons"
          value={null}
          onChange={(url) => {
            if (url) {
              onChange(url)
              setCustomUrl('')
            }
          }}
          label={t('admin.iconPicker.uploadOwn')}
        />
      </div>
    </div>
  )
}
