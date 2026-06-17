#!/usr/bin/env node
/**
 * Build PWA / favicon / iOS / Android / macOS / social-share icons from the
 * Bracketed D master SVGs (Wave 13 logo rebuild).
 *
 * Source of truth (kept in version control):
 *   public/favicon.svg          — color master, full-bleed navy + gold
 *   public/favicon-maskable.svg — Android adaptive variant (62% safe zone)
 *   public/mask-icon.svg        — Safari pinned-tab monochrome
 *
 * iOS auto-applies rounded corners to apple-touch-icon, so every PNG MUST be:
 *   - square
 *   - fully opaque (no alpha — iOS shows white through transparency)
 *   - full-bleed (background extends to all 4 edges)
 *
 * Strategy: render each source SVG at the target size with sharp, then
 * .flatten({ background: BG }).removeAlpha() so the output is opaque 8-bit RGB.
 *
 * Outputs (public/icons/):
 *   favicon-16.png, favicon-32.png, favicon-48.png         — browser tab + bookmark
 *   apple-touch-icon{,-120,-152,-167}.png                  — iPhone / iPad / iPad Pro
 *   icon-{192,512,1024}.png                                — PWA any-purpose
 *   icon-maskable-{192,512}.png                            — Android adaptive
 *   icon-144.png                                           — Windows tile
 *   og-image.png                                           — 1200×630 social share
 */

import sharp from 'sharp'
import { mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const publicDir = path.join(repoRoot, 'public')
const outDir = path.join(publicDir, 'icons')
mkdirSync(outDir, { recursive: true })

// Navy background — must match theme-color in index.html / manifest
const BG = '#13172a'

// Read masters from disk so they remain the single source of truth.
const colorSvg = readFileSync(path.join(publicDir, 'favicon.svg'))
const maskableSvg = readFileSync(path.join(publicDir, 'favicon-maskable.svg'))

/**
 * Render one square icon: source SVG → opaque PNG at `size`×`size`.
 * Flatten + removeAlpha guarantees no alpha channel sneaks into the output —
 * that was the bug in Wave 12 that let iOS' rounded-corner mask bleed white.
 */
async function buildSquare(sourceSvg, size, outPath) {
  await sharp(sourceSvg, { density: Math.max(384, size * 4) })
    .resize(size, size, { fit: 'contain', background: BG })
    .flatten({ background: BG })
    .removeAlpha()
    .png({ compressionLevel: 9, palette: false })
    .toFile(outPath)
}

// 1200×630 Open Graph card — icon left, brand text right.
// Inline composed SVG (no font file dependency on Vercel — uses Georgia which
// is universally available on Linux build servers as a serif fallback).
const ogSvg = `<svg viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f4cf73" stop-opacity="0.08"/>
      <stop offset="60%" stop-color="#13172a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#13172a"/>
  <ellipse cx="600" cy="315" rx="700" ry="500" fill="url(#g)"/>
  <!-- Icon left (3x scale on viewBox 100 → 300px artwork at translate 140,165) -->
  <g transform="translate(140 165) scale(3)">
    <path d="M 19 25 L 28 25 L 28 28.5 L 22.5 28.5 L 22.5 71.5 L 28 71.5 L 28 75 L 19 75 Z" fill="#f4cf73"/>
    <path d="M 81 25 L 72 25 L 72 28.5 L 77.5 28.5 L 77.5 71.5 L 72 71.5 L 72 75 L 81 75 Z" fill="#f4cf73"/>
    <path fill-rule="evenodd" fill="#f4cf73" d="M 33 30 L 56 30 C 67 30 73 39 73 50 C 73 61 67 70 56 70 L 33 70 L 33 67 L 36.5 67 L 36.5 33 L 33 33 Z M 42 35 L 56 35 C 63 35 68 41 68 50 C 68 59 63 65 56 65 L 42 65 Z"/>
  </g>
  <text x="500" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="900" fill="#f0e9d6" letter-spacing="6">DAD WAR ROOM</text>
  <text x="500" y="335" font-family="Georgia, serif" font-size="22" font-weight="400" fill="#a89e89" letter-spacing="8">KINGDOM 1652 · KINGSHOT</text>
  <text x="500" y="395" font-family="Georgia, serif" font-style="italic" font-size="20" fill="#7a7464">"Elegance in Peace · Chaos in Battle"</text>
</svg>`

async function buildOg(outPath) {
  await sharp(Buffer.from(ogSvg), { density: 192 })
    .resize(1200, 630, { fit: 'contain', background: BG })
    .flatten({ background: BG })
    .removeAlpha()
    .png({ compressionLevel: 9, palette: false })
    .toFile(outPath)
}

// Full output matrix — see CLAUDE.md / wave-13 PR for rationale per size.
const squareTargets = [
  // Browser tab + bookmark
  { name: 'favicon-16.png', size: 16, source: colorSvg },
  { name: 'favicon-32.png', size: 32, source: colorSvg },
  { name: 'favicon-48.png', size: 48, source: colorSvg },
  // Apple Touch (iPhone + iPad + iPad Pro)
  { name: 'apple-touch-icon-120.png', size: 120, source: colorSvg },
  { name: 'apple-touch-icon-152.png', size: 152, source: colorSvg },
  { name: 'apple-touch-icon-167.png', size: 167, source: colorSvg },
  { name: 'apple-touch-icon.png', size: 180, source: colorSvg },
  // Windows tile
  { name: 'icon-144.png', size: 144, source: colorSvg },
  // PWA any-purpose
  { name: 'icon-192.png', size: 192, source: colorSvg },
  { name: 'icon-512.png', size: 512, source: colorSvg },
  { name: 'icon-1024.png', size: 1024, source: colorSvg },
  // Android adaptive (maskable — bigger safe zone via different source SVG)
  { name: 'icon-maskable-192.png', size: 192, source: maskableSvg },
  { name: 'icon-maskable-512.png', size: 512, source: maskableSvg },
]

console.log(`Building ${squareTargets.length} square icons + 1 OG image → ${outDir}`)
for (const t of squareTargets) {
  const outPath = path.join(outDir, t.name)
  await buildSquare(t.source, t.size, outPath)
  console.log(`  ${t.name.padEnd(30)} ${t.size}x${t.size}`)
}

const ogOut = path.join(outDir, 'og-image.png')
await buildOg(ogOut)
console.log(`  ${'og-image.png'.padEnd(30)} 1200x630`)

console.log('Done.')
