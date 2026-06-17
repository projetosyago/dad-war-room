#!/usr/bin/env node
/**
 * Scrape full hero data from kingshotdata.com.
 *
 * For each of the 34 canonical heroes (rare/epic/mythic gen 1-7), pulls the
 * WordPress post via REST API (?_embed gives us the featured image too) and
 * parses the rendered HTML into structured JSON.
 *
 * Output: src/data/heroes-data.json — keyed by slug, ready to import into
 * Heroes.tsx / HeroDetail.tsx. Skill icons are kept as remote URLs for v1;
 * a future pass can localize them to /public/images/icons/skills/.
 *
 * What we extract (per hero):
 *   - name, slug, rarity, generation (mythic only), class
 *   - sources (unlock methods)
 *   - conquest:
 *       baseStats: { atk, def, hp }
 *       skills: [{ name, iconUrl, description, upgradeTiers: [...] }]
 *   - expedition:
 *       skills: same shape
 *       bonuses: [{ label, value }]
 *   - exclusiveGear (mythic only):
 *       name, maxStats, bonuses, skills: [{ name, mode, ... }]
 *
 * What we DON'T extract:
 *   - Upgrade resource costs — kingshotdata.com doesn't have them; Salles
 *     will provide manually.
 *
 * Usage: node scripts/scrape-hero-details.mjs
 * Polite 300ms delay between requests. Idempotent — skips heroes already
 * in the output file unless --force is passed.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'src/data/heroes-data.json')

const FORCE = process.argv.includes('--force')

// Roster slugs use the names Salles confirmed. The kingshotdata.com slug
// sometimes differs (e.g., Amane's page is at /heroes/mikoto/) — we map via
// REMOTE_SLUG_OVERRIDES below. The display key in the JSON stays the canonical
// user-facing slug.
const REMOTE_SLUG_OVERRIDES = {
  amane: 'mikoto',
}

const ROSTER = {
  rare: ['olive', 'edwin', 'seth', 'forrest'],
  epic: ['amane', 'yeonwoo', 'fahd', 'chenko', 'gordon', 'diana', 'howard', 'quinn'],
  mythic: {
    1: ['jabel', 'amadeus', 'helga', 'saul'],
    2: ['hilde', 'zoe', 'marlin'],
    3: ['petra', 'jaeger', 'eric'],
    4: ['rosa', 'alcar', 'margot'],
    5: ['vivian', 'long-fei', 'thrud'],
    6: ['yang', 'triton', 'sophia'],
    7: ['wee-woo', 'charles', 'ava'],
  },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function stripHtml(s) {
  return (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTiers(text) {
  // Strip HTML first — closing tags like </mark> contain `/` and would pollute
  // the split. Then look for a "<keyword> Up: ..." prefix OR fall back to
  // matching the pattern of "N% / N% / N% / ..." directly.
  const stripped = stripHtml(text)
  const m =
    stripped.match(
      /(?:Damage|Healing|Skill|Effect|Reduction|Buff|Heal|Attack|Defense|Power|Block|Crit|Chance|Bonus|Stack|Duration)\s*Up\s*:\s*(.+)$/i,
    ) || stripped.match(/^[^:]*:\s*(.+)$/) // generic "Foo Up: …" / "Foo: …"
  const candidate = m ? m[1] : stripped
  const parts = candidate
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter((s) => /\d+%?$/.test(s) || /^\d+[.,]?\d*%?$/.test(s))
  return parts
}

function parseSkillsFromSection(sectionHtml) {
  // Each skill is: figure with img → h3 → paragraph description → paragraph
  // with "Upgrade Preview:" → paragraph with tier line.
  // We split by h3 boundaries to get one skill at a time.
  const blocks = []
  const headingRe = /<h3[^>]*>([^<]+)<\/h3>/g
  const matches = [...sectionHtml.matchAll(headingRe)]
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const start = m.index
    const next = matches[i + 1]
    const end = next ? next.index : sectionHtml.length
    const block = sectionHtml.slice(start, end)
    const name = stripHtml(m[1])

    // Icon — look backwards from the h3 for the nearest <img src=...>
    const before = sectionHtml.slice(0, start)
    const imgMatches = [...before.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)]
    const lastImg = imgMatches[imgMatches.length - 1]
    const iconUrl = lastImg ? lastImg[1].replace(/-\d+x\d+\.webp$/, '.webp') : null

    // Description — first paragraph after h3 that isn't "Upgrade Preview"
    const paras = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((p) =>
      p[1]
    )
    const descPara = paras.find((p) => !/Upgrade\s*Preview/i.test(p))
    const description = stripHtml(descPara || '')

    // Tier line — strip HTML before checking for `/` so we don't match `</mark>`
    // closing tags. The real tier line has multiple `\d+%` separated by ` / `.
    const tierPara = paras.find((p) => {
      const s = stripHtml(p)
      return /\d+%?\s*\/\s*\d+%?/.test(s)
    })
    const upgradeTiers = tierPara ? extractTiers(tierPara) : []

    blocks.push({ name, iconUrl, description, upgradeTiers })
  }
  return blocks
}

function parseStatsBlock(html) {
  // Hero Attack / Defense / Health pattern
  const grab = (label) => {
    const m = html.match(
      new RegExp(`<strong>${label}:?\\s*<\\/strong>\\s*([\\d,.]+)`, 'i'),
    )
    return m ? parseFloat(m[1].replace(/,/g, '')) : null
  }
  return {
    atk: grab('Hero Attack'),
    def: grab('Hero Defense'),
    hp: grab('Hero Health'),
  }
}

function parseBonuses(html) {
  // "Cavalry Attack: +290.23%" patterns. Catch any "<label>: <value>"
  // line that contains a %.
  const matches = [
    ...html.matchAll(/<strong>([A-Za-z ]+):\s*<\/strong>\s*([+\-]?[\d.,]+%)/g),
  ]
  return matches
    .filter((m) => !/Hero (Attack|Defense|Health)/i.test(m[1]))
    .map((m) => ({ label: stripHtml(m[1]).trim(), value: m[2].trim() }))
}

function parseSources(html) {
  // First <ul> after Sources heading
  const sectionStart = html.indexOf('Sources')
  if (sectionStart < 0) return []
  const ulMatch = html.slice(sectionStart).match(/<ul[^>]*>([\s\S]*?)<\/ul>/)
  if (!ulMatch) return []
  return [...ulMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) =>
    stripHtml(m[1]),
  )
}

function splitByH2(html) {
  const sections = {}
  const headings = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)]
  for (let i = 0; i < headings.length; i++) {
    const m = headings[i]
    const name = stripHtml(m[1])
    const start = m.index + m[0].length
    const next = headings[i + 1]
    const end = next ? next.index : html.length
    sections[name.toLowerCase()] = html.slice(start, end)
  }
  return sections
}

function parseExclusiveGear(html) {
  // Gear section starts with "Exclusive Gear" h2. Contains:
  //   gear name (h3 or strong?), Max Level Stats block, then 2 skill blocks
  //   ("Weighted Deck – Conquest Skill", "Cosmic Eye – Expedition Skill")
  if (!html) return null

  // Gear name lives in `<p ...><strong>{name}</strong></p>` right before the
  // "Max Level Stats" h3. We scan the section's <strong> tags and skip the
  // stat labels (Power, Hero Attack, etc) and skill-suffix headings.
  let gearName = null
  const strongTags = [...html.matchAll(/<strong>([^<]+)<\/strong>/g)]
  for (const s of strongTags) {
    const name = stripHtml(s[1])
      .replace(/:$/, '')
      .trim()
    if (
      /^(Power|Hero Attack|Hero Defense|Hero Health|Escort Attack|Escort Defense|Escort Health|Upgrade Preview|Cavalry Attack|Cavalry Defense|Cavalry Lethality|Cavalry Health|Infantry Attack|Infantry Defense|Infantry Lethality|Infantry Health|Archer Attack|Archer Defense|Archer Lethality|Archer Health|Damage Up|Healing Up|Effect Up|Skill Up|Reduction Up|Buff Up)$/i.test(
        name,
      )
    )
      continue
    // First real word string survives.
    gearName = name
    break
  }

  // Max stats — same pattern as base stats
  const stats = {
    power: null,
    heroAtk: null,
    heroDef: null,
    heroHp: null,
    escortAtk: null,
    escortDef: null,
    escortHp: null,
  }
  const m = (label) => {
    const re = new RegExp(
      `<strong>${label}:?\\s*<\\/strong>\\s*([\\d,.]+)`,
      'i',
    )
    const found = html.match(re)
    return found ? parseFloat(found[1].replace(/,/g, '')) : null
  }
  stats.power = m('Power')
  stats.heroAtk = m('Hero Attack')
  stats.heroDef = m('Hero Defense')
  stats.heroHp = m('Hero Health')
  stats.escortAtk = m('Escort Attack')
  stats.escortDef = m('Escort Defense')
  stats.escortHp = m('Escort Health')

  const bonuses = parseBonuses(html)
    .filter((b) => !/Hero|Escort|Power/i.test(b.label))
    .map((b) => `${b.label} ${b.value}`)

  // Skills — each h3 has " – Conquest Skill" or " – Expedition Skill" suffix.
  // Filter out the gear-name h3 itself and the "Max Level Stats" boilerplate.
  const skillBlocks = parseSkillsFromSection(html).filter((s) => {
    if (gearName && s.name === gearName) return false
    if (/^Max\s*Level\s*Stats$/i.test(s.name)) return false
    if (/^Upgrade\s*Preview$/i.test(s.name)) return false
    return true
  })
  const skills = skillBlocks.map((s) => {
    const mode = /Expedition/i.test(s.name)
      ? 'expedition'
      : /Conquest/i.test(s.name)
      ? 'conquest'
      : 'unknown'
    const cleanName = s.name
      .replace(/\s*[–-]\s*(Conquest|Expedition)\s*Skill\s*$/i, '')
      .trim()
    return { ...s, name: cleanName, mode }
  })

  return { name: gearName, stats, bonuses, skills }
}

function parseLeadParagraph(html) {
  // First paragraph: "Petra is a Mythic-quality Generation 3 Hero in Kingshot,
  // classified under the Cavalry class."
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/)
  if (!m) return { class: null }
  const text = stripHtml(m[1])
  const classMatch = text.match(
    /classified under the ([A-Z][a-z]+(?:\/[A-Z][a-z]+)?)\s*class/i,
  )
  return { class: classMatch ? classMatch[1] : null, lead: text }
}

function parseHero(post, meta) {
  const html = post.content.rendered
  const lead = parseLeadParagraph(html)
  const sections = splitByH2(html)
  const conquestHtml = sections['conquest'] || ''
  const expeditionHtml = sections['expedition'] || ''
  const gearHtml = sections['exclusive gear'] || ''

  return {
    name: stripHtml(post.title.rendered),
    slug: post.slug,
    rarity: meta.rarity,
    generation: meta.generation ?? null,
    class: lead.class,
    sources: parseSources(html),
    portrait:
      post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
    conquest: {
      baseStats: parseStatsBlock(conquestHtml),
      skills: parseSkillsFromSection(conquestHtml),
    },
    expedition: {
      skills: parseSkillsFromSection(expeditionHtml),
      bonuses: parseBonuses(expeditionHtml),
    },
    exclusiveGear: gearHtml ? parseExclusiveGear(gearHtml) : null,
    scrapedAt: '2026-06-17',
    sourceUrl: post.link,
  }
}

async function fetchHero(slug) {
  const remoteSlug = REMOTE_SLUG_OVERRIDES[slug] || slug
  const url = `https://kingshotdata.com/wp-json/wp/v2/posts?slug=${remoteSlug}&_embed=wp:featuredmedia`
  const r = await fetch(url, {
    headers: { 'user-agent': 'dad-war-room-hero-scraper/1.0' },
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const arr = await r.json()
  if (!arr.length) throw new Error('no post matched')
  return arr[0]
}

function flattenRoster() {
  const out = []
  for (const slug of ROSTER.rare) out.push({ slug, rarity: 'rare' })
  for (const slug of ROSTER.epic) out.push({ slug, rarity: 'epic' })
  for (const [gen, slugs] of Object.entries(ROSTER.mythic)) {
    for (const slug of slugs) out.push({ slug, rarity: 'mythic', generation: Number(gen) })
  }
  return out
}

async function main() {
  const list = flattenRoster()
  console.log(`Scraping ${list.length} hero detail pages…`)

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  let existing = {}
  if (fs.existsSync(OUT) && !FORCE) {
    try {
      existing = JSON.parse(fs.readFileSync(OUT, 'utf-8'))
    } catch {}
  }

  const out = { ...existing }
  let okCount = 0
  let skipCount = 0
  let failCount = 0

  for (const item of list) {
    if (out[item.slug] && !FORCE) {
      skipCount++
      process.stdout.write('-')
      continue
    }
    try {
      const post = await fetchHero(item.slug)
      out[item.slug] = parseHero(post, item)
      okCount++
      process.stdout.write('.')
    } catch (err) {
      failCount++
      console.error(`\n× ${item.slug}: ${err.message}`)
    }
    await sleep(300)
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log('\n=== Done ===')
  console.log(`  ok: ${okCount}`)
  console.log(`  skipped (re-run with --force to refetch): ${skipCount}`)
  console.log(`  failed: ${failCount}`)
  console.log(`Output: ${OUT}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
