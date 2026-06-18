#!/usr/bin/env node
/**
 * Scrape the "Exclusive Gear" widget icon for each mythic hero.
 *
 * Each mythic hero's kingshotdata page renders the exclusive gear section
 * with a featured image like:
 *   https://kingshotdata.com/wp-content/uploads/.../widget-helgas-exclusive-gear.webp
 *
 * We pull that URL via the WordPress REST API (`content.rendered`), crop the
 * off-white frame the same way scraped portraits get treated, save to
 * /public/images/icons/kingshotdata/gear/{slug}.webp, and patch
 * src/data/heroes-data.json so each mythic hero's `exclusiveGear.iconUrl`
 * points at the local file.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA = path.join(ROOT, 'src/data/heroes-data.json')
const OUT_DIR = path.join(ROOT, 'public/images/icons/kingshotdata/gear')

const REMOTE_SLUG_OVERRIDES = { amane: 'mikoto' }
const FORCE = process.argv.includes('--force')
const POLITE_MS = 250

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchHeroHtml(slug) {
  const remoteSlug = REMOTE_SLUG_OVERRIDES[slug] || slug
  const r = await fetch(
    `https://kingshotdata.com/wp-json/wp/v2/posts?slug=${remoteSlug}`,
    { headers: { 'user-agent': 'dad-war-room-gear-scraper/1.0' } },
  )
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const arr = await r.json()
  if (!arr[0]) throw new Error('no post')
  return arr[0].content.rendered
}

/**
 * Find the widget image URL inside the gear section.
 *   - First match for an img src containing /widget-...exclusive-gear...webp
 *   - Falls back to the first img inside the section after the h2 "Exclusive Gear"
 */
function findGearImageUrl(html) {
  const direct = html.match(
    /<img[^>]+src="(https:\/\/kingshotdata\.com\/wp-content\/uploads\/[^"]*widget-[^"]*exclusive-gear[^"]*\.(?:webp|png))"/i,
  )
  if (direct) return direct[1].replace(/-\d+x\d+\.(webp|png)$/i, '.$1')

  const sectionStart = html.search(/<h2[^>]*>\s*Exclusive Gear\s*<\/h2>/i)
  if (sectionStart < 0) return null
  const section = html.slice(sectionStart)
  const img = section.match(/<img[^>]+src="(https:\/\/kingshotdata\.com\/wp-content\/uploads\/[^"]+\.(?:webp|png))"/i)
  return img ? img[1].replace(/-\d+x\d+\.(webp|png)$/i, '.$1') : null
}

async function downloadAndCrop(url, destPath) {
  const r = await fetch(url, {
    headers: { 'user-agent': 'dad-war-room-gear-scraper/1.0' },
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  const img = sharp(buf)
  const meta = await img.metadata()
  const { width = 0, height = 0 } = meta
  // Symmetric 8% crop — same treatment as hero portraits, kills the
  // off-white frame.
  const cropX = Math.round(width * 0.08)
  const cropY = Math.round(height * 0.08)
  const out = await img
    .extract({
      left: cropX,
      top: cropY,
      width: Math.max(1, width - 2 * cropX),
      height: Math.max(1, height - 2 * cropY),
    })
    .webp({ quality: 88 })
    .toBuffer()
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, out)
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf-8'))
  const mythicSlugs = Object.entries(data)
    .filter(([, h]) => h.rarity === 'mythic')
    .map(([slug]) => slug)

  console.log(`Scraping gear icons for ${mythicSlugs.length} mythic heroes…`)
  fs.mkdirSync(OUT_DIR, { recursive: true })

  let ok = 0, skipped = 0, failed = 0
  for (const slug of mythicSlugs) {
    const destPath = path.join(OUT_DIR, `${slug}.webp`)
    const publicPath = `/images/icons/kingshotdata/gear/${slug}.webp`

    if (fs.existsSync(destPath) && !FORCE) {
      data[slug].exclusiveGear = data[slug].exclusiveGear || {}
      data[slug].exclusiveGear.iconUrl = publicPath
      skipped++
      continue
    }
    try {
      const html = await fetchHeroHtml(slug)
      const url = findGearImageUrl(html)
      if (!url) {
        failed++
        console.warn(`\n  ⚠ ${slug}: no gear image URL in page`)
        continue
      }
      await downloadAndCrop(url, destPath)
      data[slug].exclusiveGear = data[slug].exclusiveGear || {}
      data[slug].exclusiveGear.iconUrl = publicPath
      ok++
      process.stdout.write('.')
    } catch (err) {
      failed++
      console.error(`\n  × ${slug}: ${err.message}`)
    }
    await sleep(POLITE_MS)
  }
  process.stdout.write('\n')

  fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n')
  console.log(`\n=== Summary ===`)
  console.log(`  downloaded: ${ok}`)
  console.log(`  skipped (already on disk): ${skipped}`)
  console.log(`  failed: ${failed}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
