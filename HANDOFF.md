# DAD War Room — Session Handoff

> **For the next chat session.** Salles' current session hit the 1M token limit. This file captures the exact state and the resume path. Read this FIRST before doing anything.

**Last updated:** 2026-06-16 (end of session that ran Waves 1-9 — i18n hardened: parity 1074/locale, browser auto-translate blocked, overflow defenses in place, Docker LibreTranslate run completed)

---

## 1 · Where to actually start

1. **Read `WAR_ROOM_LOG.md`** in full. It has:
   - §1 Architecture (RLS pattern, card system, palette rotation, iconography)
   - §2 Applied features (with §2.10 migration list, §2.11-§2.17 wave summaries)
   - §3 Lessons learned (11 total — read all of them before coding)
   - §4 Backlog (P0-P4)
   - §8 Reconciled phased plan
2. **Read `PLANNING.md`** — has §3 with SQL specs for any future migrations.
3. **Read `README.md`** + **`DEPLOY.md`** for project context.
4. **Check `.env.local`** exists (gitignored) — Salles' working secrets live there.

If anything in the log is stale, trust the codebase + database state over the doc.

---

## 2 · ~~CRITICAL — Resume the i18n translation NOW~~ ✅ DONE in this session

The Docker run completed end-of-session. Final state:

| Locale | Keys | Coverage |
|---|---|---|
| en | 1074 | 100% canonical |
| pt | 1074 | ~99% (11 strings legitimately kept literal — proper nouns) |
| es | 1074 | ~99% (11 strings kept literal) |
| fr | 1074 | ~95% (139 kept literal, mostly via expanded dont-translate) |
| de | 1074 | ~95% (130 kept literal) |
| ru, tr, ar, zh, ko, ja | 1074 each | ~95% each |

Wave 9 (i18n hardening) ran on top — see WAR_ROOM_LOG.md §2.18. Browser auto-translate blocked via `<html translate="no">` + `<meta name="google" content="notranslate">`. Brand spans (`Header.tsx`, `Alliance.tsx` big title + motto) wear `translate="no"`. Bottom-nav labels wrap to 2 lines instead of overflowing. StatTile labels truncate cleanly. Reverter script cleaned up 16 stale "Reino N" / "Bate-papo" / "Sohbet" leaks across PT/ES/RU/TR/JA.

### If you ever need to re-run the translation (e.g. after adding new EN strings)

### Exact commands to finish all 10 locales right now

```bash
cd /Users/yagosales/Documents/Kingshot/DADkingshot/dad-guides

# 1. Verify LibreTranslate container is running (Salles started it during session-end)
docker ps --filter name=libretranslate

# If not running, start it:
docker run -d --rm -p 5050:5000 --name libretranslate \
  libretranslate/libretranslate \
  --load-only en,pt,es,fr,de,ru,tr,ar,zh,ko,ja

# 2. Wait for it to load models (~30-60s the first time)
until curl -s http://localhost:5050/languages | grep -q '"code":"pt"'; do sleep 2; done

# 3. Point the i18n script at it (set in .env.local OR inline):
LIBRETRANSLATE_URL=http://localhost:5050 npm run i18n:translate

# 4. When done, stop the container to free RAM:
docker stop libretranslate
```

LibreTranslate is unlimited — this will fill ALL 10 locales to ~100% in ~15-20 min.

### After the translation finishes

```bash
# Verify all locales have the same key count (parity check)
for lang in en pt es fr de ru tr ar zh ko ja; do
  node -e "const f=require('./src/locales/$lang.json');function k(o){let r=0;for(const x in o){if(typeof o[x]==='object'&&o[x]!==null)r+=k(o[x]);else r++}return r}console.log('$lang',k(f))"
done

# Verify build is clean
npx tsc --noEmit
npm run build

# Spot-check translation quality (open the app):
npm run dev
# Then: open localhost:5173, log in, switch language in Settings → Language picker
# Click through Hub, Settings, Members, Admin pages — verify everything reads in the chosen language.
```

If something looks wrong in a specific language, the strings live in `src/locales/<lang>.json`. Edit manually; commits are diff-friendly.

---

## 3 · The translation pipeline (built this session)

### Files
- **`scripts/i18n/translate.mjs`** — main script. Reads en.json, for each target locale finds keys where value === EN (= untranslated), sends to translation engine, writes back. Skips strings in `dont-translate.json` and pure URLs/placeholders. Never overwrites manual translations.
- **`scripts/i18n/dont-translate.json`** — game terms / brand names / proper nouns that stay literal across all locales (DAD War Room, Bear Hunt, KvK, Truegold, T1-T10, hero names, etc).
- **`scripts/i18n/pt-extras-1.json` + `pt-extras-2.json`** — manual PT dictionaries applied earlier (covered ~547 PT strings before MyMemory ran).
- **`.env.example`** — documents `MYMEMORY_EMAIL`, `LIBRETRANSLATE_URL`, `LIBRETRANSLATE_API_KEY`.

### Engines
- **Default**: MyMemory (free, no signup, 5K chars/day anonymous, 50K chars/day with email)
- **Preferred (now active)**: LibreTranslate self-hosted via Docker (`docker run libretranslate/libretranslate`) — unlimited, no rate limit, offline
- **Auto-select**: Script picks LibreTranslate if `LIBRETRANSLATE_URL` is set, else falls back to MyMemory

### Workflow for new strings (future)
1. Dev adds `t('hub.newButton')` in code + EN value in `src/locales/en.json` (canonical).
2. `npm run i18n:translate` — all 10 locales fill from EN.
3. Commit all 11 files together.

The Docker container is small (~3GB image, ~600MB RAM when running) — start it only when translating, stop after.

---

## 4 · Chat translation (FUTURE Fase 9 — not implemented yet)

When chat ships:
- Each message stores `original_text` + `original_lang` (auto-detected from i18n.language of writer)
- Viewer's UI sees translated to THEIR `i18n.language`
- **Engine**: browser native Translation API (Chrome 115+, Edge 115+) — runs on user's device, $0
- **Fallback**: server-side via existing LibreTranslate or MyMemory pipeline (cached aggressively)
- **Cache table** (to add when implementing): `chat_translations(message_id uuid, target_lang text, translated text, PRIMARY KEY (message_id, target_lang))`
- Each unique (message, lang) translated 1× in life, served from cache after

---

## 5 · Production go-live checklist (Salles must run himself)

From DEPLOY.md + Wave 6 verify output:

```bash
# 1. Set VAPID secrets (one-time)
npx supabase secrets set VAPID_PRIVATE_KEY=aWVsjbNVCLItQg4Yqip3tCXtwN_u4wF8_v9L5KgGo_4 --project-ref ilogsrlbenhdzkfgexvt
npx supabase secrets set VAPID_PUBLIC_KEY=BH64P-muxhIzCFlXjzFw_qVD-UpRwGAHafhZTVYqCLbJIIiuSNeBVUfaLXQXqaAgj77kZukz1E05nHZOFBJ-Ph4 --project-ref ilogsrlbenhdzkfgexvt
npx supabase secrets set VAPID_SUBJECT=mailto:salles@your-email.com --project-ref ilogsrlbenhdzkfgexvt

# 2. Schedule send-push cron (SQL Editor on Supabase Dashboard):
# (Exact SQL is in DEPLOY.md §"Cron schedule")

# 3. Push to GitHub
# 4. Connect Vercel to the repo
# 5. Set 3 env vars in Vercel: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_VAPID_PUBLIC_KEY
# 6. Trigger first deploy
# 7. Smoke test: log in → /admin/notifications → send test push to 'all'
```

---

## 6 · Project state summary (post Wave 8)

### Database (Supabase project: `ilogsrlbenhdzkfgexvt`)
- 17 migrations applied (full list in WAR_ROOM_LOG.md §2.10)
- 12 new tables: `alliance_settings`, `push_subscriptions`, `push_messages`, `push_message_deliveries`, `member_power_snapshots`, `event_participants`, `heroes`, `pets`, `masters`, `troop_tiers`, `troop_tier_branch_icons`, `kingdom_milestones` (already existed but body_html added)
- 4 storage buckets: `avatars`, `notification-images`, `milestone-bodies`, ...
- 3 Edge Functions deployed: `criar-usuario`, `redefinir-senha`, `send-push`
- Advisor: 5 security warns (1 leaked-password intentionally off; 2 SECURITY DEFINER on record_login_event with anon+authenticated CHECK guards; 2 on tg_member_power_snapshot trigger — all intentional per Lesson 12) + 22 perf INFOs (all FK index / unused index, none warns)
- RLS pattern: `private.is_admin()` SECURITY DEFINER, `public.is_admin()` SECURITY INVOKER wrapper, `GRANT USAGE ON SCHEMA private TO authenticated, anon` (Lesson 1)

### Frontend
- React 19 + Vite + Tailwind v3 + Tiptap + framer-motion + Phosphor + Web Push
- Bundle: 193 KB gzip (down from 717 KB starting point)
- 10 admin pages lazy-loaded via React.lazy + Suspense
- Tiptap stack in dedicated chunk (134 KB gz, cached across navigations)
- A11y baseline: focus-visible gold ring, prefers-reduced-motion neutralizes framer, skip-to-content link, aria-labels on icon-only buttons
- PWA configured: SW push handler, install button, offline-ready

### Backlog (P0 cleared, P1+ open)
- P1 — Chat live (Fase 9 — backend not built yet)
- P2 — 7 event guide pages besides Bear 1 (KvK, Viking, etc — Bear 1 is the template)
- P3 — Vercel deploy (config ready, Salles connects GitHub)
- P3 — Discord webhook + auto-translation in admin notifications
- P4 — Two cheap covering indexes for `event_participants.added_by` + `member_power_snapshots.recorded_by`
- P4 — Extract `getOccurrenceById` to repositories/occurrences.ts

---

## 7 · Important commands reference

```bash
# Working directory ALWAYS:
cd /Users/yagosales/Documents/Kingshot/DADkingshot/dad-guides

# Dev server
npm run dev               # http://localhost:5173

# Build
npm run build             # produces dist/
npx tsc --noEmit          # type-check only

# i18n
npm run i18n:translate         # fill missing keys in all locales
npm run i18n:translate:dry     # report only, no writes
npm run i18n:translate pt es   # specific locales

# Docker (i18n engine)
docker run -d --rm -p 5050:5000 --name libretranslate libretranslate/libretranslate
docker stop libretranslate
docker ps --filter name=libretranslate

# Database (Supabase MCP)
# Use mcp__f2ef4e9d-4f90-4c94-9102-68ece9d6a332__execute_sql / apply_migration / get_advisors
# Project ID: ilogsrlbenhdzkfgexvt
# Admin account UUID: cc7b697f-2d2b-45af-85e8-922a1b6387e2

# Memory files (cross-session knowledge)
ls /Users/yagosales/.claude/projects/-Users-yagosales-Documents-Dev-ler-liberta/memory/
# MEMORY.md is the index; the individual .md files are the persistent notes
```

---

## 8 · Conventions cheat-sheet (don't fight these)

- **Working dir always**: `/Users/yagosales/Documents/Kingshot/DADkingshot/dad-guides`. The default cwd may be the other project — explicitly `cd` first.
- **Files > 300 lines**: split.
- **No `any` in TypeScript**. No `console.log` in committed code.
- **Use `card-hero` for hero panels**, NOT `card-elev` (legacy with milky cream layer).
- **Card variants**: `--crimson` (war/event), `--success` (resting), `--steel` (info), `--portrait` (UserHero only).
- **Hero titles in cream, never gold**. Gold reserved for numerals, eyebrows, CTAs.
- **Real game assets > Phosphor icons** when one exists under `/public/images/`.
- **UTC everywhere** in DB and UI label.
- **Slugs**: NFD-normalized, lowercase, hyphen-separated, max 80 chars.
- **i18n**: every user-visible string via `t('namespace.key')`. EN canonical in `src/locales/en.json`. Brand/game terms in `dont-translate.json`.
- **Don't break manual translations**: the script only fills where `target.value === en.value`.

---

## 9 · How to continue work in the next session

1. Read this HANDOFF.md first.
2. Read WAR_ROOM_LOG.md §1-§4 (architecture, applied, lessons, backlog).
3. Confirm i18n translation completed end-to-end (run the parity check in §2 above).
4. Pick the next item from the backlog or whatever Salles asks.

**Don't re-derive anything.** The waves are documented exhaustively. Trust the log.

If you're spinning up a workflow with subagents, use the patterns from Waves 1-7: Foundation (DB) → parallel Frontiers (file-scoped) → Verify. Schemas, prompts, and lessons are in WAR_ROOM_LOG §3 and §8.2.

---

## 10 · Open small things that didn't get finished

- The translation Wave 8 was running on MyMemory rate-limit hit ES at 605/783, did not start FR/DE/RU/TR/AR/ZH/KO/JA. Switch to LibreTranslate (commands in §2 above) to finish.
- Update WAR_ROOM_LOG.md §2.17 with the final Docker-LibreTranslate run results after it completes.
- Mark Wave 8 fully done in §4 backlog.

---

## 11 · Wave 9 — i18n hardening (URGENT, do RIGHT AFTER Wave 8)

**Why:** Salles tested the PT build in the simulator (2026-06-16, end of session) and caught **two critical regressions** introduced by the auto-translate:

### 11.1 · Brand names got translated (P0 — embarrassment-level bug)

Screenshot showed:
- `"DAD BIGDADDYS"` → **`"PAPAI GRANDÃOS"`** (header AND hero title)
- `"DAD"` in subtitle → **`"PAPAI"`**
- `"Chat"` → **`"BATER PAPO"`** in bottom nav (Brazilian gamers say "chat", not "bater papo")
- `"Kingdom 1652"` → `"REINO 1652"` (debatable; user wants this kept)

**Root cause:** `dont-translate.json` uses exact-string matching only. The script translated whatever wasn't a perfect match. Likely the alliance name and motto live in `src/locales/en.json` (canonical) and got fed to LibreTranslate.

**Fix sequence (do in this order):**

1. **Audit where the alliance name lives:**
   ```bash
   cd /Users/yagosales/Documents/Kingshot/DADkingshot/dad-guides
   grep -rn "DAD BIGDADDYS" src/locales/ src/
   grep -rn "PAPAI GRANDÃOS" src/locales/
   ```
   If it's in `en.json` (and thus all locales), it shouldn't be. Alliance display name should come from the `alliances` table (or `alliance_settings.display_name`) and render **raw**: `<h1>{alliance.display_name}</h1>` — never through `t()`.

2. **Move alliance identity out of i18n entirely:**
   - Delete any `home.hero.allianceName`, `home.hero.kingdom`, `home.hero.motto` keys from all 11 `*.json` if they hold literal strings.
   - Replace usage with reads from `alliance_settings` table (Salles already has `alliance_name`, `kingdom_id`, etc).
   - Motto: keep as configurable in `alliance_settings.motto` — render raw.

3. **Patch `dont-translate.json` schema** to support three matching modes:
   ```json
   {
     "exact": ["DAD", "DAD BIGDADDYS", "Salles", "Truegold", ...],
     "regex": ["^DAD\\b", "BIGDADDY", "PAPAI GRAND"],
     "substring": ["BIGDADDY", "GRANDÃO"]
   }
   ```
   And update `scripts/i18n/translate.mjs` `shouldTranslate()` to check all three. (Currently checks `DONT.includes(s)` — replace with the 3-mode matcher.)

4. **Add to `dont-translate`:** "Chat" (BR gamers don't say "bater papo"), "Home" (kept as "Home" in PT-BR gamer slang? or → "Início" — confirm with Salles), all hero/troop/event proper nouns.

5. **Reverter script** (one-shot, then delete):
   ```bash
   # scripts/i18n/revert-bad-translations.mjs
   # Reads pt.json, es.json, etc. For each value containing any forbidden
   # substring, restores it from en.json.
   node scripts/i18n/revert-bad-translations.mjs \
     --bad "PAPAI GRANDÃOS,PAPAIZÃO,GRANDÃO,GRANDÃOS,BATER PAPO,BATEPAPO" \
     --restore-from en
   ```
   Then re-run `npm run i18n:translate` — those keys are back to EN, the script translates them again, but now with the strengthened dont-translate they stay literal.

### 11.2 · Layout overflow with long languages (P1 — affects DE/RU/KO worst)

Screenshot showed in PT (which is "only" 20% longer than EN):
- `"CLASSIFICAÇÃ"` cut off mid-word in KPI card label
- `"CONFIGURAÇÃO"` overflowing the bottom nav, overlapping `"ALIANÇA"`
- `"6,75 bilhões"` wrapping ugly inside the stat number

DE expands ~35%, RU ~40%, KO often wraps in unexpected places. Need **defensive layout** in every label-bearing component.

**Concrete fixes:**

1. **Build `<I18nText>` component** at `src/components/I18nText.tsx`:
   ```tsx
   import { useTranslation } from 'react-i18next'
   import { cn } from '~/lib/cn'

   type Props = {
     k: string
     fallback?: string
     maxLines?: 1 | 2 | 3
     className?: string
     vars?: Record<string, string | number>
   }

   export function I18nText({ k, fallback, maxLines = 1, className, vars }: Props) {
     const { t } = useTranslation()
     const text = t(k, { defaultValue: fallback ?? '', ...vars })
     return (
       <span
         className={cn(
           'block min-w-0',
           maxLines === 1 && 'truncate',
           maxLines === 2 && 'line-clamp-2',
           maxLines === 3 && 'line-clamp-3',
           className,
         )}
         title={text}
       >
         {text}
       </span>
     )
   }
   ```

2. **Apply `<I18nText>` everywhere a label can overflow:**
   - `BottomNav.tsx` — every tab label with `maxLines={2}` and `text-[10px] leading-tight`
   - `KPIStatCard.tsx` — eyebrow label (`maxLines={1}`) AND number container (`whitespace-nowrap`, abbreviate)
   - `SectionCTA.tsx` (the "ABRIR PESQUISAS / MEMBROS" cards) — title `maxLines={1}`, description `maxLines={2}`
   - All Admin tab labels, breadcrumbs, dropdown items

3. **Abbreviate large numbers** in a single helper:
   ```ts
   // src/lib/formatPower.ts
   export function formatPower(n: number, locale: string): string {
     // 6,750,000,000 → "6.75B" (en) / "6,75 Bi" (pt) / "6,75 Mrd" (de) / etc
     if (n >= 1e9) return `${(n/1e9).toFixed(2)}${t('units.billion')}`
     if (n >= 1e6) return `${(n/1e6).toFixed(2)}${t('units.million')}`
     ...
   }
   ```
   Add `units.billion`, `units.million`, `units.thousand` to en.json. Tiny suffixes (`B`/`Bi`/`Mrd`/`만`/`억`) keep the stat compact in all locales.

4. **Switch UPPERCASE labels to Title Case** where the language expansion hurts (uppercase eats 20-30% more width). Tailwind: `uppercase tracking-wider` → `font-semibold tracking-tight`. Keep uppercase only on short fixed words ("DAD", "T1", "KvK").

5. **Container queries on stat cards** so they shrink the number font automatically when the card narrows in long-language layouts:
   ```css
   .kpi-card { container-type: inline-size; }
   .kpi-number { font-size: clamp(1.5rem, 8cqi, 2.25rem); }
   ```

### 11.3 · Regression test (mandatory before considering Wave 9 done)

Add `tests/i18n-overflow.spec.ts` (Playwright):
```ts
import { test, expect } from '@playwright/test'

const LONG_LANGS = ['de', 'ru', 'ko', 'ar']
const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 13', width: 390, height: 844 },
  { name: 'iPad mini', width: 768, height: 1024 },
]

for (const lang of LONG_LANGS) {
  for (const vp of VIEWPORTS) {
    test(`no overflow in ${lang} @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(`/?lang=${lang}`)
      // wait for hydration
      await page.waitForSelector('[data-i18n-ready="true"]', { timeout: 5000 })
      const overflowing = await page.evaluate(() =>
        [...document.querySelectorAll('*')]
          .filter(el => {
            const cs = getComputedStyle(el)
            if (cs.overflow === 'visible') return false  // intentional
            return el.scrollWidth > el.clientWidth + 1
          })
          .map(el => ({
            tag: el.tagName,
            cls: el.className.toString().slice(0, 60),
            text: el.textContent?.slice(0, 40),
          }))
      )
      expect(overflowing, JSON.stringify(overflowing, null, 2)).toEqual([])
    })
  }
}
```
Wire into CI — any overflowing element breaks the build. This is the only way to prevent this regression class permanently.

### 11.4 · Task list with estimates

| # | Task | Pri | Est |
|---|------|-----|-----|
| 1 | Audit + remove `DAD BIGDADDYS` / alliance name from all `*.json` | P0 | 30min |
| 2 | Move alliance identity render to read from `alliance_settings` | P0 | 1h |
| 3 | Reverter script: restore tainted PT/ES values from en.json | P0 | 30min |
| 4 | Patch `dont-translate.json` to 3-mode (exact/regex/substring) | P0 | 1h |
| 5 | Update `translate.mjs` `shouldTranslate()` for new schema | P0 | 30min |
| 6 | Re-run `npm run i18n:translate` for affected locales | P0 | 20min |
| 7 | Build `<I18nText>` component | P1 | 45min |
| 8 | Apply `<I18nText>` to BottomNav, KPIStatCard, SectionCTA, Admin tabs | P1 | 2h |
| 9 | `formatPower()` + `units.*` i18n keys + integrate in all stat cards | P1 | 1h |
| 10 | Container queries on `.kpi-card` for auto-shrink | P1 | 30min |
| 11 | UPPERCASE → Title Case sweep on long-label components | P2 | 1h |
| 12 | Playwright `i18n-overflow.spec.ts` (DE/RU/KO/AR × 3 viewports) | P1 | 1.5h |
| 13 | CI wiring + green pipeline | P1 | 30min |
| 14 | Update `WAR_ROOM_LOG.md` §2.18 + Lesson 12+1 | — | 30min |

**Total estimate: ~11h focused work** (one solid session).

### 11.5 · Definition of done for Wave 9

- [ ] No string containing "PAPAI", "GRANDÃOS", "BATEPAPO", "BATER PAPO" exists in any `src/locales/*.json`.
- [ ] `grep -rn "DAD BIGDADDYS" src/locales/` returns ONLY en.json (or zero hits if moved to DB).
- [ ] App opened in DE, RU, KO, AR at iPhone-SE viewport shows zero clipped text in Home/Settings/Members/Admin landing.
- [ ] Playwright spec green in CI.
- [ ] WAR_ROOM_LOG §2.18 documents Wave 9 + new Lesson "i18n overflow defense + brand-name lock".

### 11.6 · Playwright spec scaffolded (Wave 9 finalization run, 2026-06-16)

The regression spec lives at `tests/i18n-overflow.spec.ts` and the config template at `playwright.config.ts.template`. To activate:

```bash
cd /Users/yagosales/Documents/Kingshot/DADkingshot/dad-guides
npm install -D @playwright/test
npx playwright install chromium
mv playwright.config.ts.template playwright.config.ts
npx playwright test
```

Wire into CI: add the same 4 lines to GitHub Actions workflow when ready.

The spec covers 4 long-expand langs (DE/RU/KO/AR) × 3 viewports × 4 routes = 48 assertions. Any `scrollWidth > clientWidth` fails the build.

---

That's it. The handoff is comprehensive. New session can pick up cleanly.
