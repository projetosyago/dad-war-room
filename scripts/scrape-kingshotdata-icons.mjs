#!/usr/bin/env node
/**
 * Kingshotdata.com asset scraper — pulls every game icon from the WordPress
 * REST API and saves them organized by post type (heroes, pets, masters,
 * buildings, items, events, research, alliance-tech, database).
 *
 * Strategy:
 *   1. Page through /wp-json/wp/v2/posts?_embed (50/page, polite delay)
 *   2. Extract featured_media.source_url + categorize by URL path
 *   3. Download each as the original webp (Vercel serves webp natively)
 *   4. Skip already-present files for incremental re-runs
 *   5. Write a manifest at public/images/icons/kingshot-manifest.json so
 *      callers can look up assets without hitting the filesystem
 *
 * Usage: node scripts/scrape-kingshotdata-icons.mjs
 * Re-run is idempotent — only missing files are pulled.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'public/images/icons/kingshot')
const MANIFEST = path.join(ROOT, 'public/images/icons/kingshot-manifest.json')

const BASE = 'https://kingshotdata.com/wp-json/wp/v2/posts'
const PER_PAGE = 50
const POLITE_DELAY_MS = 250

// Map URL slug to bucket folder. WordPress permalinks like /heroes/petra/
// have the post type in the leading path segment.
function bucketFor(link) {
  try {
    const u = new URL(link)
    const seg = u.pathname.split('/').filter(Boolean)[0] || 'misc'
    return seg
  } catch {
    return 'misc'
  }
}

function sanitize(s) {
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
}

async function fetchPage(page) {
  const url = `${BASE}?_embed=wp:featuredmedia&per_page=${PER_PAGE}&page=${page}`
  const r = await fetch(url, {
    headers: { 'user-agent': 'dad-war-room-icon-scraper/1.0' },
  })
  if (r.status === 400 || r.status === 404) return null // page beyond range
  if (!r.ok) throw new Error(`page ${page}: HTTP ${r.status}`)
  return r.json()
}

async function downloadOne(srcUrl, destPath) {
  if (fs.existsSync(destPath)) return { skipped: true }
  const r = await fetch(srcUrl, {
    headers: { 'user-agent': 'dad-war-room-icon-scraper/1.0' },
  })
  if (!r.ok) throw new Error(`download ${srcUrl}: HTTP ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, buf)
  return { skipped: false, size: buf.length }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  console.log('Scraping kingshotdata.com — output:', OUT)

  const manifest = { generated_at: new Date().toISOString(), buckets: {} }
  let totalDownloaded = 0
  let totalSkipped = 0
  let totalFailed = 0

  for (let page = 1; page < 50; page++) {
    let posts
    try {
      posts = await fetchPage(page)
    } catch (err) {
      console.error(`× page ${page} fetch failed: ${err.message}`)
      break
    }
    if (!posts || posts.length === 0) {
      console.log(`page ${page}: empty — stopping`)
      break
    }
    console.log(`page ${page}: ${posts.length} posts`)

    for (const post of posts) {
      const slug = sanitize(post.slug || `post-${post.id}`)
      const bucket = bucketFor(post.link || '')
      const media = post._embedded?.['wp:featuredmedia']?.[0]
      const src = media?.source_url
      if (!src) continue

      const ext = path.extname(new URL(src).pathname) || '.webp'
      const dest = path.join(OUT, bucket, `${slug}${ext}`)

      try {
        const res = await downloadOne(src, dest)
        if (res.skipped) {
          totalSkipped++
        } else {
          totalDownloaded++
          process.stdout.write('.')
        }
        manifest.buckets[bucket] = manifest.buckets[bucket] || []
        manifest.buckets[bucket].push({
          slug,
          title: (post.title?.rendered || slug).replace(/<[^>]+>/g, '').trim(),
          link: post.link,
          local: `/images/icons/kingshot/${bucket}/${slug}${ext}`,
          source: src,
        })
      } catch (err) {
        totalFailed++
        console.error(`\n× ${bucket}/${slug}: ${err.message}`)
      }

      await sleep(POLITE_DELAY_MS)
    }
    process.stdout.write('\n')
  }

  // Dedup manifest entries (in case page boundaries re-emitted)
  for (const b of Object.keys(manifest.buckets)) {
    const seen = new Set()
    manifest.buckets[b] = manifest.buckets[b].filter((e) => {
      if (seen.has(e.slug)) return false
      seen.add(e.slug)
      return true
    })
    manifest.buckets[b].sort((a, b) => a.slug.localeCompare(b.slug))
  }

  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true })
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

  console.log('\n=== Summary ===')
  for (const b of Object.keys(manifest.buckets).sort()) {
    console.log(`  ${b.padEnd(18)} ${manifest.buckets[b].length}`)
  }
  console.log(`  ----`)
  console.log(`  downloaded: ${totalDownloaded}`)
  console.log(`  skipped (already on disk): ${totalSkipped}`)
  console.log(`  failed: ${totalFailed}`)
  console.log(`Manifest: ${MANIFEST}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
