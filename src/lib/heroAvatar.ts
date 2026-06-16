/**
 * Hero portrait fallback for accounts without an uploaded avatar.
 *
 * Hashes the username (or any stable id) and maps it to one of the in-game
 * hero portraits we ship under /public/images/heroes/. Same input always
 * returns the same hero — so a user never sees their face "jump" between
 * sessions.
 */

export const HERO_SLUGS = [
  'alcar', 'amadeus', 'amane', 'ava', 'charles', 'chenko', 'diana', 'edwin',
  'eric', 'fahd', 'forrest', 'gordon', 'helga', 'hilde', 'howard', 'jabel',
  'jaegar', 'long-fei', 'margot', 'marlin', 'olive', 'petra', 'quinn', 'rosa',
  'saul', 'seth', 'sophia', 'thrud', 'triton', 'wee-woo', 'yang', 'yeonwoo', 'zoe',
] as const

export type HeroSlug = (typeof HERO_SLUGS)[number]

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

export function heroAvatarUrlFor(seed: string | null | undefined): string {
  return `/images/heroes/${pickHeroSlugFor(seed)}.png`
}

/** Path for a specific hero slug; returns null if the slug isn't shipped. */
export function heroAvatarUrlForSlug(slug: string | null | undefined): string | null {
  if (!slug) return null
  return (HERO_SLUGS as readonly string[]).includes(slug)
    ? `/images/heroes/${slug}.png`
    : null
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
