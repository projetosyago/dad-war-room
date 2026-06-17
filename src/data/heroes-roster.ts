/**
 * Canonical Kingshot hero roster.
 *
 * Single source of truth for which heroes exist and how they are grouped on
 * the Heroes catalogue page. Display order = order within each array below.
 *
 * Hero detail data (skills, gear, descriptions) lives in `heroes-data.json` —
 * scraped from kingshotdata.com by `scripts/scrape-hero-details.mjs`.
 *
 * Upgrade resource costs are NOT in the scraped data (kingshotdata.com
 * doesn't expose them); they will be filled in by hand later.
 */

export type HeroRarity = 'rare' | 'epic' | 'mythic'
export type HeroSlug = string

export interface RosterEntry {
  slug: HeroSlug
  /** Display name fallback if heroes-data.json hasn't loaded the title yet. */
  fallbackName: string
}

export interface MythicGeneration {
  /** Generation number, 1-indexed. */
  gen: number
  heroes: RosterEntry[]
}

/** Pretty display name when the title isn't in scraped data yet. */
const name = (s: string) => s

export const RARE_HEROES: RosterEntry[] = [
  { slug: 'olive', fallbackName: name('Olive') },
  { slug: 'edwin', fallbackName: name('Edwin') },
  { slug: 'seth', fallbackName: name('Seth') },
  { slug: 'forrest', fallbackName: name('Forrest') },
]

export const EPIC_HEROES: RosterEntry[] = [
  { slug: 'amane', fallbackName: name('Amane') },
  { slug: 'yeonwoo', fallbackName: name('Yeonwoo') },
  { slug: 'fahd', fallbackName: name('Fahd') },
  { slug: 'chenko', fallbackName: name('Chenko') },
  { slug: 'gordon', fallbackName: name('Gordon') },
  { slug: 'diana', fallbackName: name('Diana') },
  { slug: 'howard', fallbackName: name('Howard') },
  { slug: 'quinn', fallbackName: name('Quinn') },
]

export const MYTHIC_GENERATIONS: MythicGeneration[] = [
  {
    gen: 1,
    heroes: [
      { slug: 'jabel', fallbackName: name('Jabel') },
      { slug: 'amadeus', fallbackName: name('Amadeus') },
      { slug: 'helga', fallbackName: name('Helga') },
      { slug: 'saul', fallbackName: name('Saul') },
    ],
  },
  {
    gen: 2,
    heroes: [
      { slug: 'hilde', fallbackName: name('Hilde') },
      { slug: 'zoe', fallbackName: name('Zoe') },
      { slug: 'marlin', fallbackName: name('Marlin') },
    ],
  },
  {
    gen: 3,
    heroes: [
      { slug: 'petra', fallbackName: name('Petra') },
      { slug: 'jaeger', fallbackName: name('Jaeger') },
      { slug: 'eric', fallbackName: name('Eric') },
    ],
  },
  {
    gen: 4,
    heroes: [
      { slug: 'rosa', fallbackName: name('Rosa') },
      { slug: 'alcar', fallbackName: name('Alcar') },
      { slug: 'margot', fallbackName: name('Margot') },
    ],
  },
  {
    gen: 5,
    heroes: [
      { slug: 'vivian', fallbackName: name('Vivian') },
      { slug: 'long-fei', fallbackName: name('Long Fei') },
      { slug: 'thrud', fallbackName: name('Thrud') },
    ],
  },
  {
    gen: 6,
    heroes: [
      { slug: 'yang', fallbackName: name('Yang') },
      { slug: 'triton', fallbackName: name('Triton') },
      { slug: 'sophia', fallbackName: name('Sophia') },
    ],
  },
  {
    gen: 7,
    heroes: [
      { slug: 'wee-woo', fallbackName: name('Wee & Woo') },
      { slug: 'charles', fallbackName: name('Charles') },
      { slug: 'ava', fallbackName: name('Ava') },
    ],
  },
]

/** All heroes flat — useful for slug→rarity lookups in detail page. */
export interface RosterIndexEntry extends RosterEntry {
  rarity: HeroRarity
  generation: number | null
}

export const ROSTER_INDEX: RosterIndexEntry[] = [
  ...RARE_HEROES.map((h) => ({ ...h, rarity: 'rare' as const, generation: null })),
  ...EPIC_HEROES.map((h) => ({ ...h, rarity: 'epic' as const, generation: null })),
  ...MYTHIC_GENERATIONS.flatMap((g) =>
    g.heroes.map((h) => ({ ...h, rarity: 'mythic' as const, generation: g.gen })),
  ),
]

export function findRosterEntry(slug: string): RosterIndexEntry | null {
  return ROSTER_INDEX.find((h) => h.slug === slug) ?? null
}

/** Total hero count — useful for QA / parity checks. */
export const TOTAL_HEROES = ROSTER_INDEX.length
