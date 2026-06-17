/**
 * Hero portrait fallback for accounts without an uploaded avatar.
 *
 * Hashes the username (or any stable id) and maps it to one of the freshly-
 * scraped hero portraits under /public/images/icons/kingshot/heroes/. Same
 * input always returns the same hero — so a user never sees their face
 * "jump" between sessions.
 *
 * Wave 16: aligned to the canonical roster (`heroes-roster.ts`) so we cover
 * all 34 heroes (was 33 + a `jaegar` typo for jaeger) and use the higher-
 * quality .webp files. Existing legacy /images/heroes/*.png files stay on
 * disk so any stored avatar URL pointing at them keeps resolving.
 */
import { ROSTER_INDEX } from '../data/heroes-roster'

export const HERO_SLUGS = ROSTER_INDEX.map((r) => r.slug)

export type HeroSlug = string

/** djb2 string hash — deterministic, no deps, good enough for picking a bucket. */
function djb2(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i) // hash * 33 ^ c
  }
  return hash >>> 0 // force unsigned
}

export function pickHeroSlugFor(seed: string | null | undefined): HeroSlug {
  const safe = (seed ?? '').trim() || 'visitor'
  const idx = djb2(safe.toLowerCase()) % HERO_SLUGS.length
  return HERO_SLUGS[idx]
}

/** Canonical portrait path for a hero slug. Uses the scraped .webp library. */
export function heroPortraitPath(slug: string): string {
  return `/images/icons/kingshot/heroes/${slug}.webp`
}

export function heroAvatarUrlFor(seed: string | null | undefined): string {
  return heroPortraitPath(pickHeroSlugFor(seed))
}

/** Path for a specific hero slug; returns null if the slug isn't in the roster. */
export function heroAvatarUrlForSlug(slug: string | null | undefined): string | null {
  if (!slug) return null
  return HERO_SLUGS.includes(slug) ? heroPortraitPath(slug) : null
}

/**
 * Canonical avatar resolution for any member-shaped object. Used by UserHero,
 * the Members roster, AdminAccounts, etc — keeps everyone consistent.
 *
 * Priority:
 *   1. Uploaded image URL (admin or self-uploaded)
 *   2. Explicit hero slug pick (from Settings → Profile → Avatar)
 *   3. Deterministic hash of the seed (username or member id)
 */
export function resolveAvatarUrl(args: {
  uploadedUrl?: string | null
  heroSlug?: string | null
  seed: string | null | undefined
}): string {
  if (args.uploadedUrl && args.uploadedUrl.trim().length > 0) return args.uploadedUrl
  const fromSlug = heroAvatarUrlForSlug(args.heroSlug)
  if (fromSlug) return fromSlug
  return heroAvatarUrlFor(args.seed)
}
