/**
 * Resolve the best in-game asset(s) for a Kingdom Timeline milestone.
 *
 * Strategy (first hit wins):
 *  1. Admin override (iconUrl) — explicit choice always wins.
 *  2. Truegold tier in the name → /images/tiers/tg{N}.png
 *  3. CATEGORY === 'heroes' AND the name mentions a generation:
 *       "Generation 4" / "Gen 4" / "Gen IV" → return ALL heroes of that gen
 *       as a portrait STACK (used by the Timeline card to show the trio).
 *  4. A single hero slug appears in the name → return that one portrait.
 *  5. Building keyword → return that building asset.
 *  6. Category-level fallback asset.
 *  7. null → caller draws a Phosphor icon.
 *
 * Asset paths:
 *  - Hero portraits: scraped from kingshotdata.com into
 *    /public/images/icons/kingshot/heroes/{slug}.webp
 *    (legacy /images/heroes/{slug}.png left untouched as a fallback the
 *    browser silently retries via the ImageWithFallback component.)
 *  - Buildings / tiers / items: legacy /public/images tree.
 *
 * Multi-hero results expose a `heroes: HeroPortrait[]` array so the caller
 * can render a stack — single-icon callers just use `src` as before.
 */
import type { MilestoneCategory } from '../types/domain'
import { HERO_SLUGS } from './heroAvatar'
import {
  MYTHIC_GENERATIONS,
  RARE_HEROES,
  EPIC_HEROES,
} from '../data/heroes-roster'

const CATEGORY_FALLBACK: Record<MilestoneCategory, string | null> = {
  truegold:      '/images/tiers/tg5.png',
  heroes:        '/images/buildings/hero-hall.png',
  'war-academy': '/images/buildings/war-academy.png',
  master:        '/images/buildings/town-center-tg.png',
  pvp:           '/images/buildings/truegold-barracks.png',
  pets:          null,
  feature:       null,
  fog:           null,
  other:         null,
}

/** Lower-cased haystack we search across. */
function normalize(s: string): string {
  return s.toLowerCase()
}

function findTgTier(haystack: string): string | null {
  const m = haystack.match(/truegold\s*(\d)/) ?? haystack.match(/\btg\s*(\d)/)
  if (!m) return null
  const n = Number(m[1])
  if (n < 1 || n > 8) return null
  return `/images/tiers/tg${n}.png`
}

/** Detect "Generation N" / "Gen N" / "Gen IV" (1-7). null = no generation. */
function findGenerationNumber(haystack: string): number | null {
  const arabic =
    haystack.match(/\bgeneration\s*([1-7])\b/) ??
    haystack.match(/\bgen\.?\s*([1-7])\b/)
  if (arabic) return Number(arabic[1])

  // Roman numerals — keep it small (1-7 is all we need).
  const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 }
  const roman = haystack.match(/\bgen\.?\s*(i{1,3}|iv|v|vi|vii)\b/)
  if (roman) return ROMAN[roman[1]] ?? null

  return null
}

/** Path to a hero portrait. Prefers the freshly-scraped webp. */
function heroPortraitPath(slug: string): string {
  return `/images/icons/kingshot/heroes/${slug}.webp`
}

/** All hero slugs in the given generation, in roster display order. */
function heroesInGeneration(gen: number): string[] {
  const bucket = MYTHIC_GENERATIONS.find((g) => g.gen === gen)
  return bucket ? bucket.heroes.map((h) => h.slug) : []
}

function findSingleHeroSlug(haystack: string): string | null {
  for (const slug of HERO_SLUGS) {
    // Allow either "long-fei" or "long fei" / "long  fei" etc. Whole-word
    // match avoids "ava" inside "available" / "avatar".
    const re = new RegExp(`\\b${slug.replace('-', '[\\s-]?')}\\b`, 'i')
    if (re.test(haystack)) return slug
  }
  return null
}

function findBuildingFromName(haystack: string): string | null {
  if (/war\s*academy/.test(haystack)) return '/images/buildings/war-academy.png'
  if (/hero\s*hall/.test(haystack)) return '/images/buildings/hero-hall.png'
  if (/crucible/.test(haystack)) return '/images/buildings/truegold-crucible.png'
  if (/(barracks|infantry|legion)/.test(haystack)) return '/images/buildings/truegold-barracks.png'
  if (/(range|archer)/.test(haystack)) return '/images/buildings/truegold-range.png'
  if (/(stable|cavalry|rider)/.test(haystack)) return '/images/buildings/truegold-stable.png'
  if (/(town\s*center|castle|master)/.test(haystack)) return '/images/buildings/town-center-tg.png'
  return null
}

export interface HeroPortrait {
  slug: string
  src: string
}

export interface MilestoneIconHit {
  /** Primary icon. For multi-hero hits this is the first portrait in the trio. */
  src: string
  origin: 'override' | 'tier' | 'gen' | 'hero' | 'building' | 'category'
  /**
   * Multi-portrait result — populated when a hero generation is detected so
   * the Timeline card can render a stack instead of a single avatar.
   */
  heroes?: HeroPortrait[]
  /** Detected generation number when origin === 'gen'. */
  generation?: number
}

export function resolveMilestoneIcon(
  category: MilestoneCategory,
  name: string,
  iconUrl?: string | null,
): MilestoneIconHit | null {
  if (iconUrl && iconUrl.trim().length > 0) {
    return { src: iconUrl.trim(), origin: 'override' }
  }
  const hay = normalize(name)

  const tier = findTgTier(hay)
  if (tier) return { src: tier, origin: 'tier' }

  // Heroes category — try gen first (multi-portrait), then single hero.
  if (category === 'heroes') {
    const gen = findGenerationNumber(hay)
    if (gen != null) {
      const slugs = heroesInGeneration(gen)
      if (slugs.length > 0) {
        const heroes: HeroPortrait[] = slugs.map((slug) => ({
          slug,
          src: heroPortraitPath(slug),
        }))
        return {
          src: heroes[0].src,
          origin: 'gen',
          heroes,
          generation: gen,
        }
      }
    }
    const slug = findSingleHeroSlug(hay)
    if (slug) {
      return {
        src: heroPortraitPath(slug),
        origin: 'hero',
        heroes: [{ slug, src: heroPortraitPath(slug) }],
      }
    }
  }

  const building = findBuildingFromName(hay)
  if (building) return { src: building, origin: 'building' }

  const fallback = CATEGORY_FALLBACK[category]
  if (fallback) return { src: fallback, origin: 'category' }

  return null
}

// Re-export for callers that want to enumerate the rare/epic/mythic roster
// without re-importing from heroes-roster directly.
export const ALL_HERO_SLUGS_BY_RARITY = {
  rare: RARE_HEROES.map((h) => h.slug),
  epic: EPIC_HEROES.map((h) => h.slug),
  mythicByGen: MYTHIC_GENERATIONS.map((g) => ({
    gen: g.gen,
    slugs: g.heroes.map((h) => h.slug),
  })),
}
