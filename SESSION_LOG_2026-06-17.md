# DAD War Room — Session Log 2026-06-17

> Comprehensive log of one long working session spanning Waves 9 → 15. Captures
> what was built, what broke, what was decided, where things stand, and what
> the next session should pick up. Read alongside `HANDOFF.md` (quick reference)
> and `WAR_ROOM_LOG.md` (per-wave technical detail).

**Author:** Claude Opus 4.7 (1M context) working with Salles (R5 admin).
**Duration:** ~14 hours of focused collaboration across 2 calendar days.
**Project state at session end:** live in production at https://dad-war-room.vercel.app, push notifications operational, 243 game icons catalogued, Wave 15 redesign in flight via workflow.

---

## 1 · Project status snapshot

| Dimension | State |
|---|---|
| Production URL | https://dad-war-room.vercel.app |
| GitHub | https://github.com/projetosyago/dad-war-room (public, main branch) |
| CI/CD | GitHub Actions + Vercel auto-deploy on push to main — both green |
| Supabase project | `ilogsrlbenhdzkfgexvt` (free tier) |
| Edge Functions | `create-account` (v6), `reset-password` (v6), `send-push` (v6, verify_jwt=false) |
| pg_cron jobs | `send-push-every-minute` — active, returning 200 |
| VAPID secrets | Set in Supabase Edge Function Secrets |
| Database migrations | 33 applied, all 33 in git (Wave 10 backfill) |
| i18n parity | 11 locales × 1107 keys (pre Wave 15 — may have moved during workflow) |
| Build size | 344 KB gzip main bundle, 191 PWA precache entries |
| Tests | 13 Vitest smoke tests passing (2 suites) |
| TypeScript | `tsc --noEmit` clean |
| Lint | 0 errors, 6-7 warnings (all pre-existing, non-blocking) |

---

## 2 · Wave-by-wave summary

### Wave 9 — i18n hardening (start of session)
Continuation from prior session. Locked in 11-locale parity at 1074 keys, blocked
browser auto-translate, added overflow defenses to BottomNav and StatTile.
Created the `<I18nText>` component, three-mode `dont-translate.json` (exact/regex/
substring), reverter script for stale translations, and ran Docker LibreTranslate
to fill all 10 non-EN locales.

**Decisions:** browser auto-translate is the enemy when we ship our own i18n —
hard-block via `<html translate="no">` + `<meta name="google" content="notranslate">`.

### Wave 10 — Independent audit + remediation
Performed an adversarial third-party audit ignoring prior documentation. Found
17 issues across 4 severity tiers. Then ran an 11-agent remediation workflow
that fixed 10 of them, lifting the project score from 6.1/10 to 7.7/10.

**What got fixed:**
- `git init` + first commit (project had NEVER been in version control)
- 27 missing Supabase migrations pulled from the remote DB into `supabase/migrations/`
- TypeScript types regenerated from the live DB
- `Alliance.tsx` switched from hardcoded `ROSTER` JSON to live `useMembers()` hook
- 26 `react-hooks/set-state-in-effect` lint errors resolved (Patterns A/B/C strategy)
- DOMPurify added for `MilestoneDetail.bodyHtml` (XSS hardening)
- PII redacted in Edge Function logs (email/username masked)
- 8 covering indexes added to FK columns
- `as unknown as any` cast removed from notifications repo (typegen caught up)
- Vitest + jsdom + Testing Library installed; 13 smoke tests written
- `.github/workflows/ci.yml` added (lint + tsc + test + build + i18n parity)

**What remained pending:** push e2e (needed VAPID + browser test), Vercel deploy,
9 files over 300 lines (deferred — too much refactor cost), login rate-limit
(Supabase Dashboard config), Chat tab UX, content for empty catalogues.

### Wave 11 — User-flagged bugs + audit consolidation
4 user-reported bugs after the Wave 10 commit + 3 audit consolidation items.

**Bugs fixed:**
- **send-push CORS** — root cause: deployed Edge Function had no CORS headers
  and no `OPTIONS` handler. Browser preflight failed before the actual POST
  could run. Surfaced to the SDK as the opaque "failed to send a request to
  the edge function." Fix: added `corsHeaders` with the `x-application-name`
  custom header on the whitelist (our supabase client sets it globally),
  short-circuit OPTIONS preflight returning 204, CORS headers on every JSON
  response. Plus a `{ message_id }` body shortcut for the admin "send now"
  flow.
- **Admin "Sair" required two clicks** — race in App.tsx auto-enter effect:
  if `pathname.startsWith('/admin/') && auth.isAdmin && !adminMode` enter().
  Old handler called `exit()` then `navigate('/settings')`. React reconciled
  with `adminMode=false` while pathname was still `/admin/*`, the effect
  fired and re-set `adminMode=true`. Fix: flip the order — `navigate()` first,
  `exit()` after. Comment in the source warns the next reader.
- **Admin nav missing scroll indicators** — added `<CaretLeft />` / `<CaretRight />`
  pills with conditional visibility based on `scrollLeft` and `scrollWidth`.
- **Content cropped under bottom nav** — `BottomNavSpacer` was `h-[72px] pb-safe`
  under border-box, so the safe-area inset rendered *inside* the 72px box, not
  extending it. Recomputed: `minHeight: calc(64px + max(0.5rem, env(safe-area-inset-bottom)))`
  — additive, so the spacer grows with the inset instead of being eaten by it.

**Audit consolidation:**
- 10 i18n keys flagged as "missing" turned out to be i18next *plural forms* with
  `_one` / `_other` suffixes — the naive grep audit didn't model that. Lesson
  for future auditors: check `t(key, { count: N })` call patterns before
  flagging missing keys.
- 6 of 8 hooks got the `alive` guard cleanup pattern; 2 already had equivalent
  guards (useCountdown via setInterval cleanup, usePushSubscription via own
  `cancelled` flag).
- `AdminPolls.tsx` migrated from 8 scattered `useState` calls to
  `useForm + useFieldArray + zodResolver` with `superRefine` checks.

**Critical follow-on found during agent's send-push investigation:** the pg_cron
job from earlier in the session was hitting `/functions/v1/send-push` every
minute and getting 401 because the cron SQL didn't include an Authorization
header (`current_setting('app.settings.service_role_key', true)` returned NULL
in this project). User-facing "send now" worked (browser sent its JWT), but
scheduled push was broken. **Resolution:** redeployed send-push as v6 with
`verify_jwt: false` — the function authenticates via its own
`SUPABASE_SERVICE_ROLE_KEY` env var internally, so the caller's JWT is
redundant. Confirmed via `SELECT … FROM net._http_response`: cron now returns
200 with body `{"processed":0,"delivered":0,"failed":0,"errors":[]}`.

### Wave 12 — Mobile polish (post first iPhone test)
First test on real iPhone PWA revealed 3 issues:

- **PWA icon showed a visible white border** under the iOS rounded-corner mask.
  Root cause: previous PNGs were RGBA with transparency baked in — iOS' mask
  let the device wallpaper bleed through. Regenerated full-bleed 180/192/512
  from the `DadCrest` SVG over an opaque dark-navy canvas using `sharp`,
  flattened with `removeAlpha`. Maskable variants got 62% crest ratio for
  Android adaptive-icon mask safe zone.
- **Internal pages had ← Back text inside the body**, user wanted it in the
  header. Header now shows `[← Back] [DAD BIGDADDYS centered] [🔔]` on every
  non-`/` route. 4 member-facing pages had their inline back affordances
  removed (MilestoneDetail, MemberDetail, HeroDetail, PollDetail). Admin
  "Voltar ao admin" links kept as breadcrumbs.
- **iOS Safari auto-zoomed on input focus** — text-sm (14px) is below the 16px
  no-zoom threshold. Added `@media (hover: none) and (pointer: coarse)` that
  forces 16px on input/textarea/select. Desktop hover-capable devices keep
  the smaller 14px.

### Wave 13 — Full icon system regeneration (post second iPhone test)
User reported the new icon STILL looked weak. Second pass:

- **Replaced DadCrest-derived icons with a "Bracketed D" concept** chosen by
  the user from a 6-option showcase generated via the `/logo-generator` skill.
- **Glyph converted to SVG path** — no font dependency on Vercel's Linux build
  server.
- **Generated for every platform**: 3 favicon PNGs (16/32/48), 4 Apple Touch
  PNGs (120/152/167/180), 2 PWA maskable (192/512 with safe zone), 2 PWA any
  (192/512), 1 macOS install (1024), 1 Windows tile (144), 1 OG social image
  (1200×630 with brand text). Plus `favicon.svg` and `mask-icon.svg`.
- **All PNGs are opaque 8-bit RGB** — no alpha channel, no rounded-corner mask
  bleed. Verified via `file` and `sips` post-render.

After deploy, user reported icon STILL old. Root cause: Vercel served
`Cache-Control: public, max-age=31536000, immutable` on `/icons/*` — iOS
Safari cached the old icon by URL for a year. **Fix:** appended `?v=2` to
every icon URL in `index.html`. iOS treats query-stringed URLs as different
resources; the new file is fetched fresh. Future icon refreshes: bump `v=N`.

### Wave 14 — Multi-issue UX iteration (visible in production)
Several user-flagged refinements after the icon shipped:

- **Auth gate** — every member route (`/`, `/events`, `/alliance/*`, `/heroes/*`,
  `/pets`, `/masters`, `/troop-tiers`, `/settings`, `/bear-1`, `/timeline/:slug`,
  `/p/:token`) was reachable signed-out. Wrapped them in a new `<RequireAuth>`
  layout route. Signed-out visitors get bounced to `/login` with their target
  preserved in `location.state.from`. `/login` stays public; `/admin/*` keeps
  its stricter `<ProtectedAdminRoute>` on top.
- **iOS notch header** — `Header` was `sticky top-0` without `pt-safe`, so the
  title was hidden under the iPhone status bar. Added `.pt-safe` / `.mt-safe`
  / `.pt-safe-plus` CSS utilities; applied `.pt-safe` to `<header>`. Then —
  because the bug recurred when user installed as PWA in standalone mode —
  converted `sticky top-0` to **`fixed top-0 inset-x-0`** with a sibling
  `<HeaderSpacer/>` taking the same vertical real estate. Sticky inside a
  flex column loses its scroll anchor in iOS PWA standalone mode; `fixed`
  doesn't depend on any ancestor.
- **Bottom nav perceived as floating** — opaque solid bg (rgb(13,15,28) →
  rgb(19,23,42) gradient that ends at body color so the home-indicator zone
  merges with the page bg), stronger gold border, full-edge top accent line.
- **Back button to icon-only** — the `← BACK` text wide-bar was replaced with
  a `[←]` icon-only button matching the bell style on the right. Result: the
  three slots are now visually balanced `[icon] [centered title] [icon]`.
- **Browser auto-translate vs brand names** — locked at the source: `<html
  translate="no">` + `<meta name="google" content="notranslate">` in
  `index.html`, plus `translate="no"` on the brand spans in Header.tsx and
  Alliance.tsx so Chrome never rewrites "DAD BIGDADDYS" as "PAPAI GRANDÃOS".
- **iOS input zoom**, take 2 — Wave 12 fix only covered `input[type='text']`
  etc. Inputs without a type attribute, and Tiptap's `.ProseMirror /
  .tiptap` contenteditable divs, were missed. Broadened the selector to
  cover `input` (any type), `textarea`, `select`, `[contenteditable]`,
  `.ProseMirror`, `.tiptap`. Added `touch-action: manipulation` on the
  same surfaces (kills the iOS 300ms tap delay).
- **Login: language picker** — was a dead button with hardcoded 🇬🇧 EN. Now
  inline dropdown with all 11 locales; calls `i18n.changeLanguage()` +
  persists to `localStorage`; click-away closes; `aria-haspopup="listbox"`.
- **Login: PWA install** — was a dead button. Built `usePwaInstall` hook that
  captures `beforeinstallprompt` and detects platform (ios-safari, mac-safari,
  android-chrome, desktop-chromium, firefox). Built `PwaInstallModal`
  component with platform-specific install steps. Android Chrome / desktop
  Chromium browsers get the one-tap native install prompt; iOS, macOS Safari,
  and Firefox get a clean tutorial sheet with steps and icons.
- **Game Catalogue moved from Alliance to Hub** — gameplay reference data
  is more useful at-a-glance on the dashboard than as a sub-page.
- **Game Catalogue tile refinement** — removed description blurb, removed
  per-tile counts, removed Phosphor icon fallbacks (Heroes and Tiers had
  the uploaded portrait AND the icon rendered on the same z-stack,
  producing a doubled muddy look). New rule: only uploaded game assets
  are shown in tiles. Empty categories render a faint gold radial wash.
- **PendingPollsCard subtitle removed** — "All open votes already received
  your vote." was filler under the "No pending polls" title. Eyebrow +
  title alone communicate the state.

### Wave 15 — Council redesign + card variation system (in flight at session end)

Multi-agent workflow `wf_09ad0ace-2ff` running in background covering:

1. **CSS card variation system** in `index.css`: 3 new tones (`--success`,
   `--steel`, `--violet`) with explicit `tone × glow-position` pairs
   (`glow-tr`, `glow-c`), plus a `--pulse` animation guarded by
   `prefers-reduced-motion`.
2. **Council vocabulary i18n rename** (decided with user): `polls` → `council`,
   `poll` → `motion`, etc — labels only. URLs (`/alliance/polls`) and code
   identifiers (`Polls.tsx`, `PollDetail.tsx`, namespace `polls.*`) kept
   unchanged to avoid breaking deep-links and to skip a low-value refactor.
3. **Centralize page-level titles** across all feature pages (Members, Heroes,
   Pets, Masters, Troop Tiers, Events, Council, Bear1Guide, Chat). Detail
   pages keep their context-aware alignment.
4. **Apply tone × glow to each dashboard card** per a user-approved table:
   UserHero gold portrait (unchanged), NextEvent crimson + glow-tr,
   PendingPolls success when empty / gold default when pending, Catalogue
   steel + default, Timeline violet + glow-c.
5. **Council list redesign** — status tabs (Open / Decided / Archived) with
   counts, status badges per state, leading option preview with progress
   bar, participation ring, urgency-tinted time chip, cards inherit the
   right tone variant per state.
6. **Council detail redesign** — countdown hero, participation donut, results
   widget with per-option bar + count + leading glow, voters row,
   `last 48h` sparkline, sticky action bar at bottom.
7. **Verify + commit + push** — final gate ensuring tsc, lint, tests, build,
   and i18n parity all green before the bundle ships.

**Decisions made via the `ui-ux-pro-max` skill:**
- The "Glass-Continuous Card" hero merge for Hub was visually inspected via
  a mocked widget but **rejected by user** as not impactful enough.
- Council redesign pattern won approval after 1 mockup showing the
  countdown hero + donut + results widget vibe.

### Icon scraper (executed in parallel with Wave 15 workflow)
Pulled every game icon from kingshotdata.com via the WordPress REST API
`?_embed=wp:featuredmedia`. 243 images across 10 buckets:

| Bucket | Count |
|---|---|
| research | 89 |
| heroes | 40 |
| events | 32 |
| war-academy-research | 30 |
| pets | 14 |
| buildings | 12 |
| items | 10 |
| database | 8 |
| alliance-tech | 4 |
| masters | 4 |
| **Total** | **243** |

Disk footprint: 5.5 MB. Manifest at `public/images/icons/kingshot-manifest.json`
with `{slug, title, link, local, source}` per asset for programmatic lookup.
Polite 250ms delay between requests, idempotent re-run support.

---

## 3 · Critical decisions made (with rationale)

### Vercel deployment

- **Vercel Authentication / "Require Log In" disabled** (was Standard Protection).
  Even though the app has its own auth, Vercel's gate blocked OG image
  scrapers from generating link previews (Facebook, Discord, WhatsApp scrapers
  don't execute the JS challenge). Since RLS already protects what matters,
  Vercel's gate was strictly worse — disabled.
- **Token approach instead of `vercel login` browser flow** — user generated a
  Vercel token, pasted in chat, then was prompted to rotate it after the
  session (standard best practice for chat-exposed credentials).
- **Vercel CLI installed as a devDep** because `npm install -g` requires
  sudo on macOS. Stored as `vercel@54.14.0` in `package.json`.
- **`npm install --legacy-peer-deps` required** for the install command on
  Vercel build because React 19 has peer-dep conflicts with several deps.

### Supabase

- **send-push redeployed with `verify_jwt: false`** because pg_cron couldn't
  resolve `current_setting('app.settings.service_role_key', true)` (returned
  NULL in this project). The function uses its own `SUPABASE_SERVICE_ROLE_KEY`
  env var internally for DB writes, so the caller's JWT is redundant.
- **Vercel automation bypass not used** — would have meant a long-term
  shared secret. Disabling Vercel Auth entirely was the cleaner call.

### Naming / vocabulary

- **Council** chosen over War Council, Decisions, Verdict, etc. Rationale:
  short (translates to a single word in all 11 locales), thematic,
  strategically-flavored, universal in medieval/strategy games. The Polls →
  Council rename touches **labels only**, not URLs or code identifiers
  (`/alliance/polls` stays, `Polls.tsx` stays, `polls.*` i18n namespace
  stays). Zero deep-link breakage, zero refactor churn.
- **Motion** as the noun for an individual council item (instead of "poll").
  Same rationale — universally translatable.

### Card design system

- **Tone × Glow × Texture** matrix instead of flat per-card overrides. Each
  card's purpose maps to a tone (gold/crimson/success/steel/violet); each
  card's visual weight maps to a glow position (top-left / top-right /
  center-top); optional texture modifiers (`--ornament`, `--mesh`, `--pulse`)
  for cards that need extra differentiation.
- **No Phosphor icons in Game Catalogue tiles** — only uploaded game-asset
  images. Empty categories render a faint placeholder wash. Rationale: the
  old icon-behind-image stack produced doubled, muddy visuals where the
  icon bled through the image edges.

### Navigation / scroll

- **`<ScrollToTop>`** mounted inside `<BrowserRouter>` restores scroll on
  PUSH/REPLACE (new navigation) but preserves position on POP (back/forward).
  Smooth-scrolls to `#hash` if present (used by `/alliance#announcements`).
- **NotificationsPanel "View all" → `/alliance#announcements`** instead of
  the placeholder `/settings`. The Alliance Announcements section uses the
  same `useMyNotifications` hook the bell already drives — single source of
  truth, no new page needed.

### Authentication

- **`<RequireAuth>`** wraps every member route. Auth-gated by default, with
  `/login` as the only public escape hatch. Signed-out visitors get bounced
  with `location.state.from` so they land on the right page after auth.
- **No login rate-limit at app level** — Supabase Dashboard auth rate-limits
  are sufficient for current scale. Defer to next session if abuse is seen.

### Performance / mobile

- **Header from `sticky` to `fixed top-0 inset-x-0`** plus a sibling
  `<HeaderSpacer />`. Sticky inside a flex column loses scroll anchor in iOS
  PWA standalone mode (silent bug — works in regular Safari, breaks only in
  standalone). `fixed` ignores ancestors, anchors to viewport, no edge case.
  Same pattern bottom nav has used since day one.
- **iOS input zoom CSS fix broadened** to cover ALL inputs (not just
  `input[type='text']`), textarea, select, `[contenteditable]`,
  `.ProseMirror`, `.tiptap`. Earlier fix missed Tiptap admin editors and
  type-less inputs.
- **Cache-bust icon URLs with `?v=2`** because Vercel serves
  `cache-control: max-age=31536000, immutable` on `/icons/*`. iOS Safari
  refused to refresh the home-screen bitmap until the URL changed.

---

## 4 · Errors hit during the session

### `Vercel deploy_to_vercel MCP returns "use CLI"`
The Vercel MCP doesn't actually deploy — it just instructs the agent to use
the CLI. **Workaround:** installed CLI as devDep + used `VERCEL_TOKEN` for
non-interactive auth.

### `npm install -g vercel` failed with EACCES
macOS user can't install globally without sudo. **Workaround:** local
`npm install --save-dev vercel`.

### `npm install sharp` peer-dep conflicts with React 19
React 19 isn't in many libs' peerDependencies yet. **Workaround:** `--legacy-peer-deps`
flag for every install. Also added the same flag in the Vercel `installCommand`.

### `pg_cron sending 401 every minute`
`current_setting('app.settings.service_role_key', true)` returned NULL in
this Supabase project — that setting wasn't populated. **Workaround:**
deployed send-push with `verify_jwt: false`. The function authenticates via
its own env var internally; the caller's JWT is redundant.

### `position: sticky on Header broken in iOS PWA standalone mode`
Works fine in regular Safari. Broken silently in standalone PWA when the
parent is a flex column with `pt-safe`. **Workaround:** switched to `fixed
top-0 inset-x-0` with a sibling `HeaderSpacer`. Same pattern bottom nav uses.

### `iOS PWA caching the old apple-touch-icon for a year`
Vercel ships `cache-control: max-age=31536000, immutable` on `/icons/*` for
performance. iOS Safari honors this aggressively — even after delete + re-add
the PWA, it serves the cached bitmap. **Workaround:** cache-bust query
`?v=2` appended to every icon URL in `index.html`. Future icon refreshes
bump the number.

### `Browser auto-translate mangling brand names`
Chrome translated `DAD BIGDADDYS` → `PAPAI GRANDÃOS` even though our i18n
explicitly says NOT to. **Workaround:** `<html translate="no">` +
`<meta name="google" content="notranslate">` in index.html, plus
`translate="no"` on every brand span in Header.tsx and Alliance.tsx.

### `Audit flagged 10 missing i18n keys that actually existed`
The naive grep audit didn't understand i18next plural forms (`key_one`,
`key_other`). All 10 "missing" keys were actually present as plurals.
**Lesson:** auditors must model `t(key, { count: N })` call patterns
before flagging.

### `ROSTER hardcoded in Alliance.tsx while Members uses live DB`
Alliance landing showed 88 members from a JSON file; Members listed 88 from
Supabase. They never diverged because no one edited members yet, but they
*could* diverge silently. **Fixed in Wave 10:** Alliance.tsx switched to
`useMembers()`.

### `WaveX agents stalling on sleep`
Two side-effect agents `sleep`-ed waiting for a deploy + then ran out of turn.
**Workaround:** for follow-on verification, drove from the main loop instead
of from the agent. Lesson: don't ask a subagent to `sleep` long. Use a
Monitor or a follow-on prompt.

### `Vercel Auth blocking OG image scrapers`
Standard Protection meant Facebook / Discord / WhatsApp scrapers got 403
on `/icons/og-image.png` — they don't run the JS challenge. **Workaround:**
disabled "Require Log In" in Vercel project settings. RLS protects what
matters; Vercel's gate was strictly worse for this app's threat model.

### `BottomNavSpacer height eaten by safe-area inset`
`h-[72px] pb-safe` under border-box rendered the safe-area padding *inside*
the 72px box instead of extending it. On iPhone Pro (34px home-indicator
inset), the spacer was effectively 38px tall — content scrolled under the
nav. **Fix:** `minHeight: calc(64px + max(0.5rem, env(safe-area-inset-bottom)))`
— additive math, grows with the inset.

---

## 5 · Audit findings (independent adversarial, Wave 10)

Performed by an independent agent ignoring all prior documentation. Below is
the verbatim summary from the audit report, kept for posterity.

### Critical (resolved Wave 10)
1. **No git repository** — entire project had never been versioned. Resolved
   by `git init` + first commit in Wave 10 foundation phase.
2. **27 of 33 migrations only in remote DB** — schema-as-code was broken. A
   clone of the repo could not reproduce production. Resolved by backfilling
   all 27 from `supabase_migrations.schema_migrations` via the Supabase MCP.
3. **VAPID secrets not set** in Supabase Edge Function Secrets — push was
   non-functional in production. Resolved later in the session manually
   (user pasted secrets in Supabase Dashboard).

### High (mostly resolved)
4. **Alliance.tsx used hardcoded ROSTER** — Wave 10 switched to
   `useMembers()`.
5. **Push notifications never tested end-to-end** — fixed during the
   pg_cron / CORS / verify_jwt work later in the session.
6. **26 `react-hooks/set-state-in-effect` lint errors** — Wave 10 fixed all
   26 via the Pattern A/B/C strategy (lazy init / eslint-disable with
   justification / TanStack migration deferred).
7. **0 automated tests** — Wave 10 added Vitest + 13 smoke tests.
8. **0 CI/CD** — Wave 10 added GitHub Actions workflow.

### Medium (mostly resolved)
9. `MilestoneDetail.bodyHtml` unsanitized — Wave 10 added DOMPurify.
10. 4 SECURITY DEFINER functions exposed to anon/authenticated — accepted as
    intentional per prior decision (`record_login_event` and
    `tg_member_power_snapshot` are gated by their internal logic).
11. 8 FKs without covering index — Wave 10 added covering indexes.
12. 9 files over 300 lines (project's own rule) — **deferred**. Refactor cost
    high, risk to working code real. AdminAccounts.tsx (706 lines) is the
    worst.
13. 1 `as any` cast in `notifications.ts` — Wave 10 removed after typegen
    refresh.
14. No app-level login rate-limit — accepted (Supabase Dashboard rate-limits
    suffice for current scale).

### Low (deferred or accepted)
15. `console.log` of email/username in `create-account` edge function —
    Wave 10 redacted with helper.
16. Chat tab is a placeholder route — UX decision, kept for now.
17. Pets / `troop_tier_branch_icons` empty — content, not code. Will fill
    once admin uploads artwork.

**Post-audit score:** 6.1/10 → 7.7/10 after Wave 10 fixes.

---

## 6 · Verdict + next-session roadmap

### "Would I approve for production?" — SIM COM RESSALVAS

After Wave 10 the answer flipped from NO to YES-with-caveats. After Wave 14
(production live, push tested, VAPID configured, icons polished, header
fixed) the caveats are largely cleared.

### Immediate (next session may want to verify before doing anything new)
- **Wave 15 workflow result** — running at session end. When it completes:
  - Verify Council list + detail look as expected on iPhone PWA
  - Confirm page titles centered across all feature pages
  - Confirm dashboard cards now have distinct tones
  - Check parity is still 11 × N for the new key count
- **Vercel token rotation** — user-pasted in chat; rotate when convenient.
- **Apply scraped game icons** to the catalogue tiles, hero pages, etc.
  243 icons sit in `public/images/icons/kingshot/` waiting for use. Manifest
  is at `public/images/icons/kingshot-manifest.json`.
- **Swap timeline.png into KingdomTimelineCard + MilestoneDetail** —
  user-requested icon at `public/images/icons/timeline.png` is ready.

### Short-term (next 1-2 sessions)
- **Login rate-limit** via Supabase Dashboard auth settings.
- **AdminAccounts.tsx refactor** — 706 lines, split into 3-4 files.
- **Pets + Masters portraits** — use scraped `/kingshot/pets/*.webp` and
  `/kingshot/masters/*.webp` to populate the catalogue with real artwork.
- **Discord webhook** for admin notifications — was in the original Wave 6
  backlog, still open.
- **Event guide pages** — 7 more besides Bear 1 (KvK, Viking Vengeance,
  Tri-Alliance Clash, Cesar's Fury, Swordland Showdown, Lunar Festival,
  Castle Battle). Bear 1 is the template.
- **Member portraits** — the scraped heroes can be used as user avatars.

### Medium-term (3+ sessions)
- **Chat live** (Fase 9 from PLANNING.md) — backend not built. Uses Supabase
  Realtime + a `chat_translations` cache table for browser-native
  Translation API caching.
- **Multi-language announcements** — auto-translate push messages at send
  time using a similar caching strategy.
- **Member power-up history** — `member_power_snapshots` table exists but
  no chart yet.
- **Migration of admin-page-level forms** to react-hook-form + zod
  (AdminPolls already done in Wave 11; AdminHeroes/Pets/Masters/Notifications
  still use scattered useState patterns).

### Decisions to push to user for the next session
- **Hero+UserHero integration on Hub** — user rejected all 3 patterns
  shown (Glass-Continuous Card mockup, parallax hero, pull-down identity).
  Decision: KEEP CURRENT as-is. Don't re-propose unless explicitly asked.
- **Council rename scope** — Phase 1 (labels only) decided. If user later
  wants Phase 2 (routes + code), it's ~2h of search-replace + 301 redirects.

---

## 7 · Future agent guidance — pitfalls I learned

### Always know which working directory you're in
The user has two projects in adjacent paths: `dad-guides` and `ler-liberta`.
The shell session sometimes lands in the wrong one. Always **explicitly**
`cd /Users/yagosales/Documents/Kingshot/DADkingshot/dad-guides` before
operations.

### iOS PWA standalone mode behaves differently than browser Safari
Bugs that only reproduce in standalone:
- `position: sticky` loses scroll anchor in flex-column ancestors → use `fixed`
- `apple-touch-icon` cached for a year → cache-bust query
- `safe-area-inset-bottom` is non-zero (home indicator zone)
- Tap delay (~300ms) on links without `touch-action: manipulation`

### Don't `sleep` long inside a subagent
Subagents that `sleep` more than a few seconds can stall the workflow. For
follow-on verification of a deploy or long-running task, drive from the main
loop instead (Bash `run_in_background`, Monitor tool, or just spawn a new
follow-up agent later).

### Vercel cache headers are aggressive
`cache-control: max-age=31536000, immutable` is the default for static assets.
iOS Safari honors this hard. Bust with query strings (`?v=N`) when you need
a fresh fetch.

### TypeScript regen invalidates `as any` workarounds
When the typegen catches up to a remote DB change, remove all the
defensive `as unknown as any` casts that were workarounds for stale types.
Wave 10's typegen agent flagged this for the next agent in the same workflow.

### i18n parity check in CI is strict
Every `npm run i18n:translate` run adds keys to en.json first; if you commit
before re-running on other locales, parity breaks and CI fails. The pattern:
1. Add keys to en.json
2. Run `npm run i18n:translate` (needs LibreTranslate via Docker or MyMemory)
3. Commit all 11 locale files together

OR for small additions, write them manually in all 11 locales at once
(faster for 1-5 keys).

### Workflow tool conflicts
The `Workflow` tool runs multiple agents that can race on shared files. To
avoid: assign each agent a non-overlapping file set in the prompt. If two
agents must touch the same file, sequence them across phases.

### Skill chaining
The `ui-ux-pro-max` and `logo-generator` skills are great for *planning*
mockups but slow for *implementation*. Use them to produce design proposals;
implement via direct Edit/Write tools.

---

## 8 · Key file reference

### Documentation
- `SESSION_LOG_2026-06-17.md` — this file
- `HANDOFF.md` — quick reference for next session
- `WAR_ROOM_LOG.md` — chronological per-wave technical log
- `PLANNING.md` — original product spec
- `README.md` — onboarding
- `DEPLOY.md` — deployment runbook
- `CLAUDE.md` — project-level rules (auto-loaded into Claude Code)

### CI / build
- `.github/workflows/ci.yml` — lint + tsc + test + build + i18n parity
- `vitest.config.ts` — test runner
- `package.json` — `npm run dev / build / lint / test`

### Asset pipelines
- `scripts/build-icons.mjs` — regenerate PWA icons from SVG masters
- `scripts/scrape-kingshotdata-icons.mjs` — pull game icons from kingshotdata.com
- `scripts/i18n/translate.mjs` — fill missing keys via LibreTranslate/MyMemory
- `scripts/i18n/revert-bad-translations.mjs` — undo bad MT output

### Core components
- `src/components/Header.tsx` — fixed top chrome with back/title/bell
- `src/components/BottomNav.tsx` — fixed mobile nav with 5 tabs
- `src/components/AdminBottomNav.tsx` — admin variant with scroll chevrons
- `src/components/ScrollToTop.tsx` — route-change scroll restoration
- `src/components/RequireAuth.tsx` — member-route auth gate
- `src/components/ProtectedAdminRoute.tsx` — admin-route auth gate
- `src/components/I18nText.tsx` — text with overflow protection
- `src/components/NotificationsPanel.tsx` — bell dropdown
- `src/components/PwaInstallModal.tsx` — platform-specific install tutorial

### Hooks
- `src/hooks/useAuth.ts` — single source of truth for auth state
- `src/hooks/useMembers.ts` — live member roster
- `src/hooks/usePolls.ts` + `usePendingPolls` — council motions
- `src/hooks/usePwaInstall.ts` — beforeinstallprompt + platform detect
- `src/hooks/useMyNotifications.ts` — audience-filtered push messages

### Edge functions
- `supabase/functions/send-push/index.ts` — push fan-out worker (verify_jwt=false)
- `supabase/functions/create-account/index.ts` — admin create users
- `supabase/functions/reset-password/index.ts` — admin password reset

### Game icons (scraped this session)
- `public/images/icons/kingshot/{heroes,pets,masters,buildings,events,items,research,war-academy-research,alliance-tech,database}/`
- `public/images/icons/kingshot-manifest.json` — programmatic lookup
- `public/images/icons/timeline.png` — calendar icon for Kingdom Timeline

---

## 9 · Production credentials cheat-sheet

(Already in HANDOFF.md, repeated here for completeness.)

- **GitHub**: github.com/projetosyago/dad-war-room (public, main branch)
- **Vercel**: dashboard at vercel.com/remicaos-projects/dad-war-room
- **Supabase**: project ID `ilogsrlbenhdzkfgexvt`
- **Admin account UUID**: `cc7b697f-2d2b-45af-85e8-922a1b6387e2`
- **Production URL**: https://dad-war-room.vercel.app
- **gh CLI**: authenticated as `projetosyago`
- **Vercel CLI**: authenticated via `vcp_...` token (rotate when convenient)

---

*End of session log. Cross-referenced from `HANDOFF.md` as the wave 9-15 record.
The next session should read this file first if anything is unclear about why
something was done a certain way.*


---

## 10 · Wave 16 — Heroes catalogue redesign + Hero Detail with real upgrade costs

Replaced the Hub's flat "33 heroes catalogued" page with a rarity-grouped
layout (Rare → Epic → Mythic Gen 1-7) and built a full Hero Detail page with
real game data scraped from kingshotdata.com + cost data from kingshotwiki.com.

### Data pipeline
- `scripts/scrape-hero-details.mjs` — pulls all 34 canonical heroes from
  kingshotdata.com via WordPress REST API. Parses HTML for skills, base stats,
  expedition bonuses, exclusive gear, gear skills. 4 parser bugs found and
  fixed in this session:
    1. **Amane** is at slug `mikoto` on kingshotdata — added
       `REMOTE_SLUG_OVERRIDES`. Output JSON keys by canonical slug.
    2. **Tier extraction returned `[]`** — `p.includes('/')` matched
       `</mark>` closing tags. Fix: strip HTML before testing.
    3. **Stats parser returned `atk=6, def=0`** for Gordon — `[^<]*` was
       greedy and consumed digits. Fix: replace `[^<]*` → `\s*`.
    4. **Gear name was "Upgrade Preview"** — fix: scan `<strong>` tags in
       gear section, skip stat-label vocabulary.
- `src/data/heroes-roster.ts` — canonical 34-hero roster (Rare 4 + Epic 8 +
  Mythic Gen 1-7 × 3-4 each)
- `src/data/heroes-data.json` — scraped per-hero data (4476 lines)

### Hero Detail page
- Banner (rarity-tinted card-hero variant: success / violet / crimson)
- Tabs: Conquest / Expedition
- Each tab: base stats + skills with 5-tier upgrade previews
- Mythic only: Exclusive Gear section (name, max stats, bonuses, 2 gear skills)
- Upgrade Costs section with REAL data (this was originally a placeholder):
    - Star Shards (kingshotdata.com/database/hero-shards: ★1=10, ★2=40,
      ★3=115, ★4=300, ★5=600, ★6=TBC, total to ★5 = 1,065 shards)
    - Skill Books (kingshotwiki.com/items: Lv1→2 = 10, Lv2→3 = 30,
      Lv3→4 = 50, Lv4→5 = 75; standardized across rarities)
    - Widget Chests (kingshotdata.com/database/widgets: 10 levels of
      5/10/15/.../50 = 275 widgets to max, mythic only)
  Item icons rendered inline next to quantities (icons scraped from
  kingshotwiki.com S3 mirror).

### Heroes catalogue list
- Page-level eyebrow + h1 centered, no descriptive subtitle (user removed)
- 3 sections: Rare (4) → Epic (8) → Mythic (Gen 1-7 subgrids, 22 heroes)
- Each tile: portrait + name → link to /heroes/{slug}
- Tone accent per rarity: success-green / violet / crimson
- State-driven portrait fallback (no imperative DOM injection)

### Cost calculator
- `src/data/hero-upgrade-costs.ts` — STAR_SHARD_COSTS / SKILL_BOOK_COSTS /
  WIDGET_COSTS tables, item-naming functions (special-case Amadeus/Helga for
  hero-specific shards), summarizeHeroCosts() helper for the KPI tiles.

### i18n
- 57 new keys under `heroes.detail.*` namespace
- PT hand-translated, EN canonical, other 9 locales mirror EN
- Game-data labels (skill books, shards, widgets) intentionally kept in
  English everywhere — community convention is to call them by their in-game
  names regardless of locale

---

## 11 · Wave 17 — 459-icon library + site-wide portrait alignment

Two-part wave: (1) scrape the entire kingshotwiki.com/items catalogue
(186 icons across 13 categories), (2) align the whole site's hero portraits
to the freshly-scraped .webp library.

### Wiki items scrape
- `scripts/scrape-kingshotwiki-items.mjs` — fetches kingshotwiki.com/items
  HTML, splits by tab-pane divs (one per category), per-card extraction of
  img URL + title + slug. Rejects WordPress Yoast placeholder leaks
  (`kingshot_wiki_item_name_NNN_kingshot_end`) so we don't import garbage.
- 13 buckets: basic-resource (2), pet (7), town-skin (9), march-skin (10),
  avatar-frame (43), nameplate (27), teleport-skin (0), teleporter (5),
  buff (2), truegold (4), chest (66), hero (10), master (1)
- 186 PNGs, ~600KB total, manifest at
  `public/images/icons/kingshotwiki-manifest.json`

### Icon library refactor
- `src/data/icon-library.ts` — single source of truth for the IconPicker.
  Loads both manifests dynamically (`kingshot-manifest.json` from earlier
  in the session + `kingshotwiki-manifest.json` from this wave) so re-running
  either scraper auto-rebuilds the picker library.
- Removed the hand-coded `WIKI_SHARDS` / `WIKI_SKILL_BOOKS` / `WIKI_WIDGETS`
  / `WIKI_MISC` groups — they were redundant once the full scrape landed.
- IconPicker rewritten with search input, group filter pills (count badges),
  expand/collapse per group, current-selection preview by human-readable
  label.
- Total library: ~459 icons across 30+ groups.

### Hero Detail Upgrade Costs migrated to canonical paths
- `hero-upgrade-costs.ts` icon helpers now resolve to
  `/images/icons/kingshotwiki/hero/{slug}.png` (skill books / shards / Hero
  XP) and `/images/icons/kingshotwiki/chest/gen-{N}-custom-hero-widget-chest.png`
  (Gen 2-6 specific; non-mythic = generic chest; Gen 7 falls back to Gen 6).
- Deleted the redundant `/images/icons/kingshotwiki/items/` folder
  (15 files I hand-curated during Wave 16; same content now lives under the
  canonical `/hero/` and `/chest/` buckets).

### Site-wide portrait alignment
- `src/lib/heroAvatar.ts`:
    - HERO_SLUGS now derives from the canonical `ROSTER_INDEX` (34 heroes,
      not 33), removing the legacy `jaegar` typo (correct: `jaeger`).
    - `heroAvatarUrlFor`, `heroAvatarUrlForSlug`, new `heroPortraitPath`
      helper all return scraped `.webp` paths.
- 4 consumers updated to use `/images/icons/kingshot/heroes/{slug}.webp`:
    - `MemberCard.tsx` — fallback avatar
    - `MemberDetail.tsx` — Howard placeholder
    - `GameCatalogueCard.tsx` — Petra tile on Hub
    - `events.ts` — `heroImage(id)` helper + jaegar→jaeger fix in HEROES list
- Legacy `/public/images/heroes/*.png` files stay on disk so any avatar URL
  stored in the DB pointing at them keeps resolving — backward-compat without
  forcing a DB migration.

### Timeline Gen N portrait stack
- `milestoneIcon.ts` resolver detects `"Gen N"` / `"Generation N"` (Arabic
  or Roman numerals 1-7) and returns the entire generation's roster as a
  `heroes: HeroPortrait[]` array. Single-hero milestones still return a
  single portrait. Caller renders the appropriate visual.
- `KingdomTimelineCard.tsx` — new `<HeroStack>` component that renders
  overlapping circular portraits (max 4) with crimson rings when the
  resolver returns multiple heroes. Single-icon milestones keep the original
  framed-icon look.

### i18n
- 13 new wiki bucket keys + earlier IconPicker enhancements
- Parity: 1208 leaf keys across 11 locales

### Build
- 1080 PWA precache entries (~26 MB) — large because we ship 459 icons
- tsc -b clean, lint 0 errors

### What stayed legacy (intentionally)
- Truegold tier icons `/images/tiers/tg{N}.png` — wiki has 4 generic
  truegold variants (Truegold / Dust / Lesser / Tempered) but no tier-
  specific art. Keep legacy.
- Building icons `/images/buildings/*.png` — wiki only has skins
  (decorative town skins, not the buildings themselves). Keep legacy.
- Event icons `/images/events/*.png` — kingshotdata.com scraped 32 event
  icons under `kingshot/events/`. Both visible in IconPicker for now —
  follow-up could swap NextEventCard fallback if desired.
