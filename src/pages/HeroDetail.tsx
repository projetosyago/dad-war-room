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
  Coins,
  PuzzlePiece,
} from '@phosphor-icons/react'
import { cn } from '../lib/cn'
import heroesData from '../data/heroes-data.json'
import {
  STAR_SHARD_COSTS,
  SKILL_BOOK_COSTS,
  WIDGET_COSTS,
  STAR_SHARD_TOTAL_KNOWN,
  SKILL_BOOK_TOTAL_PER_SKILL,
  WIDGET_TOTAL,
  skillBookItemName,
  skillBookIcon,
  starShardIcon,
  widgetChestIcon,
  summarizeHeroCosts,
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

const RARITY_CARD: Record<Rarity, string> = {
  rare: 'card-hero--success',
  epic: 'card-hero--violet',
  mythic: 'card-hero--crimson',
}
const RARITY_CHIP: Record<Rarity, string> = {
  rare: 'bg-gold/15 border-gold/45 text-gold',
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
    <div className="container-narrow pt-5 pb-12 sm:pt-8 sm:pb-16 space-y-4 sm:space-y-5">
      {/* ── Hero banner ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn('card-hero overflow-hidden', RARITY_CARD[hero.rarity])}
      >
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-5 sm:gap-7 p-5 sm:p-7">
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-gold/30 bg-bg-card/60">
            <ChainedImage
              sources={[localPortrait, hero.portrait]}
              alt={hero.name}
              className="h-full w-full object-cover"
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <User size={48} weight="duotone" className="text-gold-soft/60" />
                </div>
              }
            />
          </div>
          <div className="min-w-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <RarityChip rarity={hero.rarity} />
              {hero.rarity === 'mythic' && hero.generation != null && (
                <span className="badge-gold text-[10px] px-2 py-0.5">
                  {t('heroes.detail.gen', { defaultValue: 'Gen {{gen}}', gen: hero.generation })}
                </span>
              )}
              {hero.class && <span className="badge-mute text-[10px] px-2 py-0.5">{hero.class}</span>}
            </div>
            <h1 className="font-display hero-title text-3xl sm:text-4xl leading-tight">{hero.name}</h1>
            {hero.sources.length > 0 && (
              <p className="text-sm text-ink-mute leading-relaxed">
                <span className="eyebrow mr-1.5">{t('heroes.detail.unlock', { defaultValue: 'Unlock' })}:</span>
                {hero.sources.join(', ')}
              </p>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2">
        <TabButton active={tab === 'conquest'} onClick={() => setTab('conquest')}>
          {t('heroes.detail.tab.conquest', { defaultValue: 'Conquest' })}
        </TabButton>
        <TabButton active={tab === 'expedition'} onClick={() => setTab('expedition')}>
          {t('heroes.detail.tab.expedition', { defaultValue: 'Expedition' })}
        </TabButton>
      </div>

      {/* ── Tab content ── */}
      {tab === 'conquest' ? (
        <ConquestPanel data={hero.conquest} />
      ) : (
        <ExpeditionPanel data={hero.expedition} />
      )}

      {/* ── Mythic-only Exclusive Gear ── */}
      {hero.rarity === 'mythic' && hero.exclusiveGear && (
        <ExclusiveGearSection gear={hero.exclusiveGear} />
      )}

      {/* ── Upgrade Costs ── */}
      <UpgradeCostsSection hero={hero} />

      {/* ── Sources ── */}
      {hero.sources.length > 0 && (
        <section className="card-hero card-hero--steel p-5 sm:p-6">
          <SectionHeading>{t('heroes.detail.sources', { defaultValue: 'Sources' })}</SectionHeading>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-cream">
            {hero.sources.map((src) => (
              <li key={src} className="flex items-start gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 rounded-full bg-gold-soft/70" />
                <span>{src}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ConquestPanel({ data }: { data: HeroData['conquest'] }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="card-hero p-5 sm:p-6">
        <SectionHeading>{t('heroes.detail.baseStats', { defaultValue: 'Base Stats' })}</SectionHeading>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatTile label={t('heroes.detail.stat.atk', { defaultValue: 'ATK' })} value={data.baseStats.atk} />
          <StatTile label={t('heroes.detail.stat.def', { defaultValue: 'DEF' })} value={data.baseStats.def} />
          <StatTile label={t('heroes.detail.stat.hp', { defaultValue: 'HP' })} value={data.baseStats.hp} />
        </div>
      </section>
      <section className="card-hero p-5 sm:p-6">
        <SectionHeading>{t('heroes.detail.conquestSkills', { defaultValue: 'Conquest Skills' })}</SectionHeading>
        <div className="mt-3 space-y-3">
          {data.skills.map((s) => <SkillRow key={s.name} skill={s} />)}
        </div>
      </section>
    </div>
  )
}

function ExpeditionPanel({ data }: { data: HeroData['expedition'] }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="card-hero p-5 sm:p-6">
        <SectionHeading>{t('heroes.detail.expeditionSkills', { defaultValue: 'Expedition Skills' })}</SectionHeading>
        <div className="mt-3 space-y-3">
          {data.skills.map((s) => <SkillRow key={s.name} skill={s} />)}
        </div>
      </section>
      {data.bonuses.length > 0 && (
        <section className="card-hero p-5 sm:p-6">
          <SectionHeading>
            {t('heroes.detail.expeditionBonuses', { defaultValue: 'Expedition Bonuses' })}
          </SectionHeading>
          <ul className="mt-3 divide-y divide-gold/10">
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
        </section>
      )}
    </div>
  )
}

function ExclusiveGearSection({ gear }: { gear: ExclusiveGear }) {
  const { t } = useTranslation()
  const stats = useMemo(() => collectGearStats(gear.stats, t), [gear.stats, t])
  return (
    <section className="card-hero card-hero--violet p-5 sm:p-6">
      <SectionHeading>{t('heroes.detail.exclusiveGear', { defaultValue: 'Exclusive Gear' })}</SectionHeading>
      {gear.name && <div className="mt-2 hero-title text-xl sm:text-2xl">{gear.name}</div>}

      {stats.length > 0 && (
        <div className="mt-4 rounded-xl border border-gold/15 bg-bg-card/40 p-4">
          <div className="eyebrow mb-2">{t('heroes.detail.gearMaxStats', { defaultValue: 'Max Level Stats' })}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map((e) => (
              <div key={e.key} className="flex flex-col">
                <span className="eyebrow text-[10px]">{e.label}</span>
                <span className="font-mono text-sm text-gold-soft">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gear.bonuses.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow mb-2">{t('heroes.detail.gearBonuses', { defaultValue: 'Bonuses' })}</div>
          <ul className="space-y-1.5">
            {gear.bonuses.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-ink-cream">
                <span aria-hidden className="mt-2 h-1 w-1 rounded-full bg-gold-soft/70" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {gear.skills.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow mb-2">{t('heroes.detail.gearSkills', { defaultValue: 'Gear Skills' })}</div>
          <div className="space-y-3">
            {gear.skills.map((s) => <SkillRow key={s.name} skill={s} showMode />)}
          </div>
        </div>
      )}
    </section>
  )
}

function SkillRow({ skill, showMode = false }: { skill: HeroSkill; showMode?: boolean }) {
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
        <p className="mt-1 text-sm text-ink-cream leading-relaxed">{skill.description}</p>
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

function StatTile({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-gold/15 bg-bg-card/40 px-3 py-2.5 text-center">
      <div className="eyebrow text-[10px]">{label}</div>
      <div className="font-mono text-base sm:text-lg text-gold-soft mt-0.5">
        {value != null ? value.toLocaleString() : '—'}
      </div>
    </div>
  )
}

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
    out.push({ key, label: t(i18nKey, { defaultValue: fallback }), value: raw.toLocaleString() })
  }
  return out
}

// ─── Upgrade Costs ─────────────────────────────────────────────────────────
// Three-track upgrade cost panel. Data lives in src/data/hero-upgrade-costs.ts
// and is the same formula across all heroes — quantity tables don't vary by
// hero, only the item-name token changes per rarity (and per-hero for the two
// shard exclusives, Amadeus + Helga).

function UpgradeCostsSection({ hero }: { hero: HeroData }) {
  const { t } = useTranslation()
  const summary = useMemo(
    () =>
      summarizeHeroCosts({
        rarity: hero.rarity,
        name: hero.name,
        conquestSkillCount: hero.conquest.skills.length,
        expeditionSkillCount: hero.expedition.skills.length,
        exclusiveGearName: hero.exclusiveGear?.name ?? null,
      }),
    [hero],
  )

  return (
    <section className="card-hero card-hero--steel p-5 sm:p-6">
      <SectionHeading>
        {t('heroes.detail.upgradeCosts', { defaultValue: 'Upgrade Costs' })}
      </SectionHeading>

      {/* Summary tiles — at-a-glance totals for the full max-out journey.
          Each tile renders the actual in-game item icon (scraped from
          kingshotwiki.com) — that's what Salles wants to see, not generic
          Phosphor glyphs. Phosphor icon kept as eyebrow accent. */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <CostKpi
          icon={<Star size={18} weight="duotone" />}
          itemIcon={starShardIcon(hero.rarity, hero.name)}
          label={t('heroes.detail.cost.starsTotal', { defaultValue: 'Star Shards (★5)' })}
          qty={summary.starShards.qty}
          item={summary.starShards.item}
          tone="gold"
        />
        <CostKpi
          icon={<BookOpen size={18} weight="duotone" />}
          itemIcon={skillBookIcon(hero.rarity, 'conquest')}
          label={t('heroes.detail.cost.skillBooksTotal', { defaultValue: 'Skill Books' })}
          qty={summary.totalSkillBooks}
          item={t('heroes.detail.cost.skillBooksMixed', { defaultValue: 'mixed conquest + expedition' })}
          tone="violet"
        />
        {summary.widgets ? (
          <CostKpi
            icon={<PuzzlePiece size={18} weight="duotone" />}
            itemIcon={widgetChestIcon(hero.generation)}
            label={t('heroes.detail.cost.widgetsTotal', { defaultValue: 'Widgets (max gear)' })}
            qty={summary.widgets.qty}
            item={summary.widgets.item}
            tone="crimson"
          />
        ) : (
          <div className="rounded-xl border border-gold/10 bg-bg-card/40 p-3 flex items-center justify-center text-[10px] uppercase tracking-[0.16em] text-ink-mute text-center">
            {t('heroes.detail.cost.noWidgets', { defaultValue: 'Widgets — Mythic only' })}
          </div>
        )}
      </div>

      {/* Star upgrades */}
      <div className="mt-5">
        <CostSubHeading
          icon={<Star size={14} weight="fill" className="text-gold-soft" />}
          title={t('heroes.detail.cost.starUpgrades', { defaultValue: 'Star Upgrades' })}
          item={summary.starShards.item}
          itemIcons={[starShardIcon(hero.rarity, hero.name)]}
        />
        <CostTable
          rows={STAR_SHARD_COSTS.map((tier) => ({
            label: `★${tier.tier}`,
            qty: tier.qty,
            cumulative: tier.cumulative,
          }))}
          unit={t('heroes.detail.cost.shards', { defaultValue: 'shards' })}
          totalLabel={t(
            'heroes.detail.cost.totalKnown',
            'Total to ★5 (known): {{qty}} {{item}}',
            {
              qty: STAR_SHARD_TOTAL_KNOWN.toLocaleString('en-US'),
              item: summary.starShards.item,
            },
          )}
          footnote={t(
            'heroes.detail.cost.tier6Tbc',
            '★6 cost not yet published by kingshotdata — Salles will update.',
          )}
        />
      </div>

      {/* Skill upgrades */}
      <div className="mt-5">
        <CostSubHeading
          icon={<BookOpen size={14} weight="fill" className="text-gold-soft" />}
          title={t('heroes.detail.cost.skillUpgrades', { defaultValue: 'Skill Upgrades' })}
          item={t(
            'heroes.detail.cost.skillItems',
            '{{conquest}} & {{expedition}}',
            {
              conquest: skillBookItemName(hero.rarity, 'conquest'),
              expedition: skillBookItemName(hero.rarity, 'expedition'),
            },
          )}
          itemIcons={[
            skillBookIcon(hero.rarity, 'conquest'),
            skillBookIcon(hero.rarity, 'expedition'),
          ]}
        />
        <CostTable
          rows={SKILL_BOOK_COSTS.map((s) => ({
            label: `Lv ${s.from} → ${s.to}`,
            qty: s.qty,
            cumulative: null,
          }))}
          unit={t('heroes.detail.cost.books', { defaultValue: 'books per skill' })}
          totalLabel={t(
            'heroes.detail.cost.skillTotalBreakdown',
            'Per skill: {{per}} books. Conquest ({{cqty}}× {{citem}}) + Expedition ({{eqty}}× {{eitem}}) = {{total}}',
            {
              per: SKILL_BOOK_TOTAL_PER_SKILL,
              cqty: summary.conquestBooks.qty.toLocaleString('en-US'),
              citem: summary.conquestBooks.item,
              eqty: summary.expeditionBooks.qty.toLocaleString('en-US'),
              eitem: summary.expeditionBooks.item,
              total: summary.totalSkillBooks.toLocaleString('en-US'),
            },
          )}
          footnote={t(
            'heroes.detail.cost.skillFootnote',
            'Quantities are the same across rarities — only the book item changes (Rare / Epic / Mythic × Conquest / Expedition).',
          )}
        />
      </div>

      {/* Widget upgrades (Mythic only) */}
      {summary.widgets && (
        <div className="mt-5">
          <CostSubHeading
            icon={
              <PuzzlePiece size={14} weight="fill" className="text-gold-soft" />
            }
            title={t('heroes.detail.cost.widgetUpgrades', { defaultValue: 'Widget Upgrades' })}
            item={summary.widgets.item}
            itemIcons={[widgetChestIcon(hero.generation)]}
          />
          <CostTable
            rows={WIDGET_COSTS.map((w) => ({
              label: `Lv ${w.level}`,
              qty: w.qty,
              cumulative: WIDGET_COSTS.slice(0, w.level).reduce(
                (s, c) => s + c.qty,
                0,
              ),
            }))}
            unit={t('heroes.detail.cost.widgets', { defaultValue: 'widgets' })}
            totalLabel={t(
              'heroes.detail.cost.widgetTotal',
              'Total to max gear: {{qty}} {{item}}',
              { qty: WIDGET_TOTAL, item: summary.widgets.item },
            )}
            footnote={t(
              'heroes.detail.cost.widgetSources',
              'Sources: Buccaneer Bounty event, Mystery Shop, Hall of Heroes, Special Events, Packs.',
            )}
          />
        </div>
      )}

      {/* Confidence note — anchors the data trail for future contributors. */}
      <p className="mt-5 text-[10px] text-ink-mute italic">
        <Coins size={11} weight="duotone" className="inline mr-1" />
        {t(
          'heroes.detail.cost.dataSource',
          'Quantities from kingshotdata.com (hero-shards, widgets) and kingshotwiki.com (skill books), confirmed by Salles 2026-06-17.',
        )}
      </p>
    </section>
  )
}

function CostKpi({
  icon,
  itemIcon,
  label,
  qty,
  item,
  tone,
}: {
  icon: React.ReactNode
  /** Public path to the actual in-game item image, e.g. shard png. */
  itemIcon?: string | null
  label: string
  qty: number
  item: string
  tone: 'gold' | 'violet' | 'crimson'
}) {
  const toneCls = {
    gold: 'border-gold/30 text-gold-soft',
    violet: 'border-[rgba(155,140,255,0.30)] text-[rgba(180,165,255,1)]',
    crimson: 'border-crimson/35 text-crimson-glow',
  }[tone]
  return (
    <div
      className={cn(
        'rounded-xl border bg-bg-card/40 p-3 backdrop-blur-sm relative',
        toneCls,
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em]">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        {itemIcon && (
          <img
            src={itemIcon}
            alt={item}
            loading="lazy"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-md object-contain border border-gold/15 bg-bg-deep/50 shrink-0"
          />
        )}
        <span className="font-mono text-lg text-ink-cream">
          {qty.toLocaleString('en-US')}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-ink-mute truncate" title={item}>
        {item}
      </div>
    </div>
  )
}

function CostSubHeading({
  icon,
  title,
  item,
  itemIcons,
}: {
  icon: React.ReactNode
  title: string
  item: string
  /** Small inline icons rendered after the title — e.g. both skill book
   *  rarities for the Skill Upgrades sub-section. */
  itemIcons?: Array<string | null | undefined>
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="inline-flex items-center gap-1.5 font-display-clean text-[12px] uppercase tracking-[0.20em] text-gold-soft">
        {icon}
        {title}
      </span>
      {itemIcons && itemIcons.filter(Boolean).length > 0 && (
        <span className="inline-flex items-center gap-1">
          {itemIcons.filter(Boolean).map((src) => (
            <img
              key={src as string}
              src={src as string}
              alt=""
              loading="lazy"
              className="h-5 w-5 rounded-sm border border-gold/15 bg-bg-deep/50 object-contain"
            />
          ))}
        </span>
      )}
      <span className="text-[10px] text-ink-mute">— {item}</span>
    </div>
  )
}

interface CostRow {
  label: string
  qty: number | null
  cumulative: number | null
}

function CostTable({
  rows,
  unit,
  totalLabel,
  footnote,
}: {
  rows: CostRow[]
  unit: string
  totalLabel?: string
  footnote?: string
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-gold/12 bg-bg-deep/40">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gold/10 text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          <tr>
            <th className="px-3 py-1.5 font-medium">
              {t('heroes.detail.cost.col.tier', { defaultValue: 'Tier' })}
            </th>
            <th className="px-3 py-1.5 text-right font-medium">
              {t('heroes.detail.cost.col.qty', { defaultValue: 'Qty' })} ({unit})
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
                {row.qty === null ? (
                  <span className="text-ink-mute italic">
                    {t('heroes.detail.cost.tbc', { defaultValue: 'TBC' })}
                  </span>
                ) : (
                  row.qty.toLocaleString('en-US')
                )}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-ink-mute hidden sm:table-cell">
                {row.cumulative === null
                  ? '—'
                  : row.cumulative.toLocaleString('en-US')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(totalLabel || footnote) && (
        <div className="border-t border-gold/10 bg-bg-deep/60 px-3 py-2 text-[10px] text-ink-mute space-y-0.5">
          {totalLabel && <p className="text-ink-cream/85">{totalLabel}</p>}
          {footnote && <p>{footnote}</p>}
        </div>
      )}
    </div>
  )
}
