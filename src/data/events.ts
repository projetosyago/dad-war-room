/**
 * Static catalogue of heroes (sourced from kingshotwiki).
 * Events themselves are now stored in Supabase — see `src/repositories/events.ts`.
 */

export const HEROES = [
  'forrest', 'seth', 'edwin', 'olive', 'howard', 'gordon', 'chenko', 'fahd',
  'quinn', 'diana', 'amane', 'yeonwoo', 'amadeus', 'helga', 'jabel', 'saul',
  'hilde', 'marlin', 'eric', 'petra', 'zoe', 'jaeger', 'alcar', 'margot',
  'rosa', 'long-fei', 'thrud', 'triton', 'sophia', 'yang', 'charles', 'ava',
  'wee-woo',
] as const

export type HeroId = (typeof HEROES)[number]

export const heroImage = (id: HeroId) => `/images/icons/kingshot/heroes/${id}.webp`
