import { useMemo, useState } from 'react'
import { Check, X, MagnifyingGlass } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { ImageUploadField } from '../ui/ImageUploadField'
import {
  ICON_GROUPS,
  ALL_ICON_ENTRIES,
  ICON_LIBRARY_COUNT,
  findIconEntry,
  type IconEntry,
  type IconGroupKey,
} from '../../data/icon-library'

/**
 * Admin icon picker.
 *
 * Three input modes (stacked, all optional):
 *   1. Browse the curated + scraped library (~500 icons across ~20 groups,
 *      grouped by rarity / generation / category, filterable by free-text).
 *   2. Paste a custom URL.
 *   3. Upload your own asset to the milestone-bodies bucket.
 *
 * Emits the chosen URL via `onChange`. Empty / null = "no override".
 *
 * Per Salles 2026-06-17, this is what the rich-text fields will pull from
 * when picking inline icons (skill books, hero portraits, gear, etc).
 */

export interface IconPickerProps {
  value: string | null
  onChange: (path: string | null) => void
  /** Optional: a system-suggested path so the admin can revert to "auto". */
  defaultSuggestion?: string | null
}

const COLLAPSED_PER_GROUP = 18 // show this many before "Show more"

export function IconPicker({ value, onChange, defaultSuggestion }: IconPickerProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState<IconGroupKey | 'all'>('all')
  const [expanded, setExpanded] = useState<Set<IconGroupKey>>(new Set())
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

  function toggleExpanded(key: IconGroupKey) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Filter the library: by group (all = no filter) + by search term.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return ICON_GROUPS.filter((g) => activeGroup === 'all' || g.key === activeGroup)
      .map((g) => ({
        ...g,
        entries: term
          ? g.entries.filter((e) => e.searchKey.includes(term))
          : g.entries,
      }))
      .filter((g) => g.entries.length > 0)
  }, [search, activeGroup])

  const totalMatched = filtered.reduce((s, g) => s + g.entries.length, 0)
  const currentEntry = value ? findIconEntry(value) : null

  return (
    <div className="rounded-lg border border-gold/20 bg-bg-card/60 p-3 space-y-3">
      {/* Current selection preview */}
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 rounded-md border border-gold/35 bg-bg flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="" className="h-8 w-8 object-contain" />
          ) : defaultSuggestion ? (
            <img
              src={defaultSuggestion}
              alt=""
              className="h-8 w-8 object-contain opacity-50"
            />
          ) : (
            <X size={14} weight="bold" className="text-ink-mute" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-widest uppercase text-ink-mute">
            {t('admin.iconPicker.currentIcon')}
          </div>
          <div className="text-xs text-ink-cream truncate font-mono">
            {value
              ? currentEntry?.label ?? value
              : defaultSuggestion
                ? t('admin.iconPicker.autoLabel', { path: defaultSuggestion })
                : t('admin.iconPicker.noOverride')}
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

      {/* Search + group pills */}
      <div className="space-y-2">
        <div className="relative">
          <MagnifyingGlass
            size={14}
            weight="bold"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.iconPicker.searchPlaceholder', {
              defaultValue: `Search ${ICON_LIBRARY_COUNT} icons…`,
            })}
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-bg-card border border-gold/20 text-xs text-ink-cream placeholder:text-ink-mute focus:border-gold/45 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <GroupPill
            label={t('admin.iconPicker.allGroups', { defaultValue: 'All' })}
            count={ALL_ICON_ENTRIES.length}
            active={activeGroup === 'all'}
            onClick={() => setActiveGroup('all')}
          />
          {ICON_GROUPS.map((g) => (
            <GroupPill
              key={g.key}
              label={t(g.labelKey)}
              count={g.entries.length}
              active={activeGroup === g.key}
              onClick={() => setActiveGroup(g.key)}
            />
          ))}
        </div>

        <div className="text-[10px] text-ink-mute">
          {t('admin.iconPicker.matchCount', {
            defaultValue: '{{count}} matching',
            count: totalMatched,
          })}
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {filtered.map((g) => {
          const isExpanded = expanded.has(g.key) || search.length > 0
          const visibleEntries = isExpanded
            ? g.entries
            : g.entries.slice(0, COLLAPSED_PER_GROUP)
          const hiddenCount = g.entries.length - visibleEntries.length
          return (
            <section key={g.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] tracking-widest uppercase text-ink-mute">
                  {t(g.labelKey)}{' '}
                  <span className="text-ink-dim">({g.entries.length})</span>
                </div>
                {!search && g.entries.length > COLLAPSED_PER_GROUP && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(g.key)}
                    className="text-[10px] tracking-widest uppercase text-gold-soft hover:text-gold"
                  >
                    {isExpanded
                      ? t('admin.iconPicker.collapse', { defaultValue: 'Less' })
                      : t('admin.iconPicker.expand', {
                          defaultValue: `Show ${hiddenCount} more`,
                          count: hiddenCount,
                        })}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-1.5">
                {visibleEntries.map((entry) => (
                  <IconTile
                    key={entry.path}
                    entry={entry}
                    active={value === entry.path}
                    onPick={pick}
                  />
                ))}
              </div>
            </section>
          )
        })}
        {filtered.length === 0 && (
          <div className="rounded-md border border-gold/15 bg-bg/30 px-3 py-4 text-center text-xs text-ink-mute">
            {t('admin.iconPicker.noMatch', {
              defaultValue: 'No icons match this search.',
            })}
          </div>
        )}
      </div>

      {/* Custom URL */}
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

      {/* Upload your own */}
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

function GroupPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] tracking-widest uppercase transition-colors ${
        active
          ? 'border-gold/55 bg-gold/15 text-gold'
          : 'border-gold/15 bg-bg-card/40 text-ink-mute hover:border-gold/35 hover:text-gold-soft'
      }`}
    >
      <span>{label}</span>
      <span className={active ? 'text-gold-soft' : 'text-ink-dim'}>{count}</span>
    </button>
  )
}

function IconTile({
  entry,
  active,
  onPick,
}: {
  entry: IconEntry
  active: boolean
  onPick: (path: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(entry.path)}
      title={`${entry.label}\n${entry.path}`}
      className={`relative h-10 w-10 rounded-md border flex items-center justify-center overflow-hidden transition-all ${
        active
          ? 'border-gold/60 bg-gold/15 scale-105'
          : 'border-gold/15 bg-bg hover:border-gold/40'
      }`}
    >
      <img
        src={entry.path}
        alt={entry.label}
        className="h-8 w-8 object-contain"
        loading="lazy"
      />
      {active && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gold text-bg-deep flex items-center justify-center">
          <Check size={9} weight="bold" />
        </span>
      )}
    </button>
  )
}
