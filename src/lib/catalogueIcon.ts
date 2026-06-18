/**
 * Local-first icon paths for the game catalogues.
 *
 * Mirrors heroAvatar.ts `heroPortraitPath`: prefer the scraped .webp library
 * under /public/images/icons/kingshot/{kind}/, and let the call site fall
 * through (via <ChainedImage>) to any admin-set DB url, then a Phosphor
 * placeholder.
 *
 * Slug parity verified 2026-06-18 (ROADMAP P1.2, Passo 0):
 *   - masters: cassia/pan/roman/valora match the disk filenames 1:1.
 *   - pets: 14 .webp on disk; the `pets` table is currently empty, so this is
 *     wired-but-dormant — it lights up the moment an admin registers a pet
 *     whose slug matches a filename.
 *
 * Events are intentionally excluded: the kingshot/events library is generic
 * in-game events — a different taxonomy from the alliance events stored in the
 * DB — so they keep their legacy /images/events/*.png art. The kingshot/events
 * set is earmarked for a future "Game Events Reference" feature (ROADMAP P3-P4).
 */
export type CatalogueIconKind = 'pets' | 'masters'

/** Canonical scraped-library path for a catalogue entry slug. */
export function catalogueIconPath(kind: CatalogueIconKind, slug: string): string {
  return `/images/icons/kingshot/${kind}/${slug}.webp`
}
