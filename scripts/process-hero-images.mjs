#!/usr/bin/env node
/**
 * Hero & skill image post-processor.
 *
 * 1. Symmetric crop on hero portraits (kingshot/heroes/*.webp) — removes
 *    the off-white frame baked into the source assets. 8% cut per edge.
 *
 * 2. Asymmetric crop on skill icons (downloaded from kingshotdata.com URLs
 *    referenced in heroes-data.json). The kingshotdata source bakes in a
 *    "Lv. 5" / X badge in the bottom-left corner — we crop generously off
 *    the bottom and bit off each side to drop the badge while keeping the
 *    skill art centered. Files land under
 *    /public/images/icons/kingshotdata/skills/{slug}.webp and the manifest
 *    JSON is rewritten with the local paths.
 *
 * Idempotent: hero portraits are processed only if they don't carry our
 * "v=2" marker via a sibling .json (skipped on re-runs). Skill icons skip
 * download if the local file already exists. Re-run with --force to redo.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const HEROES_DIR = path.join(ROOT, 'public/images/icons/kingshot/heroes')
const SKILLS_DIR = path.join(ROOT, 'public/images/icons/kingshotdata/skills')
const HEROES_DATA = path.join(ROOT, 'src/data/heroes-data.json')
const HEROES_PROCESSED_MARKER = path.join(HEROES_DIR, '.processed-v2')

const FORCE = process.argv.includes('--force')
const POLITE_MS = 200

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Hero portraits ─────────────────────────────────────────────────────────

async function processPortraits() {
  if (fs.existsSync(HEROES_PROCESSED_MARKER) && !FORCE) {
    console.log('Hero portraits already processed (v2 marker) — skipping. Use --force to redo.')
    return
  }
  const files = fs
    .readdirSync(HEROES_DIR)
    .filter((f) => f.endsWith('.webp'))
  console.log(`Cropping ${files.length} hero portraits…`)

  for (const file of files) {
    const filePath = path.join(HEROES_DIR, file)
    try {
      const buf = fs.readFileSync(filePath)
      const img = sharp(buf)
      const meta = await img.metadata()
      const { width = 0, height = 0 } = meta
      if (width < 50 || height < 50) {
        console.warn(`  skip ${file} — too small (${width}x${height})`)
        continue
      }
      // Crop 8% per edge — kills the bakedin off-white frame on every kingshotdata
      // portrait. Output square (1:1) by centering — looks better in mobile tiles.
      const cropX = Math.round(width * 0.08)
      const cropY = Math.round(height * 0.08)
      const out = await img
        .extract({
          left: cropX,
          top: cropY,
          width: width - 2 * cropX,
          height: height - 2 * cropY,
        })
        .webp({ quality: 88 })
        .toBuffer()
      fs.writeFileSync(filePath, out)
      process.stdout.write('.')
    } catch (err) {
      console.error(`\n  × ${file}: ${err.message}`)
    }
  }
  fs.writeFileSync(HEROES_PROCESSED_MARKER, new Date().toISOString())
  console.log(`\n  → marker: ${HEROES_PROCESSED_MARKER}`)
}

// ── Skill icons ────────────────────────────────────────────────────────────

function collectSkillUrls(data) {
  const urls = new Set()
  for (const hero of Object.values(data)) {
    for (const s of hero.conquest?.skills ?? []) if (s.iconUrl) urls.add(s.iconUrl)
    for (const s of hero.expedition?.skills ?? []) if (s.iconUrl) urls.add(s.iconUrl)
    for (const s of hero.exclusiveGear?.skills ?? []) if (s.iconUrl) urls.add(s.iconUrl)
  }
  return urls
}

function localPathFor(remoteUrl) {
  const fname = path
    .basename(new URL(remoteUrl).pathname)
    .replace(/-\d+x\d+(\.webp|\.png|\.jpg)$/i, '$1')
  return path.join(SKILLS_DIR, fname)
}

function publicPathFor(remoteUrl) {
  return '/images/icons/kingshotdata/skills/' + path.basename(localPathFor(remoteUrl))
}

async function processSkillIcons() {
  console.log('Downloading + cropping skill icons…')
  fs.mkdirSync(SKILLS_DIR, { recursive: true })

  const data = JSON.parse(fs.readFileSync(HEROES_DATA, 'utf-8'))
  const urls = collectSkillUrls(data)
  console.log(`  ${urls.size} unique skill icons`)

  const urlToLocal = {}
  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (const url of urls) {
    const localPath = localPathFor(url)
    const publicPath = publicPathFor(url)
    urlToLocal[url] = publicPath

    if (fs.existsSync(localPath) && !FORCE) {
      skipped++
      continue
    }
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': 'dad-war-room-image-processor/1.0' },
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buf = Buffer.from(await r.arrayBuffer())
      const img = sharp(buf)
      const meta = await img.metadata()
      const { width = 0, height = 0 } = meta

      // Asymmetric crop — the kingshotdata source bakes a "Lv. 5" / X badge
      // in the bottom-left corner. We cut more off the bottom than the
      // top/sides so the badge falls outside the visible area. The skill
      // art is typically centered or slightly upper-half of the asset, so
      // the bottom crop doesn't hurt it.
      //   Top: 8%
      //   Bottom: 22%
      //   Sides: 8% each
      const cropTop = Math.round(height * 0.08)
      const cropBottom = Math.round(height * 0.22)
      const cropSide = Math.round(width * 0.08)
      const w = width - 2 * cropSide
      const h = height - cropTop - cropBottom
      const out = await img
        .extract({
          left: cropSide,
          top: cropTop,
          width: Math.max(1, w),
          height: Math.max(1, h),
        })
        .webp({ quality: 85 })
        .toBuffer()
      fs.writeFileSync(localPath, out)
      downloaded++
      process.stdout.write('.')
    } catch (err) {
      failed++
      console.error(`\n  × ${path.basename(localPath)}: ${err.message}`)
    }
    await sleep(POLITE_MS)
  }
  process.stdout.write('\n')

  // Rewrite heroes-data.json with local paths.
  console.log('Rewriting heroes-data.json with local paths…')
  for (const hero of Object.values(data)) {
    for (const s of hero.conquest?.skills ?? []) if (s.iconUrl && urlToLocal[s.iconUrl]) s.iconUrl = urlToLocal[s.iconUrl]
    for (const s of hero.expedition?.skills ?? []) if (s.iconUrl && urlToLocal[s.iconUrl]) s.iconUrl = urlToLocal[s.iconUrl]
    for (const s of hero.exclusiveGear?.skills ?? []) if (s.iconUrl && urlToLocal[s.iconUrl]) s.iconUrl = urlToLocal[s.iconUrl]
  }
  fs.writeFileSync(HEROES_DATA, JSON.stringify(data, null, 2) + '\n')

  console.log(`\n=== Summary ===`)
  console.log(`  downloaded + cropped: ${downloaded}`)
  console.log(`  skipped (already local): ${skipped}`)
  console.log(`  failed: ${failed}`)
}

async function main() {
  await processPortraits()
  await processSkillIcons()
  console.log('\nAll done.')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
