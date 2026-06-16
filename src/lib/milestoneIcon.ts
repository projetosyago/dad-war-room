/**
 * Resolve the best in-game asset for a Kingdom Timeline milestone.
 *
 * Strategy (first hit wins):
 *  1. Parse the milestone NAME for direct clues:
 *      "Truegold 5"          → /images/tiers/tg5.png
 *      "4th Master Unlocked" → /images/buildings/town-center-tg.png
 *      "Generation 4 Heroes (Alcar, ...)" → /images/heroes/alcar.png
 *      "War Academy Unlocked (T11)"      → /images/buildings/war-academy.png
 *  2. Fall back to a per-CATEGORY default asset.
 *  3. If still nothing, return null and let the caller draw a Phosphor icon.
 *
 * Salles 2026-06-15: "procure icones melhores nos sites de wiki do kingshot,
 * ja te mandei dezenas, com certeza tem icones melhores para puxar deles."
 * This module uses ONLY assets already under /public/images — no remote
 * fetches at render time. When a new asset lands, just extend the maps below.
 */
import type { MilestoneCategory } from '../types/domain'
import { HERO_SLUGS } from './heroAvatar'

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

function findHeroPortrait(haystack: string): string | null {
  for (const slug of HERO_SLUGS) {
    // Match whole-word — avoid "ava" hitting "avatar" / "ava ilable".
    const re = new RegExp(`\\b${slug.replace('-', '[\\s-]?')}\\b`, 'i')
    if (re.test(haystack)) return `/images/heroes/${slug}.png`
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

export interface MilestoneIconHit {
  src: string
  origin: 'override' | 'tier' | 'hero' | 'building' | 'category'
}

export function resolveMilestoneIcon(
  category: MilestoneCategory,
  name: string,
  iconUrl?: string | null,
): MilestoneIconHit | null {
  // Admin-picked override wins outright.
  if (iconUrl && iconUrl.trim().length > 0) {
    return { src: iconUrl.trim(), origin: 'override' }
  }
  const hay = normalize(name)

  const tier = findTgTier(hay)
  if (tier) return { src: tier, origin: 'tier' }

  // Only search hero portraits for the heroes category — avoids matching
  // a stray "rosa" inside an unrelated milestone name.
  if (category === 'heroes') {
    const hero = findHeroPortrait(hay)
    if (hero) return { src: hero, origin: 'hero' }
  }

  const building = findBuildingFromName(hay)
  if (building) return { src: building, origin: 'building' }

  const fallback = CATEGORY_FALLBACK[category]
  if (fallback) return { src: fallback, origin: 'category' }

  return null
}
