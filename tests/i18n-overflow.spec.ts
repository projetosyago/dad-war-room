import { test, expect } from '@playwright/test'

/**
 * Wave 9 — i18n overflow regression spec.
 *
 * Prevents the bug where long-language labels (PT "Configurações", DE
 * "Einstellungen", RU "Настройки") overflow tight containers like the
 * bottom-nav tabs or KPI eyebrows. Catches it before it ships.
 *
 * Run:
 *   npm i -D @playwright/test
 *   npx playwright install chromium
 *   npx playwright test
 *
 * Wire in CI: every overflowing element fails the build.
 */

const LONG_LANGS = ['de', 'ru', 'ko', 'ar']
const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 13', width: 390, height: 844 },
  { name: 'iPad mini', width: 768, height: 1024 },
] as const

const PAGES = ['/', '/alliance', '/events', '/settings']

for (const lang of LONG_LANGS) {
  for (const vp of VIEWPORTS) {
    for (const route of PAGES) {
      test(`no overflow — lang=${lang} route=${route} @${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        // Set locale via localStorage BEFORE navigation so i18next picks it up
        await page.addInitScript((l) => {
          window.localStorage.setItem('dad-war-room.lang', l)
        }, lang)
        await page.goto(route)
        // Wait for hydration — i18n keys should be replaced by translations
        await page.waitForLoadState('networkidle')

        const overflowing = await page.evaluate(() => {
          const tagsToCheck = ['SPAN', 'P', 'H1', 'H2', 'H3', 'H4', 'BUTTON', 'A', 'DIV']
          const out: Array<{ tag: string; cls: string; text: string }> = []
          for (const el of Array.from(document.querySelectorAll('*'))) {
            if (!tagsToCheck.includes(el.tagName)) continue
            const style = getComputedStyle(el)
            // Skip elements that legitimately scroll
            if (style.overflowX === 'auto' || style.overflowX === 'scroll') continue
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') continue
            // Skip hidden elements
            if (style.display === 'none' || style.visibility === 'hidden') continue
            // Real overflow: scrollWidth > clientWidth by >1px
            if (el.scrollWidth > el.clientWidth + 1) {
              out.push({
                tag: el.tagName,
                cls: (el.className?.toString() ?? '').slice(0, 80),
                text: (el.textContent ?? '').trim().slice(0, 60),
              })
            }
          }
          return out
        })

        expect(
          overflowing,
          `Found ${overflowing.length} overflowing elements at ${route} in ${lang}@${vp.name}:\n${JSON.stringify(overflowing.slice(0, 5), null, 2)}`,
        ).toEqual([])
      })
    }
  }
}
