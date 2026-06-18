import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  User,
  Lightning,
  Crown,
  ArrowLeft,
  Star,
  BookOpen,
  PuzzlePiece,
} from '@phosphor-icons/react'
import { cn } from '../lib/cn'
import heroesData from '../data/heroes-data.json'
import {
  STAR_SHARD_COSTS,
  SKILL_BOOK_COSTS,
  WIDGET_COSTS,
  skillBookItemName,
  skillBookIcon,
  starShardIcon,
  widgetChestIcon,
} from '../data/hero-upgrade-costs'

// Hero detail — STATIC, data-driven from heroes-data.json. Upgrade Costs is a
// deliberate placeholder (data isn't scraped; curated by hand).
// New i18n keys (heroes.detail.*) — parent agent will add to locales:
// unlock, notFoundTitle, notFoundSubtitle, returnToList, tab.{conquest,
// expedition}, baseStats, stat.{atk,def,hp}, conquestSkills, expeditionSkills,
// expeditionBonuses, upgradePreview, exclusiveGear, gearMaxStats, gearBonuses,
// gearSkills, upgradeCosts, upgradeCostsPlaceholder, sources, gen,
// rarity.{rare,epic,mythic}, mode.{conquest,expedition},
// gearStat.{power,heroAtk,heroDef,heroHp,escortAtk,escortDef,escortHp}.

// ─── Types ──────────────────────────────────────────────────────────────────

type Rarity = 'rare' | 'epic' | 'mythic'
type SkillMode = 'conquest' | 'expedition' | 'unknown'

interface HeroSkill {
  name: string
  iconUrl: string | null
  description: string
  upgradeTiers: string[]
  mode?: SkillMode
}
interface HeroBaseStats { atk: number | null; def: number | null; hp: number | null }
interface HeroBonus { label: string; value: string }
interface ExclusiveGearStats {
  power: number | null
  heroAtk: number | null
  heroDef: number | null
  heroHp: number | null
  escortAtk: number | null
  escortDef: number | null
  escortHp: number | null
}
interface ExclusiveGear {
  name: string | null
  /** Local public path to the widget icon (Wave 19 — see scripts/scrape-mythic-gear-icons.mjs). */
  iconUrl?: string | null
  stats: ExclusiveGearStats
  bonuses: string[]
  skills: HeroSkill[]
}
interface HeroData {
  name: string
  slug: string
  rarity: Rarity
  generation: number | null
  class: string | null
  sources: string[]
  portrait: string | null
  conquest: { baseStats: HeroBaseStats; skills: HeroSkill[] }
  expedition: { skills: HeroSkill[]; bonuses: HeroBonus[] }
  exclusiveGear: ExclusiveGear | null
}

// JSON record keyed by slug; scrape script adds scrapedAt / sourceUrl we ignore.
const HEROES = heroesData as unknown as Record<string, HeroData>

// Wave 22: card frame is the same gold-trimmed UserHero variant for EVERY
// hero — rarity differentiation now lives only in the small rarity chip
// (rare = success-green, epic = violet, mythic = crimson) so the page reads
// like the dashboard hero card. Previous per-rarity card tints felt loud.
const RARITY_CHIP: Record<Rarity, string> = {
  rare: 'bg-success/15 border-success/45 text-[#7fc08a]',
  epic: 'bg-violet-500/15 border-violet-400/45 text-violet-200',
  mythic: 'bg-crimson/20 border-crimson/55 text-crimson-glow',
}

// ─── Page ───────────────────────────────────────────────────────────────────

type TabKey = 'conquest' | 'expedition'

export function HeroDetail() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const [tab, setTab] = useState<TabKey>('conquest')
  const hero: HeroData | null = useMemo(() => (slug ? HEROES[slug] ?? null : null), [slug])

  if (!hero) {
    return (
      <div className="container-narrow pt-5 pb-12 sm:pt-8 sm:pb-16">
        <div className="card-hero flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
          <span className="icon-frame icon-frame--sm">
            <Crown size={20} weight="duotone" className="text-gold-soft" />
          </span>
          <div className="hero-title text-base sm:text-lg">
            {t('heroes.detail.notFoundTitle', { defaultValue: 'Hero not found' })}
          </div>
          <p className="text-xs text-ink-mute max-w-md">
            {t('heroes.detail.notFoundSubtitle', { defaultValue: "We couldn't locate this hero in the roster." })}
          </p>
          <Link to="/heroes" className="btn-ghost mt-2 text-xs inline-flex items-center gap-1.5">
            <ArrowLeft size={12} weight="duotone" />
            {t('heroes.detail.returnToList', { defaultValue: 'Back to heroes' })}
          </Link>
        </div>
      </div>
    )
  }

  const localPortrait = `/images/icons/kingshot/heroes/${hero.slug}.webp`

  return (
    <div className="container-narrow pt-4 pb-12 sm:pt-6 sm:pb-16 space-y-3 sm:space-y-4">
      {/* ── Hero banner — mirrors the dashboard UserHero card visual:
          card-hero--portrait gold-trimmed frame, circular avatar medallion
          with a gold double-ring, inline UserHero-style stats, card-foot
          band for unlock sources. The rarity color now lives only in the
          rarity chip above the name. */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-hero card-hero--portrait"
      >
        <div className="relative flex items-center gap-4 p-5 sm:p-6 pb-4">
          {/* Avatar medallion — gold double-ring matching UserHero exactly */}
          <div className="relative shrink-0">
            <span aria-hidden className="absolute -inset-1.5 rounded-full bg-gold/25 blur-md" />
            <div
              className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full p-[2px]"
              style={{
                background:
                  'linear-gradient(135deg, #ffe9a3 0%, #f4cf73 50%, #c89934 100%)',
              }}
            >
              <div
                className="rounded-full p-[1.5px] h-full w-full"
                style={{ background: '#0d1124' }}
              >
                <ChainedImage
                  sources={[localPortrait, hero.portrait]}
                  alt={hero.name}
                  className="rounded-full h-full w-full object-cover"
                  fallback={
                    <div className="rounded-full h-full w-full flex items-center justify-center bg-bg-card/60">
                      <User size={32} weight="duotone" className="text-gold-soft/60" />
                    </div>
                  }
                />
              </div>
            </div>
          </div>

          {/* Right column — chips, name, inline stats */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <RarityChip rarity={hero.rarity} />
              {hero.rarity === 'mythic' && hero.generation != null && (
                <span className="badge-gold text-[10px] px-2 py-0.5">
                  {t('heroes.detail.gen', { defaultValue: 'Gen {{gen}}', gen: hero.generation })}
                </span>
              )}
              {hero.class && (
                <span className="badge-mute text-[10px] px-2 py-0.5">{hero.class}</span>
              )}
            </div>
            <h1 className="font-display tracking-[0.06em] text-2xl sm:text-3xl text-gold-shimmer truncate leading-tight">
              {hero.name}
            </h1>
            <BannerStats stats={hero.conquest.baseStats} />
          </div>
        </div>

        {hero.sources.length > 0 && (
          <div className="card-foot relative">
            <span className="text-[11px] text-ink-mute truncate inline-flex items-center gap-2 min-w-0">
              <span className="eyebrow shrink-0">
                {t('heroes.detail.unlock', { defaultValue: 'Unlock' })}
              </span>
              <span className="truncate text-ink-cream/85">
                {hero.sources.join(', ')}
              </span>
            </span>
          </div>
        )}
      </motion.section>

      {/* ── Skills card — tabs + active mode all wrapped in one container.
          Wave 21: previously the Conquest/Expedition tabs floated above two
          separate cards; now they live inside a single skills card so the
          page reads as one cohesive block. */}
      <section className="card-hero p-4 sm:p-5">
        <div className="flex items-center justify-center gap-2 mb-4">
          <TabButton active={tab === 'conquest'} onClick={() => setTab('conquest')}>
            {t('heroes.detail.tab.conquest', { defaultValue: 'Conquest' })}
          </TabButton>
          <TabButton active={tab === 'expedition'} onClick={() => setTab('expedition')}>
            {t('heroes.detail.tab.expedition', { defaultValue: 'Expedition' })}
          </TabButton>
        </div>
        {tab === 'conquest' ? (
          <ConquestPanel data={hero.conquest} heroName={hero.name} />
        ) : (
          <ExpeditionPanel data={hero.expedition} heroName={hero.name} />
        )}
      </section>

      {/* ── Mythic-only Exclusive Gear ── */}
      {hero.rarity === 'mythic' && hero.exclusiveGear && (
        <ExclusiveGearSection gear={hero.exclusiveGear} heroName={hero.name} />
      )}

      {/* ── Upgrade Costs ── */}
      <UpgradeCostsSection hero={hero} />

      {/* Sources are surfaced in the banner as "Unlock: …" — no standalone
          card here on purpose. */}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ConquestPanel({ data, heroName }: { data: HeroData['conquest']; heroName: string }) {
  // Wave 19: BASE STATS moved into the hero banner.
  // Wave 21: now rendered INSIDE the parent skills card — no own card.
  return (
    <div className="space-y-3">
      {data.skills.map((s) => <SkillRow key={s.name} skill={s} heroName={heroName} />)}
    </div>
  )
}

/**
 * ATK / DEF / HP stats inline in the hero banner.
 *
 * Wave 22: matches the dashboard UserHero <Stat /> component EXACTLY — big
 * mono numeral with a tracked small-caps label below, no framed pills, no
 * colored card-style backgrounds. Tints are subtle on the numeral only so
 * the card still feels gold-trimmed and warm (not a colorful dashboard).
 */
function BannerStats({ stats }: { stats: HeroData['conquest']['baseStats'] }) {
  const { t } = useTranslation()
  const entries: Array<{
    key: string
    label: string
    value: number | null
    tint: 'crimson' | 'steel' | 'cream'
  }> = [
    { key: 'atk', label: t('heroes.detail.stat.atk', { defaultValue: 'ATK' }), value: stats.atk, tint: 'crimson' },
    { key: 'def', label: t('heroes.detail.stat.def', { defaultValue: 'DEF' }), value: stats.def, tint: 'steel'   },
    { key: 'hp',  label: t('heroes.detail.stat.hp',  { defaultValue: 'HP'  }), value: stats.hp,  tint: 'cream'   },
  ]
  if (entries.every((e) => e.value == null)) return null
  const tintCls = {
    crimson: 'text-crimson-glow',
    steel:   'text-[#9fb2cc]',
    cream:   'text-ink-cream',
  }
  return (
    <div className="mt-3 flex items-end gap-5 sm:gap-7">
      {entries.map((e) => (
        <div key={e.key} className="flex flex-col items-start">
          <span className={`font-mono text-xl sm:text-2xl tabular-nums leading-none ${tintCls[e.tint]}`}>
            {e.value != null ? e.value.toLocaleString('en-US') : '—'}
          </span>
          <span className="mt-1 text-[9px] sm:text-[10px] tracking-[0.28em] uppercase font-semibold text-ink-mute">
            {e.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function ExpeditionPanel({ data, heroName }: { data: HeroData['expedition']; heroName: string }) {
  const { t } = useTranslation()
  // Wave 21: skills + bonuses now rendered as sub-sections inside the parent
  // tabbed card. Bonuses get a soft divider above them instead of a new card.
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {data.skills.map((s) => <SkillRow key={s.name} skill={s} heroName={heroName} />)}
      </div>
      {data.bonuses.length > 0 && (
        <div className="pt-3 border-t border-gold/10">
          <div className="eyebrow mb-2">
            {t('heroes.detail.expeditionBonuses', { defaultValue: 'Expedition Bonuses' })}
          </div>
          <ul className="divide-y divide-gold/10">
            {data.bonuses.map((b) => (
              <li
                key={b.label}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-ink-cream">{b.label}</span>
                <span className="font-mono text-sm text-gold-soft">{b.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ExclusiveGearSection({ gear, heroName }: { gear: ExclusiveGear; heroName: string }) {
  const { t } = useTranslation()
  const stats = useMemo(() => collectGearStats(gear.stats, t), [gear.stats, t])
  const [gearTab, setGearTab] = useState<'conquest' | 'expedition'>('conquest')

  // Gear skills always come as 1 conquest + 1 expedition for mythics; the
  // tab interaction mirrors the main Conquest/Expedition tabs above so the
  // page reads consistently. Falls back gracefully if a hero has them in
  // a different shape (filters by mode).
  const conquestGearSkills = gear.skills.filter((s) => s.mode === 'conquest')
  const expeditionGearSkills = gear.skills.filter((s) => s.mode === 'expedition')

  return (
    <section className="card-hero card-hero--violet p-5 sm:p-6">
      {/* Header — centered icon + label + gear name, like a featured item card. */}
      <div className="flex flex-col items-center text-center gap-3">
        {gear.iconUrl && (
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-violet-400/40 bg-bg-deep/60 shadow-[0_0_18px_-4px_rgba(155,140,255,0.45)]">
            <img
              src={gear.iconUrl}
              alt={gear.name ?? 'Exclusive Gear'}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          </div>
        )}
        <div>
          <div className="eyebrow" style={{ color: 'rgba(180,165,255,1)' }}>
            {t('heroes.detail.exclusiveGear', { defaultValue: 'Exclusive Gear' })}
          </div>
          {gear.name && (
            <h2 className="font-display hero-title text-xl sm:text-2xl mt-0.5">
              {gear.name}
            </h2>
          )}
        </div>
      </div>

      {stats.length > 0 && (
        <div className="mt-5 rounded-xl border border-gold/15 bg-bg-card/40 p-4">
          <div className="eyebrow mb-2 text-center">{t('heroes.detail.gearMaxStats', { defaultValue: 'Max Level Stats' })}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map((e) => (
              <div key={e.key} className="flex flex-col items-center text-center">
                <span className="eyebrow text-[10px]">{e.label}</span>
                <span className="font-mono text-sm text-gold-soft">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gear.bonuses.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow mb-2 text-center">{t('heroes.detail.gearBonuses', { defaultValue: 'Bonuses' })}</div>
          <ul className="space-y-1.5">
            {gear.bonuses.map((b) => (
              <li key={b} className="flex items-center justify-center gap-2 text-sm text-ink-cream">
                <span aria-hidden className="h-1 w-1 rounded-full bg-gold-soft/70" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {gear.skills.length > 0 && (
        <div className="mt-5">
          <div className="eyebrow mb-2 text-center">{t('heroes.detail.gearSkills', { defaultValue: 'Gear Skills' })}</div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <TabButton active={gearTab === 'conquest'} onClick={() => setGearTab('conquest')}>
              {t('heroes.detail.tab.conquest', { defaultValue: 'Conquest' })}
            </TabButton>
            <TabButton active={gearTab === 'expedition'} onClick={() => setGearTab('expedition')}>
              {t('heroes.detail.tab.expedition', { defaultValue: 'Expedition' })}
            </TabButton>
          </div>
          <div className="space-y-3">
            {(gearTab === 'conquest' ? conquestGearSkills : expeditionGearSkills).map((s) => (
              <SkillRow key={s.name} skill={s} heroName={heroName} />
            ))}
            {(gearTab === 'conquest' ? conquestGearSkills : expeditionGearSkills).length === 0 && (
              <p className="text-center text-xs text-ink-mute italic py-4">
                {t('heroes.detail.gearNoSkillForMode', { defaultValue: 'No gear skill in this mode.' })}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Strip narrative fluff from a scraped skill description so it reads as a
 * crisp game-mechanic line. Two rules, applied in order:
 *   1. Strip a leading "{Hero}[s|'s]? " prefix.
 *   2. If the text contains "followed by …", drop everything before it.
 *   3. If the text has a ", dealing/increasing/etc" clause at offset ≥35,
 *      drop the prose lead-in and convert the verb to imperative form.
 * Short descriptions where the action IS the mechanic (e.g. "Throws her
 * spear, dealing …") are preserved.
 *
 * Wave 21 — Salles' direction: focus only on what the skill DOES, not its
 * cinematic setup.
 */
const EFFECT_VERB_RE =
  /\b(dealing|increasing|reducing|healing|restoring|boosting|granting|causing|inflicting|recovering|preventing|stunning|knocking|gaining)\b/i
const IMPERATIVE_MAP: Record<string, string> = {
  dealing: 'Deal',
  increasing: 'Increase',
  reducing: 'Reduce',
  healing: 'Heal',
  restoring: 'Restore',
  boosting: 'Boost',
  granting: 'Grant',
  causing: 'Cause',
  inflicting: 'Inflict',
  recovering: 'Recover',
  preventing: 'Prevent',
  stunning: 'Stun',
  knocking: 'Knock',
  gaining: 'Gain',
}

function simplifyDescription(text: string, heroName: string): string {
  if (!text) return ''
  let t = text.trim()
  // Strip "Hero " or "Hero's " or "Heros " from the start (case-insensitive).
  const escaped = heroName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  t = t.replace(new RegExp(`^${escaped}(?:'s|s|s')?\\s+`, 'i'), '')

  // Followed-by collapses long narrative leads → keep what's actionable.
  const fb = t.match(/\bfollowed by\s+/i)
  if (fb && fb.index !== undefined) {
    t = t.slice(fb.index + fb[0].length)
  }

  // Comma + effect verb at offset ≥35 = lead-in is mostly prose; strip it
  // and convert the verb to imperative.
  const em = t.match(new RegExp(`,\\s+(${EFFECT_VERB_RE.source.slice(2, -2)})`, 'i'))
  if (em && em.index !== undefined && em.index >= 35) {
    const after = t.slice(em.index + 2) // skip ", "
    t = after.replace(EFFECT_VERB_RE, (m) => IMPERATIVE_MAP[m.toLowerCase()] ?? m)
  }

  return t.charAt(0).toUpperCase() + t.slice(1)
}

function SkillRow({
  skill,
  heroName,
  showMode = false,
}: {
  skill: HeroSkill
  heroName: string
  showMode?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gold/10 bg-bg-card/40 p-3">
      <div className="shrink-0 h-14 w-14 rounded-lg overflow-hidden border border-gold/25 bg-bg-deep/60 flex items-center justify-center">
        {skill.iconUrl ? (
          <ChainedImage
            sources={[skill.iconUrl]}
            alt={skill.name}
            className="h-full w-full object-cover"
            fallback={<Lightning size={22} weight="duotone" className="text-gold-soft/70" />}
          />
        ) : (
          <Lightning size={22} weight="duotone" className="text-gold-soft/70" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base text-ink-cream tracking-wide leading-tight">
            {skill.name}
          </h3>
          {showMode && skill.mode && skill.mode !== 'unknown' && (
            <span
              className={cn(
                'badge text-[9px] px-2 py-0.5 uppercase tracking-wider',
                skill.mode === 'conquest'
                  ? 'bg-crimson/20 border-crimson/50 text-crimson-glow'
                  : 'bg-gold/20 border-gold/45 text-gold',
              )}
            >
              {skill.mode === 'conquest'
                ? t('heroes.detail.mode.conquest', { defaultValue: 'Conquest' })
                : t('heroes.detail.mode.expedition', { defaultValue: 'Expedition' })}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-cream leading-relaxed">{simplifyDescription(skill.description, heroName)}</p>
        {skill.upgradeTiers.length > 0 && (
          <div className="mt-2">
            <div className="eyebrow text-[10px] mb-1">
              {t('heroes.detail.upgradePreview', { defaultValue: 'Upgrade Preview' })}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {skill.upgradeTiers.map((tier, i) => (
                <span
                  key={`${tier}-${i}`}
                  className="inline-flex items-center rounded-md border border-gold/30 bg-gold/15 px-1.5 py-0.5 font-mono text-[10px] text-gold-soft"
                >
                  {tier}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// StatTile removed in Wave 19 — base stats now render as <BannerStats /> in
// the hero banner card. Standalone tile is no longer needed.

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg sm:text-xl text-ink-cream tracking-wider leading-none">
      {children}
    </h2>
  )
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 sm:flex-none inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
        active
          ? 'bg-gold/20 border-gold/55 text-gold shadow-[0_0_18px_-4px_rgba(212,175,55,0.45)]'
          : 'border-gold/15 bg-bg-card/40 text-ink-mute hover:border-gold/35 hover:text-gold-soft',
      )}
    >
      {children}
    </button>
  )
}

function RarityChip({ rarity }: { rarity: Rarity }) {
  const { t } = useTranslation()
  const label =
    rarity === 'rare' ? t('heroes.detail.rarity.rare', { defaultValue: 'Rare' })
    : rarity === 'epic' ? t('heroes.detail.rarity.epic', { defaultValue: 'Epic' })
    : t('heroes.detail.rarity.mythic', { defaultValue: 'Mythic' })
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        RARITY_CHIP[rarity],
      )}
    >
      {label}
    </span>
  )
}

/**
 * Image that walks down a list of candidate URLs (skipping nulls), showing the
 * first that loads. Falls back to a provided node when all candidates fail.
 * Used so we prefer the locally bundled asset and fall through to the scraped
 * remote portrait, then to an icon placeholder.
 */
function ChainedImage({
  sources, alt, className, fallback,
}: {
  sources: Array<string | null | undefined>
  alt: string
  className?: string
  fallback: React.ReactNode
}) {
  const candidates = useMemo(
    () => sources.filter((s): s is string => typeof s === 'string' && s.length > 0),
    [sources],
  )
  const [index, setIndex] = useState(0)
  if (candidates.length === 0 || index >= candidates.length) return <>{fallback}</>
  return (
    <img
      src={candidates[index]}
      alt={alt}
      loading="lazy"
      className={cn('select-none', className)}
      onError={() => setIndex((i) => i + 1)}
    />
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type GearStatKey = keyof ExclusiveGearStats
interface GearStatEntry { key: GearStatKey; label: string; value: string }

function collectGearStats(
  stats: ExclusiveGearStats,
  t: ReturnType<typeof useTranslation>['t'],
): GearStatEntry[] {
  const order: Array<[GearStatKey, string, string]> = [
    ['power', 'heroes.detail.gearStat.power', 'Power'],
    ['heroAtk', 'heroes.detail.gearStat.heroAtk', 'Hero ATK'],
    ['heroDef', 'heroes.detail.gearStat.heroDef', 'Hero DEF'],
    ['heroHp', 'heroes.detail.gearStat.heroHp', 'Hero HP'],
    ['escortAtk', 'heroes.detail.gearStat.escortAtk', 'Escort ATK'],
    ['escortDef', 'heroes.detail.gearStat.escortDef', 'Escort DEF'],
    ['escortHp', 'heroes.detail.gearStat.escortHp', 'Escort HP'],
  ]
  const out: GearStatEntry[] = []
  for (const [key, i18nKey, fallback] of order) {
    const raw = stats[key]
    if (raw == null) continue
    out.push({ key, label: t(i18nKey, { defaultValue: fallback }), value: raw.toLocaleString('en-US') })
  }
  return out
}

// ─── Upgrade Costs ─────────────────────────────────────────────────────────
// Tabbed cost panel (Stars / Skills / Widgets) — same TabButton interaction
// as Conquest/Expedition above so the page reads consistently. Widgets tab
// only renders for Mythic heroes. All editorial footnotes and the KPI
// summary tiles were dropped in Wave 19 — the cost tables stand on their own.

type CostTab = 'stars' | 'skills' | 'widgets'

function UpgradeCostsSection({ hero }: { hero: HeroData }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<CostTab>('stars')
  const hasWidgets = hero.rarity === 'mythic'

  return (
    <section className="card-hero card-hero--steel p-4 sm:p-5">
      <SectionHeading>
        {t('heroes.detail.upgradeCosts', { defaultValue: 'Upgrade Costs' })}
      </SectionHeading>

      {/* Tabs — Stars / Skills / Widgets (Widgets hidden on non-mythic). */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TabButton active={tab === 'stars'} onClick={() => setTab('stars')}>
          <Star size={12} weight="fill" className="mr-1.5 inline" />
          {t('heroes.detail.cost.tab.stars', { defaultValue: 'Stars' })}
        </TabButton>
        <TabButton active={tab === 'skills'} onClick={() => setTab('skills')}>
          <BookOpen size={12} weight="fill" className="mr-1.5 inline" />
          {t('heroes.detail.cost.tab.skills', { defaultValue: 'Skills' })}
        </TabButton>
        {hasWidgets && (
          <TabButton active={tab === 'widgets'} onClick={() => setTab('widgets')}>
            <PuzzlePiece size={12} weight="fill" className="mr-1.5 inline" />
            {t('heroes.detail.cost.tab.widgets', { defaultValue: 'Widgets' })}
          </TabButton>
        )}
      </div>

      {/* Active tab content */}
      <div className="mt-4">
        {tab === 'stars' && <StarsPanel hero={hero} />}
        {tab === 'skills' && <SkillsPanel hero={hero} />}
        {tab === 'widgets' && hasWidgets && <WidgetsPanel hero={hero} />}
      </div>
    </section>
  )
}

function StarsPanel({ hero }: { hero: HeroData }) {
  const itemName = starShardItemNameSafe(hero)
  const icon = starShardIcon(hero.rarity, hero.name)
  return (
    <div className="space-y-3">
      <ItemHeader icon={icon} name={itemName} />
      <CostTable
        rows={STAR_SHARD_COSTS.map((tier) => ({
          label: `★${tier.tier}`,
          qty: tier.qty,
          cumulative: tier.cumulative,
        }))}
      />
    </div>
  )
}

function SkillsPanel({ hero }: { hero: HeroData }) {
  return (
    <div className="space-y-3">
      <ItemHeader
        icons={[skillBookIcon(hero.rarity, 'conquest'), skillBookIcon(hero.rarity, 'expedition')]}
        name={`${skillBookItemName(hero.rarity, 'conquest')} · ${skillBookItemName(hero.rarity, 'expedition')}`}
      />
      <CostTable
        rows={SKILL_BOOK_COSTS.map((s) => ({
          label: `Lv ${s.from} → ${s.to}`,
          qty: s.qty,
          cumulative: null,
        }))}
      />
    </div>
  )
}

function WidgetsPanel({ hero }: { hero: HeroData }) {
  const gearName = hero.exclusiveGear?.name ?? null
  const name = gearName ? `${gearName} Widget` : `${hero.name}'s Widget`
  return (
    <div className="space-y-3">
      <ItemHeader icon={widgetChestIcon(hero.generation)} name={name} />
      <CostTable
        rows={WIDGET_COSTS.map((w) => ({
          label: `Lv ${w.level}`,
          qty: w.qty,
          cumulative: WIDGET_COSTS.slice(0, w.level).reduce((s, c) => s + c.qty, 0),
        }))}
      />
    </div>
  )
}

/** Item icon + name strip rendered at the top of each cost tab. */
function ItemHeader({
  icon,
  icons,
  name,
}: {
  icon?: string | null
  icons?: Array<string | null | undefined>
  name: string
}) {
  const list = (icons ?? [icon]).filter(Boolean) as string[]
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-gold/12 bg-bg-deep/40 p-2.5">
      {list.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          {list.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className="h-8 w-8 rounded-md object-contain border border-gold/15 bg-bg-deep/60"
            />
          ))}
        </div>
      )}
      <span className="text-sm text-ink-cream truncate" title={name}>
        {name}
      </span>
    </div>
  )
}

/** Hero shard item name with a safe fallback for the Amadeus/Helga exclusives. */
function starShardItemNameSafe(hero: HeroData): string {
  return (
    starShardIcon(hero.rarity, hero.name)
      ? `${hero.rarity[0].toUpperCase()}${hero.rarity.slice(1)} General Hero Shard`
      : `${hero.name} Shards`
  )
}

// CostKpi + CostSubHeading removed in Wave 19. The 3-tab UpgradeCostsSection
// renders the cost tables on their own — no summary tiles, no editorial notes.

interface CostRow {
  label: string
  qty: number | null
  cumulative: number | null
}

/**
 * Tier / Qty / Cumulative table used inside the cost tabs. No more `unit`
 * column header label or footnotes — those were noise. The cumulative column
 * is hidden on mobile to keep the row readable.
 */
function CostTable({ rows }: { rows: CostRow[] }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-hidden rounded-xl border border-gold/12 bg-bg-deep/40">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gold/10 text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          <tr>
            <th className="px-3 py-1.5 font-medium">
              {t('heroes.detail.cost.col.tier', { defaultValue: 'Tier' })}
            </th>
            <th className="px-3 py-1.5 text-right font-medium">
              {t('heroes.detail.cost.col.qty', { defaultValue: 'Qty' })}
            </th>
            <th className="px-3 py-1.5 text-right font-medium hidden sm:table-cell">
              {t('heroes.detail.cost.col.cumulative', { defaultValue: 'Cumulative' })}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gold/8">
          {rows.map((row) => (
            <tr key={row.label} className="text-ink-cream">
              <td className="px-3 py-1.5 font-mono text-gold-soft">{row.label}</td>
              <td className="px-3 py-1.5 text-right font-mono">
                {row.qty == null ? '—' : row.qty.toLocaleString('en-US')}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-ink-mute hidden sm:table-cell">
                {row.cumulative == null ? '—' : row.cumulative.toLocaleString('en-US')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
