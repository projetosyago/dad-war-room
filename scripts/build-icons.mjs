#!/usr/bin/env node
/**
 * Build PWA icons from the DAD crest.
 *
 * iOS auto-applies rounded corners to apple-touch-icon, so the PNG MUST be:
 *   - square
 *   - fully opaque (no alpha — iOS shows white through transparency)
 *   - full-bleed (background color extends to all 4 edges)
 *
 * Strategy: render only the crest paths (no background) onto a transparent
 * buffer sized to ~78% of the target canvas, then composite centered onto a
 * solid navy square. This gives iOS room to round corners without clipping
 * the shield, while keeping the background opaque all the way to the edge.
 *
 * Output:
 *   public/icons/apple-touch-icon.png    (180x180, iOS home screen)
 *   public/icons/icon-192.png            (192x192, PWA any)
 *   public/icons/icon-512.png            (512x512, PWA any)
 *   public/icons/icon-maskable-192.png   (192x192, safe area for maskable)
 *   public/icons/icon-maskable-512.png   (512x512, safe area for maskable)
 *   public/icons/icon-1024.png           (1024x1024, splash / future)
 */

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const outDir = path.join(repoRoot, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// Navy background — must match theme-color in index.html / manifest
const BG = '#13172a'

// Crest-only SVG (square viewBox, no background rect). Taken from
// public/favicon.svg with the rect removed and viewBox tightened to the
// crest's bounding box so it fills its render buffer without internal padding.
// Original crest path bounds in 240x280 space: roughly x:[24, 216], y:[64, 263].
// Tight square viewBox of 240x240 centered on the crest (y-offset shifted up).
const crestSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 60 200 200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffe9a3"/>
      <stop offset="50%" stop-color="#f4cf73"/>
      <stop offset="100%" stop-color="#c89934"/>
    </linearGradient>
    <linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b13838"/>
      <stop offset="100%" stop-color="#6d1818"/>
    </linearGradient>
  </defs>
  <!-- Outer banner-shield (crimson) -->
  <path d="M 30 70 L 210 70 L 210 170 Q 210 215 120 260 Q 30 215 30 170 Z"
        fill="url(#c)" stroke="url(#g)" stroke-width="6" stroke-linejoin="round"/>
  <!-- Inner border (subtle gold tracing) -->
  <path d="M 42 82 L 198 82 L 198 167 Q 198 207 120 248 Q 42 207 42 167 Z"
        fill="none" stroke="#ffdb8a" stroke-width="1.4" opacity="0.55"/>
  <!-- Trinity emblem -->
  <g transform="translate(120, 158)" stroke="#f4cf73" stroke-width="1.5" stroke-linejoin="round">
    <path d="M 0 -60 Q -20 -32 -11 -9 Q 0 -26 11 -9 Q 20 -32 0 -60 Z" fill="#fff5d8"/>
    <path d="M -54 4 Q -54 34 -28 46 Q -36 23 -20 16 Q -42 7 -54 4 Z" fill="#fff5d8"/>
    <path d="M 54 4 Q 54 34 28 46 Q 36 23 20 16 Q 42 7 54 4 Z" fill="#fff5d8"/>
    <path d="M 0 6 L 13 30 L 0 56 L -13 30 Z" fill="url(#g)" stroke="#876318" stroke-width="1"/>
  </g>
</svg>`

const crestBuffer = Buffer.from(crestSvg)

/**
 * Build one icon: opaque navy square, crest centered at `crestRatio` of canvas.
 *  - `crestRatio` 0.78 for normal icons (iOS round-corner safe)
 *  - `crestRatio` 0.62 for maskable (Android masks aggressively → bigger safe zone)
 */
async function buildIcon(size, outPath, crestRatio = 0.78) {
  const crestSize = Math.round(size * crestRatio)
  const crestPng = await sharp(crestBuffer, { density: 384 })
    .resize(crestSize, crestSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: crestPng, gravity: 'center' }])
    // Flatten composites over the navy bg, then removeAlpha drops the channel
    // entirely. Critical for iOS — any transparency (even all-opaque alpha)
    // can render white through the rounded-corner mask on older iOS versions.
    .flatten({ background: BG })
    .removeAlpha()
    .png({ compressionLevel: 9, palette: false })
    .toFile(outPath)
}

const targets = [
  { name: 'apple-touch-icon.png', size: 180, ratio: 0.78 },
  { name: 'icon-192.png', size: 192, ratio: 0.78 },
  { name: 'icon-512.png', size: 512, ratio: 0.78 },
  { name: 'icon-maskable-192.png', size: 192, ratio: 0.62 },
  { name: 'icon-maskable-512.png', size: 512, ratio: 0.62 },
  { name: 'icon-1024.png', size: 1024, ratio: 0.78 },
]

console.log(`Building ${targets.length} icons → ${outDir}`)
for (const t of targets) {
  const outPath = path.join(outDir, t.name)
  await buildIcon(t.size, outPath, t.ratio)
  // eslint-disable-next-line no-console
  console.log(`  ${t.name.padEnd(28)} ${t.size}x${t.size}  (crest ${Math.round(t.ratio * 100)}%)`)
}
console.log('Done.')
