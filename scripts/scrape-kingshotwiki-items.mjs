#!/usr/bin/env node
/**
 * Kingshotwiki.com items scraper.
 *
 * The /items index page renders all 13 categories as Bootstrap tab-panes,
 * each containing cards with: img src to S3, h5 title, and a slug link.
 * We parse the rendered HTML into a per-category manifest and download each
 * icon to public/images/icons/kingshotwiki/{category}/{slug}.png.
 *
 * Categories (slugs in URL fragments):
 *   basic-resource, pet, town-skin, march-skin, avatar-frame, nameplate,
 *   teleport-skin, teleporter, buff, truegold, chest, hero, master
 *
 * Usage:   node scripts/scrape-kingshotwiki-items.mjs
 * Re-run is idempotent — already-present files are skipped unless --force.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public/images/icons/kingshotwiki')
const MANIFEST = path.join(ROOT, 'public/images/icons/kingshotwiki-manifest.json')

const FORCE = process.argv.includes('--force')
const POLITE_MS = 200
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function sanitize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/&#8217;|&apos;|'/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

/** Split HTML into { categorySlug: html } chunks via tab-pane boundaries. */
function splitByCategory(html) {
  const out = {}
  // Each tab-pane opens with: <div class="tab-pane ... id="<slug>" role="tabpanel" ...>
  // We track each opening + its matching close via simple substring slicing.
  const re = /<div class="tab-pane[^"]*"\s+id="([a-z][a-z-]+)"\s+role="tabpanel"[^>]*>/g
  const matches = [...html.matchAll(re)]
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const slug = m[1]
    const start = m.index + m[0].length
    // Stop at the start of the next tab-pane OR at the closing </main> /
    // </section> we never reach — slice until next match or end.
    const next = matches[i + 1]
    const end = next ? next.index : html.length
    out[slug] = html.slice(start, end)
  }
  return out
}

/** Extract items from a category chunk: [{ slug, name, iconUrl }] */
function extractItems(chunk) {
  // Per-card extraction — find each <div class="card"> / card-wrapper and pull
  // its img + title + slug atomically. The previous "zip three arrays" form
  // misaligned when cards had partial data.
  //
  // Card structure (kingshotwiki/items):
  //   <div class="custom-shadow ...">
  //     <span><img src="https://got-global-wiki..."></span>
  //     <div ...>
  //       <h5 ... title="Name">
  //         <a href="https://kingshotwiki.com/items/slug/">Name</a>
  //       </h5>
  //     </div>
  //   </div>
  const items = []
  const cardRe = /<div class="custom-shadow[\s\S]*?<\/div>\s*<\/div>/g
  const cards = chunk.match(cardRe) ?? []
  for (const card of cards) {
    const img = card.match(/<img[^>]+src="(https:\/\/got-global-wiki[^"]+item_icon_[^"]+\.png)"/)
    if (!img) continue
    const iconUrl = img[1]

    const titleMatch = card.match(/<h5[^>]*title="([^"]+)"/)
    const rawTitle = titleMatch ? decodeEntities(titleMatch[1]) : null

    const slugMatch = card.match(/<a href="https:\/\/kingshotwiki\.com\/items\/([^/"]+)\/"/)
    const rawSlug = slugMatch ? slugMatch[1] : null

    // Reject placeholder leaks like `kingshot_wiki_item_name_100081_kingshot_end`
    // — those are unresolved Yoast/i18n tokens with no real human-readable
    // value. Same goes for slugs that obviously embed them.
    const isPlaceholder = (s) => !s || /kingshot_wiki_/i.test(s)

    let slug = isPlaceholder(rawSlug) ? null : rawSlug
    let name = isPlaceholder(rawTitle) ? null : rawTitle

    if (!slug && name) slug = sanitize(name)
    if (!slug || !name) continue // skip cards we can't reliably name

    items.push({ slug, name, iconUrl })
  }
  return items
}

async function downloadOne(url, destPath) {
  if (fs.existsSync(destPath) && !FORCE) return { skipped: true }
  const r = await fetch(url, { headers: { 'user-agent': UA } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, buf)
  return { skipped: false, size: buf.length }
}

async function fetchItemsHtml() {
  const r = await fetch('https://kingshotwiki.com/items/', { headers: { 'user-agent': UA } })
  if (!r.ok) throw new Error(`items index HTTP ${r.status}`)
  return r.text()
}

async function main() {
  console.log('Fetching kingshotwiki.com/items/ …')
  const html = await fetchItemsHtml()
  const chunks = splitByCategory(html)
  console.log(`Categories found: ${Object.keys(chunks).length}`)

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const manifest = {
    generated_at: new Date().toISOString(),
    source: 'https://kingshotwiki.com/items/',
    buckets: {},
  }
  let ok = 0
  let skipped = 0
  let failed = 0

  for (const [cat, chunk] of Object.entries(chunks)) {
    const items = extractItems(chunk)
    console.log(`  ${cat.padEnd(16)} ${items.length} items`)

    const bucket = []
    for (const item of items) {
      // Cards in the same category occasionally render twice with different
      // image variants — dedupe by slug.
      if (bucket.some((b) => b.slug === item.slug)) continue
      const dest = path.join(OUT_DIR, cat, `${item.slug}.png`)
      try {
        const res = await downloadOne(item.iconUrl, dest)
        if (res.skipped) skipped++
        else { ok++; process.stdout.write('.') }
        bucket.push({
          slug: item.slug,
          title: item.name,
          local: `/images/icons/kingshotwiki/${cat}/${item.slug}.png`,
          source: item.iconUrl,
        })
      } catch (err) {
        failed++
        console.error(`\n  × ${cat}/${item.slug}: ${err.message}`)
      }
      await sleep(POLITE_MS)
    }
    process.stdout.write('\n')
    bucket.sort((a, b) => a.slug.localeCompare(b.slug))
    manifest.buckets[cat] = bucket
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

  console.log('\n=== Summary ===')
  for (const cat of Object.keys(manifest.buckets).sort()) {
    console.log(`  ${cat.padEnd(16)} ${manifest.buckets[cat].length}`)
  }
  console.log('  ----')
  console.log(`  downloaded: ${ok}`)
  console.log(`  skipped: ${skipped}`)
  console.log(`  failed: ${failed}`)
  console.log(`Manifest: ${MANIFEST}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
