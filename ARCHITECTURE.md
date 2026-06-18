# DAD War Room — Architecture

> Generated 2026-06-18. System architecture for engineers onboarding the project.
> Production: https://dad-war-room.vercel.app

---

## Stack overview

Versions come straight from `package.json`. Where two majors disagree with the brief, the manifest wins.

| Layer            | Tech                         | Version    | Role                                                        |
| ---------------- | ---------------------------- | ---------- | ----------------------------------------------------------- |
| Frontend         | React                        | 19.2.6     | UI runtime (StrictMode + BrowserRouter)                     |
| Build            | Vite                         | 8.0.12     | Bundler, dev server, manual chunk splitter                  |
| Lang             | TypeScript                   | 6.0.2      | Project references (`tsconfig.app.json` + `tsconfig.node.json`) |
| Styles           | Tailwind CSS                 | 3.4.17     | Utility CSS + design tokens (Inkwell Vault palette)         |
| Router           | react-router-dom             | 7.17.0     | SPA routing, lazy admin chunks                              |
| Backend          | Supabase (Postgres + Auth + Storage + Edge Functions) | @supabase/supabase-js 2.108 | DB, RLS, auth, storage, serverless functions |
| Edge runtime     | Deno (Supabase Edge Functions) | n/a      | `create-account`, `reset-password`, `send-push`             |
| Realtime / cron  | pg_cron + pg_net             | n/a        | `send-push-every-minute` → Edge Function                    |
| Push             | Web Push (VAPID)             | n/a        | Service-worker push handler in `public/sw-push.js`          |
| PWA              | vite-plugin-pwa + workbox-window | 1.3.0 / 7.4.1 | Manifest, precache, runtime caching, SW update prompt |
| i18n             | i18next + react-i18next      | 26.3.1 / 17.0.8 | 11 locales × 1208 leaf keys, browser lang detect       |
| Forms            | react-hook-form + @hookform/resolvers | 7.79 / 5.4 | Form state + Zod-style validation hooks            |
| Rich text        | Tiptap                       | 3.26.1     | Admin milestone editor (with sanitize on output)            |
| Sanitization     | DOMPurify                    | 3.4.10     | Strip XSS from admin-authored HTML before render            |
| Icons            | @phosphor-icons/react        | 2.1.10     | UI icon set                                                 |
| Motion           | framer-motion                | 12.40.0    | Card transitions, accordion expansions                      |
| Dates            | date-fns                     | 4.4.0      | Countdown utilities, event scheduling                       |
| Class merging    | clsx + tailwind-merge        | 2.1.1 / 3.6 | `cn()` utility for variant composition                     |
| Image processing | sharp                        | 0.35.1     | Icon sprite generation (build-time only)                    |
| Testing          | Vitest + Testing Library + jsdom | 4.1.9 / 16.3 / 29.1 | Smoke tests + dom matchers                       |
| Lint             | ESLint 10 + typescript-eslint 8 | n/a     | CI gate on every PR                                         |
| Deploy           | Vercel                       | 54.14 (CLI) | SPA + edge headers (see `vercel.json`)                     |

---

## High-level system diagram

```
                                ┌──────────────────────────────────────────┐
                                │              User device                 │
                                │  (iPhone Safari PWA / desktop browser)   │
                                └──────────────┬───────────────────────────┘
                                               │  HTTPS
                                               ▼
                          ┌────────────────────────────────────────┐
                          │             Vercel (CDN + SPA)         │
                          │  /index.html  /assets/*  /icons/*      │
                          │  Service Worker (workbox) + sw-push.js │
                          │  Cache headers from vercel.json        │
                          └──────────┬─────────────────────┬───────┘
                                     │ REST/RPC (HTTPS)    │ Web Push (HTTPS)
                                     ▼                     ▲
        ┌────────────────────────────────────────┐         │
        │              Supabase project          │         │
        │  ┌──────────────────────────────────┐  │         │
        │  │ Postgres (public + private schema)│  │         │
        │  │   • RLS on every table            │  │         │
        │  │   • SECURITY DEFINER fns in       │  │         │
        │  │     `private.` schema             │  │         │
        │  │   • 34 migrations applied         │  │         │
        │  └──────────────┬───────────────────┘  │         │
        │                 │                      │         │
        │  ┌──────────────▼────────┐  ┌────────┐ │         │
        │  │       pg_cron         │  │  Auth  │ │         │
        │  │ send-push-every-min   │  │ (JWT)  │ │         │
        │  └──────────────┬────────┘  └────────┘ │         │
        │                 │ pg_net.http_post                │         │
        │                 ▼                                 │         │
        │  ┌────────────────────────────────────────────┐   │         │
        │  │            Edge Functions (Deno)           │   │         │
        │  │  • create-account   (admin-only, JWT-gated)│   │         │
        │  │  • reset-password   (admin-only, JWT-gated)│   │         │
        │  │  • send-push        (verify_jwt:false,     │───┼─────────┘
        │  │      auths via SUPABASE_SERVICE_ROLE_KEY)  │   │ POST to
        │  └────────────────────────────────────────────┘   │ FCM / Apple
        │                                                   │ Push (VAPID)
        │  ┌────────────────────────────────────────────┐   │
        │  │            Storage buckets                 │   │
        │  │  • member avatars  • milestone images      │   │
        │  └────────────────────────────────────────────┘   │
        └───────────────────────────────────────────────────┘
```

---

## Folder structure (commented tree)

```
dad-guides/
├── public/                          — Static assets served as-is by Vercel
│    ├── icons/                      — PWA + game-catalogue icons (459 files, cache-busted via ?v=N)
│    ├── images/                     — Hero portraits, alliance crests, login art
│    ├── videos/                     — Login background loops
│    ├── sw-push.js                  — Web Push handler imported into the Workbox SW
│    ├── favicon.svg / favicon-maskable.svg / mask-icon.svg — Multi-size brand marks
│    └── _redirects                  — SPA fallback for non-Vercel hosts
│
├── src/
│   ├── components/                  — Shared UI primitives + chrome (37 files total)
│   │    ├── ui/                     — Cross-cutting primitives (AllyChip, BorderBeam, ImageUploadField, OrnamentDivider, Sparkles, ImageWithFallback)
│   │    ├── layout-level (root)/    — Header, BottomNav, AdminBottomNav, Footer, RequireAuth, ProtectedAdminRoute, ScrollToTop, PwaInstallModal
│   │    ├── dashboard/              — Hub cards (UserHeroCard, NextEventCard, GameCatalogueCard, AllEventsCard, PendingPollsCard, KingdomTimelineCard, UpcomingEventsSlider)
│   │    ├── admin/                  — Admin-only widgets (IconPicker, RichTextEditor)
│   │    ├── login/                  — Login-page composition
│   │    ├── settings/               — Settings-page panels
│   │    ├── charts/                 — Analytics chart components
│   │    └── icons/                  — Custom SVG icons (DadCrest, etc.)
│   │
│   ├── pages/                       — Route entry points (34 files)
│   │    ├── public routes (root)/   — Hub, Events, Members, MemberDetail, Alliance, Heroes, HeroDetail, Pets, Masters, TroopTiers, Polls, PollDetail, PollByToken, MilestoneDetail, Chat, Settings, Login, Bear1Guide
│   │    └── admin/                  — 16 admin pages, all lazy-loaded via React.lazy in App.tsx
│   │
│   ├── hooks/                       — Custom React hooks (19 files)
│   │    ├── useAuth.ts              — Single source of truth for auth state (session + member_account row + role flags)
│   │    ├── useMembers.ts           — Live members roster
│   │    ├── useEvents.ts / useEventParticipants.ts — Event + RSVP state
│   │    ├── useHeroes.ts / usePets.ts / useMasters.ts / useTroopTiers.ts — Game catalogue domain hooks
│   │    ├── useMilestones.ts        — Kingdom timeline state
│   │    ├── usePolls.ts             — Voting council state
│   │    ├── useNotifications.ts / useMyNotifications.ts — In-app notifications
│   │    ├── usePushSubscription.ts  — Web Push subscribe/unsubscribe flow
│   │    ├── usePwaInstall.ts        — Install-prompt detection
│   │    ├── useCountdown.ts         — Time-to-event ticker
│   │    └── useOccurrences.ts / useAccounts.ts / useMemberDetail.ts / useAllianceSettings.ts
│   │
│   ├── repositories/                — Data-access layer (20 files)
│   │    Each file: thin wrapper around `supabase.*` calls for ONE domain.
│   │    Hooks call repositories; components never touch supabase directly.
│   │    accounts, allianceSettings, analytics, auth, eventParticipants, events,
│   │    heroes, loginEvents, mappers, masters, memberSnapshots, members,
│   │    milestones, notifications, occurrences, pets, polls, pushSubscriptions,
│   │    storage, troopTiers
│   │
│   ├── lib/                         — Cross-cutting utilities (9 files)
│   │    ├── supabase.ts             — Single shared supabase-js client (typed)
│   │    ├── cn.ts                   — clsx + tailwind-merge variant helper
│   │    ├── sanitize.ts             — DOMPurify wrapper (admin HTML → safe DOM)
│   │    ├── markdown.ts             — Limited markdown → HTML for poll/event bodies
│   │    ├── push.ts                 — VAPID public-key + subscribe helpers
│   │    ├── memberAdapter.ts        — DB row → domain Member normalization
│   │    ├── heroAvatar.ts / milestoneIcon.ts — Static asset URL builders
│   │    └── __tests__/markdown.test.ts
│   │
│   ├── data/                        — Static catalogues (checked in, not DB)
│   │    ├── heroes-data.json / heroes-roster.ts — Hero metadata (gear, skills)
│   │    ├── hero-upgrade-costs.ts   — Resource cost tables
│   │    ├── icon-library.ts         — Scraped game-icon registry
│   │    ├── events.ts               — Event templates
│   │    └── roster.ts               — Static fallback roster
│   │
│   ├── locales/                     — i18n JSON (11 files × 1658 lines / ≈1208 leaf keys)
│   │    ar.json, de.json, en.json, es.json, fr.json, ja.json, ko.json,
│   │    pt.json, ru.json, tr.json, zh.json
│   │
│   ├── contexts/
│   │    └── AdminModeContext.tsx    — Admin-mode toggle (gated, opt-in)
│   │
│   ├── types/
│   │    ├── domain.ts               — Hand-written domain types (AccountRole, AuthState…)
│   │    ├── index.ts                — Barrel re-export
│   │    └── database/supabase.ts    — Supabase-generated types (regen from DB)
│   │
│   ├── i18n.ts                      — i18next bootstrap + browser language detector
│   ├── App.tsx                      — Routing tree (public + lazy admin) + chrome
│   ├── main.tsx                     — Entry: StrictMode + BrowserRouter + AdminModeProvider
│   └── index.css                    — Tailwind layers + design tokens
│
├── supabase/
│   ├── migrations/                  — 34 SQL files (auto + hand-authored), in git
│   └── functions/
│       ├── create-account/          — Deno: admin-only account creation
│       ├── reset-password/          — Deno: admin-only password reset
│       └── send-push/               — Deno: pg_cron-driven push fan-out
│
├── scripts/
│   └── i18n/translate.mjs           — Auto-translate pipeline (LibreTranslate + don't-translate rules)
│
├── data/                            — Repo-root data exports (out-of-band, not bundled)
│
├── tests/                           — (Vitest discovers via vitest.config.ts; smoke tests live next to code in src/**/__tests__/)
│
├── vite.config.ts                   — PWA manifest, Workbox glob, manualChunks split (tiptap/supabase/framer/date-fns)
├── tailwind.config.js               — Inkwell Vault palette, font families, keyframes, shadows
├── tsconfig.json                    — Project references → app + node
├── vercel.json                      — SPA rewrites, immutable headers on /assets, /icons; no-store on /sw*.js
├── package.json                     — Versions of record (see Stack overview)
├── design-system.md                 — Locked palette + card variants
├── PLANNING.md / WAR_ROOM_LOG.md / SESSION_LOG_2026-06-17.md / HANDOFF.md — Session ledger
└── DEPLOY.md / README.md            — Operator docs
```

File counts (`find … | wc -l`): 37 components, 34 pages, 19 hooks, 20 repositories, 9 lib files, 11 locale files, 34 migrations.

---

## Key architectural decisions

For each decision: WHY, sourced to the project log where one exists. If there's no documented rationale and no obvious code signal, the entry says "no documented rationale" instead of inventing one.

### Supabase as the only backend
No custom Node/Go server. Postgres + RLS + Auth + Storage + Edge Functions cover every server-side need (auth, push, account provisioning, file storage). One vendor, one set of credentials, one deploy story. WAR_ROOM_LOG §1.1.

### RLS-first authorization (no middleware)
Every table has Row Level Security policies. Admin actions that need to bypass RLS use `SECURITY DEFINER` Postgres functions, isolated in a non-public schema (`private.`) so they're not callable from PostgREST directly. WAR_ROOM_LOG §1.1, Lesson 1.

### Repository layer between hooks and supabase
`components → hooks → repositories/*.ts → supabase`. Components never import `supabase` directly. Twenty repos, one per domain (`members.ts`, `events.ts`, `polls.ts`, …). Lets us change query shape, switch to RPCs, or add caching without touching the React tree.

### 11 locales × 1208 keys, parity-gated in CI
i18next with browser language detection, 11 JSON locale files, CI fails on missing keys. Browser auto-translate is hard-blocked (`<html translate="no">`, `<meta name="google" content="notranslate">`, `translate="no"` on brand spans) because it mangled "DAD BIGDADDYS" → "PAPAI GRANDÃOS" in Wave 14. SESSION_LOG §2 Wave 9 + Wave 14.

### `card-hero` design system (CSS variables + variants)
All cards extend a shared `.card-hero` token set (palette, ornament dividers, gold border beams). Hub uses palette rotation so adjacent cards never share their fill. Locked in `design-system.md §1` and WAR_ROOM_LOG §1.3-§1.4.

### Static data files vs DB (heroes, costs, icons)
Hero roster, gear/skill upgrade costs, and the scraped icon library live in `src/data/*.{ts,json}` rather than Postgres. Rationale: this data is read-only catalogue content tied to game-version releases — versioning it in git gives us code-review, rollback, and offline-cache for free, with zero RLS surface. The members roster, events, polls, and milestones DO live in the DB because they're user-authored. (WAR_ROOM_LOG §2.14 describes the catalogue work; the static-vs-DB split itself isn't separately argued in the logs but is visible in the file layout.)

### Scraping pipeline for game icons
Pulled 243 game icons from kingshotdata.com via its WordPress REST API (`?_embed=wp:featuredmedia`), 459 files total across the public icon set. SESSION_LOG §2 "Icon scraper".

### PWA-standalone-first chrome
Header and bottom nav use `position: fixed` + sibling spacer divs — NOT `position: sticky`. Sticky inside a flex column silently loses its scroll anchor in iOS PWA standalone mode. The `<HeaderSpacer />` and `<BottomNavSpacer />` components reserve vertical space. SESSION_LOG §2 Wave 14, WAR_ROOM_LOG Lesson 12.

### Lazy admin chunks
All 16 `pages/admin/*` routes are loaded with `React.lazy()` so the public bundle never pays the admin cost. See `src/App.tsx` top.

### Manual Vite chunk split
`vite.config.ts` splits `@tiptap/*`, `@supabase/supabase-js`, `framer-motion`, and `date-fns` into named shared chunks so the editor stack stays cacheable across deploys. WAR_ROOM_LOG §2.14, Lesson 14.

### `useAuth` as single auth source of truth
One hook reads the Supabase session AND joins to `member_accounts` for role + display name + language. All admin/voting/ally booleans derive from `account.role` so consumers never switch on the enum. `src/hooks/useAuth.ts`.

### React Context only for "admin mode" toggle
The single context (`AdminModeContext`) gates whether admin UI is visible; everything else is local `useState` + hook-driven reads. No Redux, no Zustand.

---

## Data flow patterns

### Read flow
```
Component
  └─ useFoo()              (src/hooks/useFoo.ts)
       └─ foosRepo.list()  (src/repositories/foos.ts)
            └─ supabase.from('foos').select(...)
                 └─ Postgres + RLS evaluates against JWT
```

### Write flow
```
Component (submit)
  └─ useFoo().create(payload)
       └─ foosRepo.create(payload)
            └─ supabase.from('foos').insert(...)
                 └─ RLS check → row inserted → trigger touch_updated_at()
       └─ refetch() OR optimistic local state update
```

### Auth flow
```
Login page
  └─ useAuth().signIn(usernameOrEmail, password)
       └─ repositories/auth.ts: maps bare username → synthetic email
            └─ supabase.auth.signInWithPassword
                 └─ supabase emits onAuthStateChange (SIGNED_IN)
                      └─ useAuth listener re-fetches member_accounts row
                           └─ state.{user, account, role, isAdmin, …} populated
  └─ recordLoginEvent() (audit trail)
  └─ RequireAuth lets the originally-requested URL render
```

### Push flow
```
pg_cron (every minute)
  └─ pg_net.http_post → send-push Edge Function (verify_jwt:false)
       └─ reads pending notifications + active push_subscriptions
            └─ POST to each subscription endpoint with VAPID auth
                 └─ Browser SW (public/sw-push.js) receives push event
                      └─ self.registration.showNotification(...)
                           └─ notificationclick → focus/open window
```

### PWA update flow
```
vite-plugin-pwa generates sw.js + manifest at build
  └─ Browser registers SW on first load
       └─ Workbox precaches everything matching globPatterns
            └─ On next visit: SW updates in background (registerType:'autoUpdate')
                 └─ workbox-window in app shell prompts user to reload (where wired)
```

---

## Build & deploy

### Local
```bash
npm install --legacy-peer-deps          # React 19 peer-dep conflicts otherwise
cp .env.example .env.local              # add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev                             # vite dev server
```

### Build
```bash
npm run build         # tsc -b (project references) + vite build
npm run preview       # serve dist/
npm test              # vitest run (13 smoke tests, 2 suites)
npm run lint          # eslint .
```

### CI
`.github/workflows/ci.yml` runs lint + `tsc -b` + tests + build + i18n parity check on every push.

### Deploy
- `main` → push → GitHub Actions CI → Vercel auto-deploys (`vercel.json` controls headers + SPA rewrite).
- Edge Functions deploy separately via Supabase Dashboard or `supabase functions deploy <name> --project-ref <ref>`.
- Migrations apply via Supabase Dashboard SQL editor or `supabase db push`; 34 are in git as of 2026-06-17.

### Production URL
https://dad-war-room.vercel.app

---

## Performance & PWA

- **Service Worker**: `vite-plugin-pwa` autoUpdate mode + custom `public/sw-push.js` imported via Workbox `importScripts`.
- **Precache**: ≈1080 entries (~26 MB) — large because the bundle includes 459 game icons. Reported in SESSION_LOG §2 Wave 14. The earlier 191-entry figure in the project-status snapshot is from before the icon scrape; both are documented.
- **Manual chunks**: `tiptap`, `supabase`, `framer`, `date-fns` split out so the editor stack stays cacheable.
- **Main bundle**: 344 KB gzip (`dist/assets/index.*.js`).
- **Runtime caching**: Google Fonts cached `CacheFirst` for 1 year.
- **iOS PWA**: `position: fixed` chrome, safe-area-additive spacer (`calc(64px + max(0.5rem, env(safe-area-inset-bottom)))`), cache-busted icon URLs (`?v=2`) to defeat Vercel's `max-age=31536000, immutable` on `/icons/*`.

---

## Security

- **RLS on every table.** Default-deny. Read/write policies are explicit per role.
- **`private.` schema for SECURITY DEFINER helpers.** Not exposed via PostgREST. `GRANT USAGE ON SCHEMA private TO authenticated` is required or the helpers return 403 with no log. WAR_ROOM_LOG Lesson 1.
- **DOMPurify on every admin-authored HTML render** (milestone bodies, poll bodies) via `src/lib/sanitize.ts`.
- **VAPID keys**: public key in `src/lib/push.ts`, private key in Supabase Edge Function Secrets, never in the bundle.
- **No service-role key in the frontend.** Only `VITE_SUPABASE_ANON_KEY` ships to the browser. Edge Functions hold the service role.
- **Edge Function auth**: `create-account` and `reset-password` verify the caller's JWT and check `role IN (r4, r5)` before doing anything. `send-push` runs `verify_jwt:false` because pg_cron can't sign a JWT — it authenticates internally with `SUPABASE_SERVICE_ROLE_KEY`. SESSION_LOG §2 Wave 11.
- **Response headers** (`vercel.json`): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denies camera/mic/geolocation.
- **PII redaction**: edge functions log push subscription endpoints by hash, not full URL (where applicable).

---

## Testing

- **Vitest 4 + jsdom 29 + @testing-library/react 16 + jest-dom matchers.**
- Configuration: `vitest.config.ts`, setup file `vitest.setup.ts`.
- Current coverage: 13 smoke tests across 2 suites (`src/lib/__tests__/markdown.test.ts`, `src/data/__tests__/roster.test.ts`). SESSION_LOG §1 + WAR_ROOM_LOG.
- CI gate: `npm run lint && tsc -b && npm test && npm run build`, plus a separate i18n parity check that fails on missing keys across the 11 locales.

---

## Constraints / Gotchas (from prior-session pain)

Every entry references where the pain was felt.

- **iOS PWA standalone breaks `position: sticky`.** Header had to move from `sticky top-0` to `fixed top-0 inset-x-0` with a sibling `<HeaderSpacer />`. Sticky inside a flex column loses its scroll anchor only in standalone mode — works fine in regular Safari, so the bug is silent until someone installs the PWA. (SESSION_LOG §2 Wave 14 "header positioning", WAR_ROOM_LOG §5 Lesson 12.)

- **Vercel caches `/icons/*` for a year (immutable).** iOS Safari refused to refresh the home-screen icon until the URL changed. Workaround: append `?v=N` to icon refs and bump `N` whenever the bitmap changes. (SESSION_LOG §3 "Cache-bust icon URLs", WAR_ROOM_LOG §5 Lesson 13.)

- **`BottomNavSpacer` ate the safe-area inset under border-box.** Original `minHeight: 72px` rendered the `env(safe-area-inset-bottom)` *inside* the 72 px box. Fix: additive — `calc(64px + max(0.5rem, env(safe-area-inset-bottom)))`. (SESSION_LOG §2 Wave 11.)

- **pg_cron returned 401 every minute.** `current_setting('app.settings.service_role_key', true)` resolved to NULL in this project. Fix: redeploy `send-push` with `verify_jwt:false` and let it auth internally with `SUPABASE_SERVICE_ROLE_KEY`. (SESSION_LOG §4 "pg_cron sending 401 every minute".)

- **`npm install` fails without `--legacy-peer-deps`.** React 19 has peer-dep conflicts with several deps; the install command is also pinned with the flag in Vercel's `installCommand`. (SESSION_LOG §4 "npm install sharp" + §3 "Vercel deployment".)

- **Browser auto-translate mangled brand names.** Chrome rewrote "DAD BIGDADDYS" → "PAPAI GRANDÃOS". Hard-blocked via `<html translate="no">`, `<meta name="google" content="notranslate">`, and `translate="no"` on brand spans in `Header.tsx` and `Alliance.tsx`. (SESSION_LOG §2 Wave 14, §4 "Browser auto-translate".)

- **SECURITY DEFINER functions in `private.` schema 403 silently.** `GRANT USAGE ON SCHEMA private TO authenticated` is the missing piece — function EXECUTE is not enough. (WAR_ROOM_LOG §3 Lesson 1.)

- **Vite `optimizeDeps.include` must list freshly-installed packages.** Otherwise sub-packages aren't picked up without `rm -rf node_modules/.vite`. All Tiptap extensions are explicitly listed. (WAR_ROOM_LOG §3 Lesson 2, `vite.config.ts`.)

- **`rolldown-vite` `manualChunks` typings only accept the function form.** The legacy object form fails type-check. (WAR_ROOM_LOG §3 Lesson 14.)

- **`tsc --noEmit` ≠ `tsc -b`.** Verifier agents must run the build-mode command to match CI. (WAR_ROOM_LOG §3 Lesson 13.)

- **`ROSTER` hardcoded in `Alliance.tsx` while `Members` uses live DB** — caught in audit Wave 10, called out as a P0 inconsistency to reconcile. (SESSION_LOG §4 "ROSTER hardcoded".)

- **Vercel Auth was blocking OG image scrapers.** Preview deployments couldn't be scraped by Discord/Twitter. (SESSION_LOG §4 "Vercel Auth blocking OG image scrapers".)

- **`FOR ALL` write policy implicitly grants SELECT.** Overlaps with the public read policy. Audit at Wave 10 surface. (WAR_ROOM_LOG §3 Lesson 11.)

- **A SECURITY DEFINER RPC bypasses RLS but NOT NOT NULL constraints.** Forgetting to populate every required column still fails. (WAR_ROOM_LOG §3 Lesson 12.)

---

## What's NOT in the architecture (by choice)

- **No separate backend server.** Supabase covers DB + Auth + Storage + Edge Functions.
- **No Redux / Zustand / Jotai for cross-cutting state.** `useState` inside hooks + `supabase.auth.onAuthStateChange` re-hydration is enough. A single `AdminModeContext` exists for the admin-UI toggle.
- **No SSR.** SPA in PWA mode; Vercel serves `index.html` for all non-asset routes (see `vercel.json` rewrite).
- **No GraphQL.** REST via supabase-js (`from(...).select(...)`) and RPCs for transactional writes.
- **No Storybook.** Per Wave 23 design-sync detection; design tokens live in `tailwind.config.js` + `design-system.md` instead.
- **No e2e tests yet.** Playwright config exists as a `.template` only (`playwright.config.ts.template`).
