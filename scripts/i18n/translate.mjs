#!/usr/bin/env node
/**
 * DAD War Room — i18n auto-translator
 *
 * Reads src/locales/en.json (canonical) and for each target locale finds
 * keys whose value is still identical to the English source — these are
 * untranslated (i18next falls back to en for them today). Translates them
 * via a free, no-cost service (MyMemory by default; LibreTranslate optional)
 * and writes back to the target locale JSON files.
 *
 * Preserves:
 *   - Proper nouns / game terms from scripts/i18n/dont-translate.json
 *   - Interpolation placeholders like {{count}}, {{name}}
 *   - Inline tags such as <c>, <allianceLink>
 *
 * Strings that already differ between en and the target locale (= manually
 * translated earlier) are NEVER overwritten.
 *
 * Usage:
 *   npm run i18n:translate                       # all target locales
 *   node scripts/i18n/translate.mjs pt es        # specific locales
 *   npm run i18n:translate:dry                   # report only, no writes
 *
 * Env (read from .env.local OR process env):
 *   MYMEMORY_EMAIL          your email (anonymous works without it, but with
 *                           email you get 50K chars/day instead of 5K)
 *   LIBRETRANSLATE_URL      if set, uses LibreTranslate instead of MyMemory
 *   LIBRETRANSLATE_API_KEY  optional for LibreTranslate paid endpoints
 *
 * Cost: $0 forever. Free tier limits are per IP/day — script throttles itself
 * automatically. If you hit a limit, run again tomorrow or self-host
 * LibreTranslate (`docker run libretranslate/libretranslate`).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const LOCALES_DIR = path.join(ROOT, 'src/locales')

// Load .env.local if present so the script feels like the rest of the app
function loadDotEnvLocal() {
  const p = path.join(ROOT, '.env.local')
  if (!fs.existsSync(p)) return
  const txt = fs.readFileSync(p, 'utf8')
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    const [, k, vRaw] = m
    if (process.env[k] !== undefined) continue
    process.env[k] = vRaw.replace(/^['"]|['"]$/g, '')
  }
}
loadDotEnvLocal()

const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || ''
const LT_URL = process.env.LIBRETRANSLATE_URL || ''
const LT_KEY = process.env.LIBRETRANSLATE_API_KEY || ''
const USE_LT = !!LT_URL
const ENGINE = USE_LT ? 'LibreTranslate' : 'MyMemory'

const ALL_TARGETS = ['pt', 'es', 'fr', 'de', 'ru', 'tr', 'ar', 'zh', 'ko', 'ja']

// MyMemory wants language codes with region (pt-BR, zh-CN, etc).
const MM_LANG = {
  pt: 'pt-BR', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', ru: 'ru-RU',
  tr: 'tr-TR', ar: 'ar-SA', zh: 'zh-CN', ko: 'ko-KR', ja: 'ja-JP',
}
const LT_LANG = {
  pt: 'pt', es: 'es', fr: 'fr', de: 'de', ru: 'ru',
  tr: 'tr', ar: 'ar', zh: 'zh-Hans', ko: 'ko', ja: 'ja',
}

const BATCH_SIZE = 20          // LibreTranslate batch (ignored for MyMemory)
const REQUEST_GAP_MS = USE_LT ? 600 : 120   // throttle

// CLI args
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const requested = args.filter((a) => !a.startsWith('--'))
const TARGETS = requested.length ? requested : ALL_TARGETS

// Load dont-translate list (3-mode schema: exact / regex / substring)
const dontTranslate = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dont-translate.json'), 'utf8'),
)
const DT_EXACT = new Set(dontTranslate.exact ?? [])
const DT_REGEX = (dontTranslate.regex ?? []).map((src) => new RegExp(src))
const DT_SUBSTRING = (dontTranslate.substring ?? []).map((s) => s.toLowerCase())

// Regexes for things we SKIP entirely
const RE_URL_OR_PATH = /^(https?:\/\/|\/[a-zA-Z0-9_-])/
const RE_ONLY_INTERPOLATION = /^\s*(\{\{[^}]+\}\}\s*)+\s*$/
const RE_NUMERIC = /^[\d\s.,-]+$/
const RE_SLUG_LIKE = /^[a-z0-9-]+$/
const RE_HAS_LETTER = /[A-Za-zÀ-ſЀ-ӿ֐-׿؀-ۿ぀-ヿ一-鿿가-힯]/

function shouldSkip(value) {
  if (!value || typeof value !== 'string') return true
  if (value.trim() === '') return true
  // 3-mode dont-translate check
  if (DT_EXACT.has(value)) return true
  for (const re of DT_REGEX) if (re.test(value)) return true
  const lower = value.toLowerCase()
  for (const needle of DT_SUBSTRING) if (lower.includes(needle)) return true
  // Pure structural strings
  if (RE_URL_OR_PATH.test(value)) return true
  if (RE_ONLY_INTERPOLATION.test(value)) return true
  if (RE_NUMERIC.test(value)) return true
  if (RE_SLUG_LIKE.test(value)) return true
  if (!RE_HAS_LETTER.test(value)) return true
  return false
}

// Walk an object collecting [path, value] leaves
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

// Protect interpolation tokens and inline tags by replacing them with
// non-translatable placeholders before sending; restore after.
function protect(text) {
  const tokens = []
  let i = 0
  let masked = text.replace(/\{\{[^}]+\}\}/g, (m) => {
    const tok = `XPH${i}XPH`
    tokens.push({ tok, original: m })
    i++
    return tok
  })
  masked = masked.replace(/<\/?[a-zA-Z][a-zA-Z0-9-]{0,14}>/g, (m) => {
    const tok = `XTG${i}XTG`
    tokens.push({ tok, original: m })
    i++
    return tok
  })
  return { masked, tokens }
}

function restore(text, tokens) {
  let out = text
  for (const { tok, original } of tokens) {
    // Be tolerant: MT may rearrange spaces around the marker
    const re = new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    out = out.replace(re, original)
  }
  return out
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

// --- MyMemory: one string per request, simple GET ---
async function translateOneViaMyMemory(text, target) {
  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', text)
  url.searchParams.set('langpair', `en|${MM_LANG[target] || target}`)
  if (MYMEMORY_EMAIL) url.searchParams.set('de', MYMEMORY_EMAIL)
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) throw new Error(`MyMemory ${res.status}`)
  const data = await res.json()
  const t = data?.responseData?.translatedText
  if (!t || typeof t !== 'string') {
    throw new Error('MyMemory bad shape: ' + JSON.stringify(data).slice(0, 160))
  }
  if (data.responseStatus !== 200 && data.responseStatus !== '200') {
    if (data.responseDetails) throw new Error(`MyMemory: ${data.responseDetails}`)
  }
  return t
}

// --- LibreTranslate: batch POST ---
async function translateBatchViaLT(texts, target) {
  const url = `${LT_URL.replace(/\/$/, '')}/translate`
  const body = {
    q: texts,
    source: 'en',
    target: LT_LANG[target] || target,
    format: 'text',
  }
  if (LT_KEY) body.api_key = LT_KEY

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`LibreTranslate ${res.status}: ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  const result = data.translatedText
  if (Array.isArray(result)) return result
  if (typeof result === 'string' && texts.length === 1) return [result]
  throw new Error('Unexpected LibreTranslate response: ' + JSON.stringify(data).slice(0, 200))
}

async function translateAllValues(uniqueValues, target) {
  const masked = uniqueValues.map((v) => protect(v))
  const results = new Map() // english value → translated value

  if (USE_LT) {
    for (let i = 0; i < masked.length; i += BATCH_SIZE) {
      const slice = masked.slice(i, i + BATCH_SIZE)
      const inputs = slice.map((m) => m.masked)
      try {
        const outputs = await translateBatchViaLT(inputs, target)
        for (let j = 0; j < slice.length; j++) {
          const original = uniqueValues[i + j]
          const restored = restore(outputs[j], slice[j].tokens)
          results.set(original, restored)
        }
        process.stdout.write(`  · batch ${Math.floor(i / BATCH_SIZE) + 1} OK (${slice.length})\n`)
      } catch (err) {
        console.error(`  ! batch failed: ${err.message}`)
      }
      if (i + BATCH_SIZE < masked.length) await sleep(REQUEST_GAP_MS)
    }
  } else {
    let i = 0
    let consecutiveFails = 0
    for (const item of masked) {
      try {
        const translated = await translateOneViaMyMemory(item.masked, target)
        const restored = restore(translated, item.tokens)
        results.set(uniqueValues[i], restored)
        consecutiveFails = 0
        if (i % 20 === 0 && i > 0) {
          process.stdout.write(`  · ${i}/${masked.length} done…\n`)
        }
      } catch (err) {
        consecutiveFails++
        if (consecutiveFails >= 5) {
          console.error(`  ! 5 fails in a row, stopping ${target}: ${err.message}`)
          break
        }
      }
      i++
      await sleep(REQUEST_GAP_MS)
    }
  }
  return results
}

async function translateLocale(en, target) {
  const localePath = path.join(LOCALES_DIR, `${target}.json`)
  const loc = JSON.parse(fs.readFileSync(localePath, 'utf8'))

  const enFlat = flatten(en)
  const locFlat = Object.fromEntries(flatten(loc))

  const todo = []
  for (const [p, v] of enFlat) {
    if (typeof v !== 'string') continue
    if (locFlat[p] !== v) continue // already translated
    if (shouldSkip(v)) continue
    todo.push({ path: p, en: v })
  }

  console.log(`\n→ ${target.toUpperCase()}: ${todo.length} missing keys`)
  if (DRY_RUN || todo.length === 0) return { target, translated: 0, todo: todo.length }

  // Dedup identical English values
  const valueToPaths = new Map()
  for (const item of todo) {
    if (!valueToPaths.has(item.en)) valueToPaths.set(item.en, [])
    valueToPaths.get(item.en).push(item.path)
  }
  const uniqueValues = [...valueToPaths.keys()]
  console.log(`  · ${uniqueValues.length} unique strings via ${ENGINE}`)

  const translations = await translateAllValues(uniqueValues, target)

  for (const [enValue, paths] of valueToPaths) {
    const translated = translations.get(enValue)
    if (!translated) continue
    for (const p of paths) setByPath(loc, p, translated)
  }

  fs.writeFileSync(localePath, JSON.stringify(loc, null, 2) + '\n')
  console.log(`  ✓ wrote ${translations.size} unique → ${todo.length} paths in ${target}.json`)
  return { target, translated: translations.size, todo: todo.length }
}

async function main() {
  console.log(`DAD War Room · i18n auto-translate`)
  console.log(`  Engine : ${ENGINE}`)
  if (USE_LT) {
    console.log(`  Server : ${LT_URL}`)
    console.log(`  API key: ${LT_KEY ? '✓ set' : '✗ none (anonymous)'}`)
  } else {
    console.log(`  Email  : ${MYMEMORY_EMAIL || '✗ none (5K chars/day limit)'}`)
  }
  console.log(`  Targets: ${TARGETS.join(', ')}`)
  if (DRY_RUN) console.log(`  DRY RUN — no files will be written`)

  const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))

  const results = []
  for (const t of TARGETS) {
    try {
      results.push(await translateLocale(en, t))
    } catch (err) {
      console.error(`× ${t} failed:`, err.message)
      results.push({ target: t, translated: 0, todo: -1, error: err.message })
    }
  }

  console.log('\nSummary:')
  for (const r of results) {
    if (r.error) console.log(`  ${r.target}: ERROR — ${r.error}`)
    else console.log(`  ${r.target}: ${r.translated} translated (of ${r.todo} pending)`)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
