/**
 * Hero upgrade cost tables.
 *
 * Three independent upgrade tracks per hero:
 *   1. Star upgrades   — Hero Shards (6 tiers, ★1 → ★6)
 *   2. Skill upgrades  — Skill Books (4 upgrades per skill, lvl 1→5)
 *   3. Gear upgrades   — Widgets (10 levels, Mythic heroes only)
 *
 * Quantities are STANDARDIZED across rarities — only the item-name token
 * changes (e.g. "Mythic Conquest Skill Book" vs "Epic Conquest Skill Book").
 * Confirmed by Salles 2026-06-17 from kingshotwiki.com + kingshotdata.com:
 *   - https://kingshotdata.com/database/hero-shards/
 *   - https://kingshotdata.com/database/widgets/
 *   - https://kingshotwiki.com/items/
 */

export type HeroRarity = 'rare' | 'epic' | 'mythic'
export type SkillMode = 'conquest' | 'expedition'

// ─── Star upgrade costs ──────────────────────────────────────────────────────
// Hero Shards needed to advance each star tier. Values from
// kingshotdata.com/database/hero-shards/. The game caps heroes at ★5 — no
// ★6 in-game (per Salles 2026-06-17), so the table stops at tier 5.
export interface StarTierCost {
  /** Tier you are ADVANCING TO (★1 means going from base to ★1). */
  tier: number
  /** Shards required to take this single step. */
  qty: number
  /** Running total to reach this tier from base. */
  cumulative: number
}

export const STAR_SHARD_COSTS: StarTierCost[] = [
  { tier: 1, qty: 10, cumulative: 10 },
  { tier: 2, qty: 40, cumulative: 50 },
  { tier: 3, qty: 115, cumulative: 165 },
  { tier: 4, qty: 300, cumulative: 465 },
  { tier: 5, qty: 600, cumulative: 1065 },
]

/** Total shards to reach the max tier (★5). */
export const STAR_SHARD_TOTAL_KNOWN = 1065

/**
 * Heroes that use hero-specific shards instead of the generic rarity bucket.
 * Source: kingshotdata.com/database/hero-shards/ ("Amadeus and Helga require
 * hero-specific shards exclusively").
 */
const HERO_EXCLUSIVE_SHARDS = new Set(['Amadeus', 'Helga'])

export function starShardItemName(
  rarity: HeroRarity,
  heroName: string,
): string {
  if (HERO_EXCLUSIVE_SHARDS.has(heroName)) return `${heroName} Shards`
  const r = capitalize(rarity)
  return `${r} General Hero Shard`
}

// ─── Skill upgrade costs ─────────────────────────────────────────────────────
// Skill Books per level transition. Salles 2026-06-17: quantities are the
// same across all rarities; only the item-name token changes.
//
//   Lvl 1 (default unlocked) → Lvl 2:  10 books
//   Lvl 2                    → Lvl 3:  30 books
//   Lvl 3                    → Lvl 4:  50 books
//   Lvl 4                    → Lvl 5:  75 books
//
// Total per skill: 165 books to fully max.
export interface SkillLevelCost {
  from: number
  to: number
  qty: number
}

export const SKILL_BOOK_COSTS: SkillLevelCost[] = [
  { from: 1, to: 2, qty: 10 },
  { from: 2, to: 3, qty: 30 },
  { from: 3, to: 4, qty: 50 },
  { from: 4, to: 5, qty: 75 },
]

/** Total books to max ONE skill from default to level 5. */
export const SKILL_BOOK_TOTAL_PER_SKILL = SKILL_BOOK_COSTS.reduce(
  (s, c) => s + c.qty,
  0,
) // 165

export function skillBookItemName(
  rarity: HeroRarity,
  mode: SkillMode,
): string {
  return `${capitalize(rarity)} ${capitalize(mode)} Skill Book`
}

// ─── Widget (Exclusive Gear) upgrade costs ───────────────────────────────────
// Widgets per level. Mythic heroes only — confirmed by kingshotdata.com
// /database/widgets/. 10 levels total, +5 widgets per step. Total 275 to max.
//
// Sources for widgets: Buccaneer Bounty event, Mystery Shop, Hall of Heroes,
// Special Events, Packs.
export interface WidgetLevelCost {
  level: number
  qty: number
}

export const WIDGET_COSTS: WidgetLevelCost[] = Array.from(
  { length: 10 },
  (_, i) => ({ level: i + 1, qty: (i + 1) * 5 }),
)

export const WIDGET_TOTAL = WIDGET_COSTS.reduce((s, c) => s + c.qty, 0) // 275

/**
 * Widget item name for a hero. Per kingshotdata's gear pages, widgets are
 * named after the gear they upgrade (e.g. "Fate's Writ" for Petra). We use
 * the gear name when known, else a generic "<HeroName> Widget" fallback.
 */
export function widgetItemName(
  heroName: string,
  exclusiveGearName?: string | null,
): string {
  if (exclusiveGearName) return `${exclusiveGearName} Widget`
  return `${heroName}'s Widget`
}

// ─── Summary helpers ─────────────────────────────────────────────────────────
export interface HeroCostSummary {
  /** Total skill books to max ALL conquest + ALL expedition skills. */
  totalSkillBooks: number
  /** Breakdown — different item names per mode. */
  conquestBooks: { item: string; qty: number }
  expeditionBooks: { item: string; qty: number }
  /** Total star shards to reach the highest known star tier (★5). */
  starShards: { item: string; qty: number; tierReached: number }
  /** Widgets to max gear — null if hero isn't Mythic. */
  widgets: { item: string; qty: number } | null
}

export function summarizeHeroCosts(args: {
  rarity: HeroRarity
  name: string
  conquestSkillCount: number
  expeditionSkillCount: number
  exclusiveGearName?: string | null
}): HeroCostSummary {
  const { rarity, name, conquestSkillCount, expeditionSkillCount } = args
  const conquestQty = conquestSkillCount * SKILL_BOOK_TOTAL_PER_SKILL
  const expeditionQty = expeditionSkillCount * SKILL_BOOK_TOTAL_PER_SKILL
  return {
    totalSkillBooks: conquestQty + expeditionQty,
    conquestBooks: {
      item: skillBookItemName(rarity, 'conquest'),
      qty: conquestQty,
    },
    expeditionBooks: {
      item: skillBookItemName(rarity, 'expedition'),
      qty: expeditionQty,
    },
    starShards: {
      item: starShardItemName(rarity, name),
      qty: STAR_SHARD_TOTAL_KNOWN,
      tierReached: 5,
    },
    widgets:
      rarity === 'mythic'
        ? {
            item: widgetItemName(name, args.exclusiveGearName),
            qty: WIDGET_TOTAL,
          }
        : null,
  }
}

// ─── Item icons ──────────────────────────────────────────────────────────────
// Canonical paths point at the freshly-scraped kingshotwiki manifest buckets:
//   /images/icons/kingshotwiki/hero/   — skill books, general shards, hero XP
//   /images/icons/kingshotwiki/chest/  — widget chests (gen-specific)
//
// The wiki uses distinct icons per rarity for skill books / shards, and
// gen-specific art for widget chests (Gen 2-6). Gen 7 isn't published yet —
// falls back to Gen 6 art (closest visual match).

const HERO_ICON_ROOT = '/images/icons/kingshotwiki/hero'
const CHEST_ICON_ROOT = '/images/icons/kingshotwiki/chest'

export function skillBookIcon(rarity: HeroRarity, mode: SkillMode): string {
  return `${HERO_ICON_ROOT}/${rarity}-${mode}-skill-book.png`
}

export function starShardIcon(rarity: HeroRarity, heroName: string): string | null {
  if (HERO_EXCLUSIVE_SHARDS.has(heroName)) return null // hero-specific — no shared icon
  return `${HERO_ICON_ROOT}/${rarity}-general-hero-shard.png`
}

/**
 * Widget chest icon for a mythic generation. Wiki has gen-2 through gen-6
 * gen-specific art; non-mythic heroes (no generation) get the generic chest;
 * gen 7+ falls back to gen-6 until the wiki publishes new art.
 */
export function widgetChestIcon(generation?: number | null): string {
  if (!generation) return `${CHEST_ICON_ROOT}/custom-hero-widget-chest.png`
  const clamped = Math.min(6, Math.max(2, generation))
  return `${CHEST_ICON_ROOT}/gen-${clamped}-custom-hero-widget-chest.png`
}

// ─── Internal helpers ────────────────────────────────────────────────────────
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
