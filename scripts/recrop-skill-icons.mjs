#!/usr/bin/env node
/**
 * Additional bottom-crop pass on already-local skill icons.
 *
 * Wave 19 review: the 22% bottom crop applied in Wave 18 still left a sliver
 * of the kingshotdata.com "Lv. 5 / X" badge visible on some icons. This
 * script does a second pass — additional 12% off the bottom + 4% off each
 * side of the local files — which compounds to ~31% total bottom crop and
 * ~14% side crop from the original asset. Badge is gone.
 *
 * Idempotent via a marker file. Re-run with --force to crop again.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIR = path.join(ROOT, 'public/images/icons/kingshotdata/skills')
const MARKER = path.join(DIR, '.recropped-v1')

const FORCE = process.argv.includes('--force')

async function main() {
  if (fs.existsSync(MARKER) && !FORCE) {
    console.log('Already re-cropped — pass --force to redo.')
    return
  }
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.webp'))
  console.log(`Re-cropping ${files.length} skill icons (additional bottom + side trim)…`)

  for (const file of files) {
    const filePath = path.join(DIR, file)
    try {
      const buf = fs.readFileSync(filePath)
      const img = sharp(buf)
      const meta = await img.metadata()
      const { width = 0, height = 0 } = meta
      if (width < 20 || height < 20) continue
      // Additional crop on top of Wave 18's 22% bottom / 8% sides:
      //   Bottom: 12% more
      //   Sides:   4% more each
      //   Top:     0
      const cropBottom = Math.round(height * 0.12)
      const cropSide = Math.round(width * 0.04)
      const out = await img
        .extract({
          left: cropSide,
          top: 0,
          width: Math.max(1, width - 2 * cropSide),
          height: Math.max(1, height - cropBottom),
        })
        .webp({ quality: 85 })
        .toBuffer()
      fs.writeFileSync(filePath, out)
      process.stdout.write('.')
    } catch (err) {
      console.error(`\n  × ${file}: ${err.message}`)
    }
  }
  fs.writeFileSync(MARKER, new Date().toISOString())
  console.log(`\nDone. Marker: ${MARKER}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
