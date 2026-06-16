#!/usr/bin/env node
/**
 * DAD War Room — i18n revert tool
 *
 * One-shot script to undo bad translations that contaminated locale files.
 * For each non-EN locale, finds values containing any forbidden substring
 * OR matching a forbidden regex AND restores them from en.json.
 *
 * Usage:
 *   node scripts/i18n/revert-bad-translations.mjs
 *   node scripts/i18n/revert-bad-translations.mjs --dry-run
 *   node scripts/i18n/revert-bad-translations.mjs pt es   # specific locales
 *
 * After running, re-run `npm run i18n:translate` to fill the reverted keys
 * via the strengthened dont-translate.json (now in 3-mode schema).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const LOCALES_DIR = path.join(ROOT, 'src/locales')

const ALL_TARGETS = ['pt', 'es', 'fr', 'de', 'ru', 'tr', 'ar', 'zh', 'ko', 'ja']
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const requested = args.filter((a) => !a.startsWith('--'))
const TARGETS = requested.length ? requested : ALL_TARGETS

// Patterns that prove a value was wrongly translated
const BAD_SUBSTRINGS = [
  'PAPAI', 'GRANDÃO', 'GRANDAO', 'GRANDÃOS', 'PAPAIZ',
  'Bate-papo', 'Bate papo', 'BATE-PAPO', 'BATEPAPO', 'Bater papo',
  'Charla', // ES often translates "Chat" to "Charla"
  'Bavardage', // FR
  'Plaudern', 'Plauderei', // DE
  'Болтовня', // RU
  'Sohbet', // TR — actually fine usage, but the gamer norm is "Chat"; remove if local convention says otherwise
]
const BAD_REGEX = [
  /^Reino\s+\d+$/i,          // "Reino 1652" — should stay "Kingdom 1652"
  /^Reich\s+\d+$/i,          // DE
  /^Royaume\s+\d+$/i,        // FR
  /^Reino\s+\d+$/i,          // ES/PT
  /^Королевство\s+\d+$/i,    // RU
  /^Krallık\s+\d+$/i,        // TR
  /^مملكة\s+\d+$/i,          // AR
  /^王国\s*\d+$/i,            // ZH/JA
  /^왕국\s*\d+$/i,            // KO
]

function flatten(obj, prefix = '', out = []) {
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    const p = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out)
    else out.push([p, v])
  }
  return out
}
function setByPath(obj, p, value) {
  const segs = p.split('.')
  let cur = obj
  for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]]
  cur[segs[segs.length - 1]] = value
}

function isBad(value) {
  if (typeof value !== 'string') return false
  for (const sub of BAD_SUBSTRINGS) if (value.includes(sub)) return true
  for (const re of BAD_REGEX) if (re.test(value)) return true
  return false
}

const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
const enFlat = Object.fromEntries(flatten(en))

console.log('DAD War Room · i18n revert')
console.log(`  Targets: ${TARGETS.join(', ')}`)
if (DRY_RUN) console.log('  DRY RUN — no files will be written')
console.log()

for (const lang of TARGETS) {
  const localePath = path.join(LOCALES_DIR, `${lang}.json`)
  if (!fs.existsSync(localePath)) continue
  const loc = JSON.parse(fs.readFileSync(localePath, 'utf8'))
  const flat = flatten(loc)

  const reverts = []
  for (const [p, v] of flat) {
    if (!isBad(v)) continue
    const enVal = enFlat[p]
    if (typeof enVal !== 'string') continue
    reverts.push({ path: p, before: v, after: enVal })
  }

  console.log(`→ ${lang.toUpperCase()}: ${reverts.length} reverts`)
  for (const r of reverts.slice(0, 8)) {
    console.log(`    ${r.path}`)
    console.log(`      before: ${JSON.stringify(r.before).slice(0, 100)}`)
    console.log(`      after : ${JSON.stringify(r.after).slice(0, 100)}`)
  }
  if (reverts.length > 8) console.log(`    … and ${reverts.length - 8} more`)

  if (!DRY_RUN && reverts.length) {
    for (const r of reverts) setByPath(loc, r.path, r.after)
    fs.writeFileSync(localePath, JSON.stringify(loc, null, 2) + '\n')
    console.log(`  ✓ wrote ${reverts.length} reverts to ${lang}.json`)
  }
}

console.log('\nDone. Now re-run `npm run i18n:translate` to fill the reverted keys via the strengthened dont-translate.json.')
