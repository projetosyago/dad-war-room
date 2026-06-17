/**
 * Master inventory of icons available to the admin IconPicker.
 *
 * Sources:
 *   - Legacy assets in /public/images/{tiers,items,buildings,events,heroes,pets}/
 *     curated by Salles directly.
 *   - Scraped library at /public/images/icons/kingshot/{bucket}/{slug}.webp
 *     pulled from kingshotdata.com — see scripts/scrape-kingshotdata-icons.mjs.
 *
 * Each entry carries enough metadata for the picker to filter, search and
 * label them without parsing filenames at render time.
 */
import manifest from '../../public/images/icons/kingshot-manifest.json'
import wikiManifest from '../../public/images/icons/kingshotwiki-manifest.json'
import {
  RARE_HEROES,
  EPIC_HEROES,
  MYTHIC_GENERATIONS,
} from './heroes-roster'

export type IconGroupKey =
  | 'truegold-tiers'
  | 'buildings'
  | 'items-legacy'
  | 'events-legacy'
  | 'heroes-rare'
  | 'heroes-epic'
  | 'heroes-mythic-gen1'
  | 'heroes-mythic-gen2'
  | 'heroes-mythic-gen3'
  | 'heroes-mythic-gen4'
  | 'heroes-mythic-gen5'
  | 'heroes-mythic-gen6'
  | 'heroes-mythic-gen7'
  | 'pets'
  | 'masters'
  | 'kingshot-buildings'
  | 'kingshot-events'
  | 'kingshot-items'
  | 'war-academy'
  | 'kingshot-research'
  // ── Full kingshotwiki.com /items/ scrape (13 categories, ~186 icons) ───
  | 'wiki-basic-resource'
  | 'wiki-pet'
  | 'wiki-town-skin'
  | 'wiki-march-skin'
  | 'wiki-avatar-frame'
  | 'wiki-nameplate'
  | 'wiki-teleport-skin'
  | 'wiki-teleporter'
  | 'wiki-buff'
  | 'wiki-truegold'
  | 'wiki-chest'
  | 'wiki-hero'
  | 'wiki-master'

export interface IconEntry {
  /** Public path (relative to web root). What the picker stores. */
  path: string
  /** Human-readable label. */
  label: string
  /** Group bucket — used for tabs / filtering. */
  group: IconGroupKey
  /** Lower-cased haystack for the search input. */
  searchKey: string
}

function entry(path: string, label: string, group: IconGroupKey): IconEntry {
  return { path, label, group, searchKey: `${label} ${path}`.toLowerCase() }
}

function heroFor(slug: string, label: string, group: IconGroupKey): IconEntry {
  return entry(`/images/icons/kingshot/heroes/${slug}.webp`, label, group)
}

// ─── Legacy curated groups ─────────────────────────────────────────────────
// These point at the older /public/images tree — kept for backwards compat
// with milestones already pointing at them.

const TIER_LEGACY: IconEntry[] = ['tg1', 'tg2', 'tg3', 'tg4', 'tg5', 'tg6', 'tg7', 'tg8'].map(
  (t, i) => entry(`/images/tiers/${t}.png`, `Truegold ${i + 1}`, 'truegold-tiers'),
)

const BUILDINGS_LEGACY: IconEntry[] = [
  ['/images/buildings/town-center.png', 'Town Center'],
  ['/images/buildings/town-center-tg.png', 'Town Center (TG)'],
  ['/images/buildings/hero-hall.png', 'Hero Hall'],
  ['/images/buildings/war-academy.png', 'War Academy'],
  ['/images/buildings/barracks.png', 'Barracks'],
  ['/images/buildings/truegold-barracks.png', 'Truegold Barracks'],
  ['/images/buildings/range.png', 'Range'],
  ['/images/buildings/truegold-range.png', 'Truegold Range'],
  ['/images/buildings/stable.png', 'Stable'],
  ['/images/buildings/truegold-stable.png', 'Truegold Stable'],
  ['/images/buildings/truegold-crucible.png', 'Truegold Crucible'],
].map(([p, l]) => entry(p, l, 'buildings'))

const ITEMS_LEGACY: IconEntry[] = [
  ['/images/items/truegold.png', 'Truegold'],
  ['/images/items/truegold-dust.png', 'Truegold Dust'],
  ['/images/items/truegold-tempered.png', 'Tempered Truegold'],
  ['/images/items/hero-xp.png', 'Hero XP'],
  ['/images/items/gold.png', 'Gold'],
].map(([p, l]) => entry(p, l, 'items-legacy'))

const EVENTS_LEGACY: IconEntry[] = [
  ['/images/events/bear-hunt.png', 'Bear Hunt'],
  ['/images/events/kvk.png', 'KvK'],
  ['/images/events/viking-vengeance.png', 'Viking Vengeance'],
  ['/images/events/tri-alliance.png', 'Tri-Alliance Clash'],
  ['/images/events/cesars-fury.png', "Cesar's Fury"],
  ['/images/events/swordland-showdown.png', 'Swordland Showdown'],
].map(([p, l]) => entry(p, l, 'events-legacy'))

// ─── Heroes (scraped — preferred) ──────────────────────────────────────────
// One subgroup per rarity tier, plus 7 mythic generation subgroups so the
// picker can show "Gen 4" as a separable pill the admin clicks once.

const HEROES_RARE: IconEntry[] = RARE_HEROES.map((h) =>
  heroFor(h.slug, h.fallbackName, 'heroes-rare'),
)
const HEROES_EPIC: IconEntry[] = EPIC_HEROES.map((h) =>
  heroFor(h.slug, h.fallbackName, 'heroes-epic'),
)
const HEROES_MYTHIC_BY_GEN: Record<number, IconEntry[]> = Object.fromEntries(
  MYTHIC_GENERATIONS.map((g) => [
    g.gen,
    g.heroes.map((h) =>
      heroFor(h.slug, h.fallbackName, `heroes-mythic-gen${g.gen}` as IconGroupKey),
    ),
  ]),
)

// ─── Scraped kingshot library — non-hero buckets ────────────────────────────
// Manifest gives us slug + title per bucket; we map straight onto IconEntry.

interface ManifestEntry {
  slug: string
  title: string
  local: string
  source: string
}

const M = manifest as unknown as {
  buckets: Record<string, ManifestEntry[]>
}

function fromBucket(bucket: string, group: IconGroupKey): IconEntry[] {
  return (M.buckets[bucket] ?? []).map((e) =>
    entry(e.local, decodeTitle(e.title), group),
  )
}

/** WordPress titles can leak HTML entities — clean those up here. */
function decodeTitle(t: string): string {
  return t
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
}

// ── Wiki shards / skill books / widgets / hero XP — moved into the dynamic
//    manifest-driven groups below (wiki-hero, wiki-chest). The hand-coded
//    arrays were redundant once the full /items/ scrape landed.

const PETS = fromBucket('pets', 'pets')
const MASTERS = fromBucket('masters', 'masters')
const KINGSHOT_BUILDINGS = fromBucket('buildings', 'kingshot-buildings')
const KINGSHOT_EVENTS = fromBucket('events', 'kingshot-events')
const KINGSHOT_ITEMS = fromBucket('items', 'kingshot-items')
const WAR_ACADEMY = fromBucket('war-academy-research', 'war-academy')
const KINGSHOT_RESEARCH = fromBucket('research', 'kingshot-research')

// ─── Full kingshotwiki.com items scrape ────────────────────────────────────
// 13 buckets, ~186 icons. Loads dynamically from kingshotwiki-manifest.json
// so re-running the scraper auto-rebuilds the picker.

const WM = wikiManifest as unknown as {
  buckets: Record<string, ManifestEntry[]>
}

function fromWikiBucket(bucket: string, group: IconGroupKey): IconEntry[] {
  return (WM.buckets[bucket] ?? []).map((e) =>
    entry(e.local, decodeTitle(e.title), group),
  )
}

const WIKI_BASIC_RESOURCE = fromWikiBucket('basic-resource', 'wiki-basic-resource')
const WIKI_PET            = fromWikiBucket('pet',            'wiki-pet')
const WIKI_TOWN_SKIN      = fromWikiBucket('town-skin',      'wiki-town-skin')
const WIKI_MARCH_SKIN     = fromWikiBucket('march-skin',     'wiki-march-skin')
const WIKI_AVATAR_FRAME   = fromWikiBucket('avatar-frame',   'wiki-avatar-frame')
const WIKI_NAMEPLATE      = fromWikiBucket('nameplate',      'wiki-nameplate')
const WIKI_TELEPORT_SKIN  = fromWikiBucket('teleport-skin',  'wiki-teleport-skin')
const WIKI_TELEPORTER     = fromWikiBucket('teleporter',     'wiki-teleporter')
const WIKI_BUFF           = fromWikiBucket('buff',           'wiki-buff')
const WIKI_TRUEGOLD       = fromWikiBucket('truegold',       'wiki-truegold')
const WIKI_CHEST          = fromWikiBucket('chest',          'wiki-chest')
const WIKI_HERO           = fromWikiBucket('hero',           'wiki-hero')
const WIKI_MASTER         = fromWikiBucket('master',         'wiki-master')

// ─── Group manifest ────────────────────────────────────────────────────────
// Order = display order in the picker. Headings are i18n keys; resolved by
// the picker via `t(...)`.

export interface IconGroup {
  key: IconGroupKey
  /** i18n key for the group label. */
  labelKey: string
  entries: IconEntry[]
}

const RAW_GROUPS: IconGroup[] = [
  { key: 'truegold-tiers',       labelKey: 'admin.iconPicker.groups.truegoldTiers',       entries: TIER_LEGACY },
  { key: 'buildings',            labelKey: 'admin.iconPicker.groups.buildings',           entries: BUILDINGS_LEGACY },
  { key: 'items-legacy',         labelKey: 'admin.iconPicker.groups.items',               entries: ITEMS_LEGACY },
  { key: 'events-legacy',        labelKey: 'admin.iconPicker.groups.events',              entries: EVENTS_LEGACY },
  { key: 'heroes-rare',          labelKey: 'admin.iconPicker.groups.heroesRare',          entries: HEROES_RARE },
  { key: 'heroes-epic',          labelKey: 'admin.iconPicker.groups.heroesEpic',          entries: HEROES_EPIC },
  { key: 'heroes-mythic-gen1',   labelKey: 'admin.iconPicker.groups.heroesMythicGen1',    entries: HEROES_MYTHIC_BY_GEN[1] ?? [] },
  { key: 'heroes-mythic-gen2',   labelKey: 'admin.iconPicker.groups.heroesMythicGen2',    entries: HEROES_MYTHIC_BY_GEN[2] ?? [] },
  { key: 'heroes-mythic-gen3',   labelKey: 'admin.iconPicker.groups.heroesMythicGen3',    entries: HEROES_MYTHIC_BY_GEN[3] ?? [] },
  { key: 'heroes-mythic-gen4',   labelKey: 'admin.iconPicker.groups.heroesMythicGen4',    entries: HEROES_MYTHIC_BY_GEN[4] ?? [] },
  { key: 'heroes-mythic-gen5',   labelKey: 'admin.iconPicker.groups.heroesMythicGen5',    entries: HEROES_MYTHIC_BY_GEN[5] ?? [] },
  { key: 'heroes-mythic-gen6',   labelKey: 'admin.iconPicker.groups.heroesMythicGen6',    entries: HEROES_MYTHIC_BY_GEN[6] ?? [] },
  { key: 'heroes-mythic-gen7',   labelKey: 'admin.iconPicker.groups.heroesMythicGen7',    entries: HEROES_MYTHIC_BY_GEN[7] ?? [] },
  { key: 'pets',                 labelKey: 'admin.iconPicker.groups.pets',                entries: PETS },
  { key: 'masters',              labelKey: 'admin.iconPicker.groups.masters',             entries: MASTERS },
  { key: 'kingshot-buildings',   labelKey: 'admin.iconPicker.groups.kingshotBuildings',   entries: KINGSHOT_BUILDINGS },
  { key: 'kingshot-events',      labelKey: 'admin.iconPicker.groups.kingshotEvents',      entries: KINGSHOT_EVENTS },
  { key: 'kingshot-items',       labelKey: 'admin.iconPicker.groups.kingshotItems',       entries: KINGSHOT_ITEMS },
  { key: 'war-academy',          labelKey: 'admin.iconPicker.groups.warAcademy',          entries: WAR_ACADEMY },
  { key: 'kingshot-research',    labelKey: 'admin.iconPicker.groups.research',            entries: KINGSHOT_RESEARCH },
  // Full kingshotwiki scrape — 13 buckets
  { key: 'wiki-basic-resource',  labelKey: 'admin.iconPicker.groups.wikiBasicResource',   entries: WIKI_BASIC_RESOURCE },
  { key: 'wiki-pet',             labelKey: 'admin.iconPicker.groups.wikiPet',             entries: WIKI_PET },
  { key: 'wiki-town-skin',       labelKey: 'admin.iconPicker.groups.wikiTownSkin',        entries: WIKI_TOWN_SKIN },
  { key: 'wiki-march-skin',      labelKey: 'admin.iconPicker.groups.wikiMarchSkin',       entries: WIKI_MARCH_SKIN },
  { key: 'wiki-avatar-frame',    labelKey: 'admin.iconPicker.groups.wikiAvatarFrame',     entries: WIKI_AVATAR_FRAME },
  { key: 'wiki-nameplate',       labelKey: 'admin.iconPicker.groups.wikiNameplate',       entries: WIKI_NAMEPLATE },
  { key: 'wiki-teleport-skin',   labelKey: 'admin.iconPicker.groups.wikiTeleportSkin',    entries: WIKI_TELEPORT_SKIN },
  { key: 'wiki-teleporter',      labelKey: 'admin.iconPicker.groups.wikiTeleporter',      entries: WIKI_TELEPORTER },
  { key: 'wiki-buff',            labelKey: 'admin.iconPicker.groups.wikiBuff',            entries: WIKI_BUFF },
  { key: 'wiki-truegold',        labelKey: 'admin.iconPicker.groups.wikiTruegold',        entries: WIKI_TRUEGOLD },
  { key: 'wiki-chest',           labelKey: 'admin.iconPicker.groups.wikiChest',           entries: WIKI_CHEST },
  { key: 'wiki-hero',            labelKey: 'admin.iconPicker.groups.wikiHero',            entries: WIKI_HERO },
  { key: 'wiki-master',          labelKey: 'admin.iconPicker.groups.wikiMaster',          entries: WIKI_MASTER },
]

export const ICON_GROUPS: IconGroup[] = RAW_GROUPS.filter((g) => g.entries.length > 0)

/** Flat list of every entry — used by the search. */
export const ALL_ICON_ENTRIES: IconEntry[] = ICON_GROUPS.flatMap((g) => g.entries)

/** Total count for display ("X icons available"). */
export const ICON_LIBRARY_COUNT = ALL_ICON_ENTRIES.length

/** Lookup by path — used to render the "current selection" preview by name. */
export function findIconEntry(path: string): IconEntry | null {
  return ALL_ICON_ENTRIES.find((e) => e.path === path) ?? null
}
