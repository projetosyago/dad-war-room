# DAD War Room — API & Integrations

> Generated 2026-06-18. Captures every outbound integration + Edge Function
> the PWA touches, sourced from the live codebase (`src/`, `supabase/functions/`,
> `scripts/`, `vite.config.ts`, `public/sw-push.js`).

---

## Integration inventory

| Integration | Purpose | Auth | Status |
|---|---|---|---|
| Supabase Postgres + Auth | Primary backend (data, RLS, sessions) | anon JWT + RLS | ✅ Operational |
| Supabase Storage (`avatars`) | Per-user profile pictures | RLS (own folder) | ✅ Operational |
| Supabase Storage (`notification-images`) | Admin push/notification card images | RLS (authenticated) | ✅ Operational |
| Supabase Storage (`milestone-bodies`) | Admin milestone rich-text images / icons | RLS (authenticated) | ✅ Operational |
| Edge Function `create-account` | Admin-only auth.users + member_accounts creation | Bearer JWT (caller r4/r5) | ✅ Operational (v6) |
| Edge Function `reset-password` | Admin-only password reset | Bearer JWT (caller r4/r5) | ✅ Operational (v6) |
| Edge Function `send-push` | Web Push fan-out (cron + admin "send now") | `verify_jwt: false` (internal checks) | 🔧 Recently fixed (v6 — CORS + pg_cron) |
| pg_cron `send-push-every-minute` | Schedules `send-push` once a minute | Service-role bearer in cron body | ✅ Operational (returning 200) |
| Web Push (browser → push services) | Lock-screen notifications via VAPID | VAPID keypair (server-signed) | ✅ Operational |
| Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) | UI typography | Public | ✅ Cached by Workbox `CacheFirst` |
| MyMemory / LibreTranslate (translation API) | Build-time i18n fill-in for `src/locales/*.json` | Optional email / API key | ✅ Operational (script only, not runtime) |
| Scraper: kingshotdata.com WP REST | Build-time hero/icon assets | None (public) | ✅ Idempotent, manual |
| Scraper: kingshotwiki.com items index | Build-time item icon assets | None (public) | ✅ Idempotent, manual |

---

## Supabase

- **Project ref**: `ilogsrlbenhdzkfgexvt`
- **Project URL**: `https://ilogsrlbenhdzkfgexvt.supabase.co` (from `.env.example` / `DEPLOY.md`)
- **Client setup**: `src/lib/supabase.ts`
  - Single `createClient<Database>()` instance, exported as `supabase`.
  - Auth options: `persistSession: true`, `autoRefreshToken: true`,
    `detectSessionInUrl: true`, custom `storageKey: 'dad-war-room.auth'`.
  - Global header `x-application-name: dad-war-room` on every request — this
    header is whitelisted in every Edge Function's CORS allowlist.
  - Hard-fails at boot with `console.error` if `VITE_SUPABASE_URL` /
    `VITE_SUPABASE_ANON_KEY` are missing.
- **Auth model**:
  - Synthetic emails: `username` → `username@dad-war-room.local`
    (`src/repositories/auth.ts` — `usernameToEmail`, `SYNTHETIC_EMAIL_DOMAIN`).
  - `signInWithUsername()` → `supabase.auth.signInWithPassword`.
  - Source-of-truth row lives in `public.member_accounts` (joined by `auth.uid()`).
  - `useAuth` hook (`src/hooks/useAuth.ts`) wraps session + member_accounts row,
    derives role flags (`isAdmin = r4|r5`, `isVotingMember`, `isAlly`).
  - Login telemetry: `recordLoginEvent` RPC (SECURITY DEFINER) writes to
    `login_events` and stamps `member_accounts.last_login_at`.
- **Realtime**: none. No `.channel(` calls anywhere in `src/`. All data is
  fetched on-demand by hooks; live polling/refresh is hook-local.
- **Storage**: three public buckets, all writes funneled through
  `src/repositories/storage.ts` (`uploadImage` + `getBucketConfig`):
  - `avatars` — 2 MB, jpeg/png/webp/gif, RLS gates writes to `auth.uid()` folder.
  - `notification-images` — 5 MB, jpeg/png/webp, authenticated users only.
  - `milestone-bodies` — 5 MB, jpeg/png/webp/gif, authenticated users only.
  - The only call site for `.storage.from(` is `storage.ts:129`
    (`getPublicUrl`). Uploads use the same module's `.upload()` path.

---

## Edge Functions (`supabase/functions/`)

All three live in `supabase/functions/<name>/index.ts`. All ship with the
same CORS allowlist (`authorization, x-client-info, apikey, content-type,
x-application-name`).

### `create-account` (v6)

- **Path**: `supabase/functions/create-account/index.ts`
- **Trigger**: HTTP POST (browser only).
- **Auth**: `verify_jwt: true` (implicit). Validates caller JWT via
  `userClient.auth.getUser()`, then re-reads `member_accounts.role` and rejects
  anything other than `r4` / `r5`. Additionally enforces "only r5 can create r5".
- **Called by**: `src/repositories/accounts.ts:108` — `createAccount()` →
  `supabase.functions.invoke('create-account', { body })`.
- **Inputs**: `{ username, password, role, displayName?, languageCode? }`.
  - Username regex: `/^[a-z0-9._-]{2,32}$/`.
  - Password ≥ 6 chars.
  - Role ∈ `ally | member | r2 | r3 | r4 | r5`.
- **Outputs**: `201 { account }` on success; `4xx { error }` otherwise.
  Rolls back the auth user on `member_accounts` insert failure.
- **Env vars**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
- **External calls**: none beyond Supabase Auth Admin + Postgres.
- **PII redaction**: logs use `redact()` helper before writing email/username.
- **Status**: ✅ Operational.

### `reset-password` (v6)

- **Path**: `supabase/functions/reset-password/index.ts`
- **Trigger**: HTTP POST (browser only).
- **Auth**: `verify_jwt: true`. Same r4/r5 gate as `create-account`.
- **Called by**: `src/repositories/accounts.ts:133` — `resetPassword()` →
  `supabase.functions.invoke('reset-password', { body })`.
- **Inputs**: `{ accountId, newPassword }` (password ≥ 6 chars).
- **Outputs**: `{ ok: true }` or `4xx { error }`.
- **Env vars**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
- **External calls**: `auth.admin.updateUserById()` only.
- **Status**: ✅ Operational. Salles 2026-06-14 dropped the
  `password_temporary` force-change flag.

### `send-push` (v6, `verify_jwt: false`)

- **Path**: `supabase/functions/send-push/index.ts`
- **Trigger**:
  1. **pg_cron** — invoked every minute by `send-push-every-minute` (see below).
     No body → "sweep mode": picks up all rows where `sent_at IS NULL AND
     scheduled_for <= now() AND cancelled = false`, ordered by `scheduled_for`,
     limit 50.
  2. **HTTP POST** — admin "send now" flow from
     `src/repositories/notifications.ts:176` → `sendPushImmediately(messageId)`
     calls `supabase.functions.invoke('send-push', { body: { message_id } })`.
     Body `{ message_id }` forces processing of that single row regardless of
     `scheduled_for`.
- **Auth**: `verify_jwt: false` — pg_cron couldn't pass a user JWT, so
  authentication is enforced internally by using the
  `SUPABASE_SERVICE_ROLE_KEY` server-side. Browsers can still call it (CORS
  whitelisted) but they can only ask to process a `message_id` that already
  passed RLS at insert time.
- **Called by**: `src/repositories/notifications.ts:176`.
- **Called via cron**: pg_cron job `send-push-every-minute`, schedule
  `* * * * *`. The cron body is a `select net.http_post(...)` against
  `https://ilogsrlbenhdzkfgexvt.supabase.co/functions/v1/send-push` with
  `Authorization: Bearer ' || current_setting('app.settings.service_role_key', true)`
  and `body := '{}'::jsonb`. See `DEPLOY.md` §1.3. SESSION_LOG_2026-06-17
  records the cron is "active, returning 200" after the v6 redeploy.
- **Inputs**: `{ message_id?: string }` (optional, JSON body).
- **Outputs**: `{ processed, delivered, failed, errors }`.
- **Env vars**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (default
  `mailto:admin@dad-war-room.local`).
- **External calls**:
  - `npm:web-push@3.6.7` — `webpush.sendNotification(...)` against each
    `push_subscriptions` row's endpoint, payload TTL 24h.
  - `npm:@supabase/supabase-js@2.45.0` — Postgres reads/writes.
- **Audience expansion** (`audienceRoles()`):
  - `all` → no role filter.
  - `voting` → `member, r2, r3, r4, r5`.
  - `admins` → `r4, r5`.
  - `allies` → `ally`.
  - `custom` → `push_messages.custom_account_ids` array.
- **Per-invocation budget**: 500 deliveries max
  (`MAX_DELIVERIES_PER_INVOCATION`).
- **Subscription cleanup**: on `404`/`410` from the push service, the row in
  `push_subscriptions` is flipped to `active: false`.
- **Bookkeeping**: every send appends to `push_message_deliveries`
  (`delivered_at` or `error`). Processed messages get `sent_at = now()` so they
  aren't re-picked next minute (lock = `sent_at IS NULL`).
- **Status**: 🔧 Recently fixed — CORS headers added + `verify_jwt: false`
  flipped to unbreak pg_cron 401s (SESSION_LOG_2026-06-17.md §pg_cron).

---

## Web Push (browser → Supabase → service worker)

End-to-end trace of the subscription + delivery path:

- **VAPID public key**: `import.meta.env.VITE_VAPID_PUBLIC_KEY`, read by
  `getPushPublicKey()` in `src/lib/push.ts`. Default value lives in
  `.env.example` (`BK6T0pOE7-…`).
- **VAPID private key**: server-only, Supabase Edge Function secret
  (`VAPID_PRIVATE_KEY`). Never on disk in the repo.
- **Service worker registration**:
  - Generated by `vite-plugin-pwa` in `autoUpdate` mode (`vite.config.ts:43`).
  - Custom push + click handlers live in `public/sw-push.js` and are pulled
    into the generated SW via `workbox.importScripts: ['/sw-push.js']`
    (`vite.config.ts:65`).
  - `public/sw-push.js` is dependency-free — no bundler runs over it. It
    handles `push` (parses JSON payload, shows notification with emoji-prefixed
    title + image + icon `/icons/icon-192.png`) and `notificationclick`
    (routes to `/events`, `/alliance/polls`, `/alliance`, `tap_url`, or `/`).
- **Subscription flow** (`src/hooks/usePushSubscription.ts` →
  `src/lib/push.ts` → `src/repositories/pushSubscriptions.ts`):
  1. `PushNotificationsToggle.tsx` (in Settings) calls `subscribe()`.
  2. `subscribePush()` requests `Notification.requestPermission()`, awaits
     `navigator.serviceWorker.ready`, reuses any existing PushSubscription or
     creates one via `pushManager.subscribe({ applicationServerKey })`.
  3. `upsertSubscription()` UPSERTs into `public.push_subscriptions` on the
     unique `endpoint` column, with `account_id = useAuth().account.id`,
     `language_code = i18n.language`, `user_agent = navigator.userAgent`.
  4. `send-push` Edge Function later reads those rows by `active = true` and
     fans out via `web-push`.
- **Unsubscribe**: `unsubscribePush()` tears down the SW subscription, then
  `removeSubscription()` DELETEs the row by endpoint.
- **Inbound notifications panel**: `src/hooks/useMyNotifications.ts` reads the
  20 most recent `push_messages` targeted at the signed-in user (mirrors the
  Edge Function's audience logic in a PostgREST `or(...)` filter); unread
  count is tracked via the `war-room.last_seen_notification_at` localStorage
  key. `NotificationsPanel.tsx` is the bell popover.
- **Local types caveat**: `pushSubscriptions.ts` declares local
  `PushSubscriptionRow` / `Insert` / `Update` shapes and routes writes through
  a narrow `AnyTableClient` cast because the generated Supabase types haven't
  been regenerated since the `push_*` migration. Documented in the file
  header. Same story for `push_messages` / `push_message_deliveries` in
  `notifications.ts`.

---

## Scrape sources (external data we pull from)

All scrapers live in `scripts/` and are **build-time only / manual** — no
runtime call from the PWA. Each writes to `src/data/` or `public/images/icons/`.

### `scripts/scrape-hero-details.mjs`

- **URL**: `kingshotdata.com/wp-json/wp/v2/...?_embed` (WordPress REST).
- **Frequency**: manual (one-off when hero roster changes).
- **Output**: `src/data/heroes-data.json` (keyed by slug).
- **Failure handling**: 300ms polite delay between requests; idempotent —
  skips heroes already present.

### `scripts/scrape-kingshotdata-icons.mjs`

- **URL**: `kingshotdata.com/wp-json/wp/v2/posts?_embed` (paged 50/page).
- **Frequency**: manual; re-run idempotent (missing files only).
- **Output**: `public/images/icons/kingshot-*/...webp` + manifest at
  `public/images/icons/kingshot-manifest.json`.
- **Failure handling**: polite delay; skips existing files.

### `scripts/scrape-kingshotwiki-items.mjs`

- **URL**: `kingshotwiki.com/items` (HTML scrape of Bootstrap tab-panes →
  S3 image URLs).
- **Frequency**: manual; `--force` flag overrides skip-existing.
- **Output**: `public/images/icons/kingshotwiki/{category}/{slug}.png` +
  `public/images/icons/kingshotwiki-manifest.json`.
- **Failure handling**: idempotent; skip existing unless `--force`.

### `scripts/scrape-mythic-gear-icons.mjs`

- **URL**: per-hero kingshotdata.com pages via WordPress REST
  (`content.rendered`).
- **Frequency**: manual.
- **Output**: `public/images/icons/kingshotdata/gear/{slug}.webp` + patches
  `src/data/heroes-data.json` (`exclusiveGear.iconUrl`). Uses `sharp` to
  crop the off-white frame.

### `scripts/process-hero-images.mjs`, `scripts/recrop-skill-icons.mjs`, `scripts/build-icons.mjs`

- Local image post-processing (`sharp`). No outbound network calls.

### `scripts/i18n/translate.mjs`

- **URL**: MyMemory (`api.mymemory.translated.net`) by default; optional
  `LIBRETRANSLATE_URL` if self-hosted/paid endpoint.
- **Frequency**: manual via `npm run i18n:translate` (or
  `npm run i18n:translate:dry`).
- **Output**: writes back to `src/locales/*.json` (only keys still identical
  to `en.json`).
- **Failure handling**: throttled to free-tier limits (5K chars/day
  anonymous, 50K with `MYMEMORY_EMAIL`). NOT loaded at runtime.

---

## Third-party libraries (frontend)

Relevant integrations (from `package.json` + grep):

- **`@supabase/supabase-js`** (`^2.108.1`) — single client in
  `src/lib/supabase.ts`; every repository imports it.
- **`@tiptap/*`** (react, starter-kit, underline, text-align, text-style,
  color, image, placeholder — all `^3.26.1`) — rich-text editor used by
  admin pages (milestones, notifications copy). Pre-bundled in
  `optimizeDeps.include` and split into its own `tiptap` chunk
  (`vite.config.ts`).
- **`@phosphor-icons/react`** (`^2.1.10`) — icon set used throughout
  `src/components/`, `src/pages/`.
- **`framer-motion`** (`^12.40.0`) — animations on cards, modals, navigation.
  Split into `framer` chunk.
- **`date-fns`** (`^4.4.0`) — date arithmetic + formatting; own chunk.
- **`react-hook-form`** + **`@hookform/resolvers`** + (no `zod` listed —
  ad-hoc validation in places, RHF + zod referenced in WAR_ROOM_LOG but not
  installed at this snapshot).
- **`react-router-dom`** (`^7.17.0`) — routing in `src/App.tsx` (heavy use
  of `lazy()` for admin pages).
- **`react-i18next`** + **`i18next`** + **`i18next-browser-languagedetector`**
  — i18n runtime; locales in `src/locales/*.json`.
- **`react-intersection-observer`** — lazy-load triggers.
- **`dompurify`** (`^3.4.10`) — sanitization of admin-authored HTML before
  rendering (milestone bodies, notification copy).
- **`tailwind-merge`** + **`clsx`** — className composition.
- **`workbox-window`** + **`vite-plugin-pwa`** — service worker generation
  (push handler injected via `importScripts`).
- **Not present** (verified by `grep`): no `recharts`, no `@tanstack/react-query`,
  no `react-pdf` / `pdfjs-dist`. Analytics is server-side aggregate queries
  in `src/repositories/analytics.ts`, not a charting library.

---

## Authentication flow

End-to-end trace (`src/repositories/auth.ts` + `src/hooks/useAuth.ts`):

1. User enters **username + password** on the Login page.
2. `signInWithUsername(username, password)` maps username →
   `${username}@dad-war-room.local` (`usernameToEmail`).
3. `supabase.auth.signInWithPassword({ email, password })` returns a session
   stored under the `dad-war-room.auth` localStorage key.
4. `useAuth` reads `supabase.auth.getUser()` then SELECTs the matching
   `member_accounts` row by `id = auth.uid()`; derives `isAdmin`,
   `isVotingMember`, `isAlly` flags from `account.role`.
5. Every subsequent repository call attaches the session JWT automatically;
   RLS on every table reads `auth.uid()` / the member_accounts role.
6. **Token refresh**: handled by `@supabase/supabase-js` with
   `autoRefreshToken: true` + `persistSession: true`. No manual refresh code
   anywhere in `src/`.
7. **Login telemetry**: `recordLoginEvent` RPC writes to `login_events` and
   stamps `member_accounts.last_login_at`. Errors are swallowed by design
   (`src/repositories/loginEvents.ts`).
8. **Sign-out**: `supabase.auth.signOut()` via `useAuth().signOut`.

Account creation + password reset bypass the client-side auth surface and go
through the admin-only Edge Functions documented above.

---

## Environment variables

Read from `.env.example` — `VITE_`-prefixed vars are inlined into the
browser bundle by Vite (public). The rest are build/script-only secrets.

### Runtime (browser, public)

| Var | Purpose | Set in |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | `.env.local` + Vercel env |
| `VITE_SUPABASE_ANON_KEY` | Anon JWT (safe — RLS gates everything) | `.env.local` + Vercel env |
| `VITE_VAPID_PUBLIC_KEY` | Web Push public key (paired w/ server private) | `.env.local` + Vercel env |

### Build-time only (script, secret)

| Var | Purpose | Used by |
|---|---|---|
| `MYMEMORY_EMAIL` | Bumps MyMemory translation quota 5K → 50K chars/day | `scripts/i18n/translate.mjs` |
| `LIBRETRANSLATE_URL` | Optional self-hosted/paid translator | `scripts/i18n/translate.mjs` |
| `LIBRETRANSLATE_API_KEY` | Optional LibreTranslate API key | `scripts/i18n/translate.mjs` |

### Supabase Edge Function secrets (server-side, never in repo)

| Var | Used by |
|---|---|
| `SUPABASE_URL` | All three functions |
| `SUPABASE_SERVICE_ROLE_KEY` | All three functions |
| `SUPABASE_ANON_KEY` | `create-account`, `reset-password` (for caller JWT validation) |
| `VAPID_PUBLIC_KEY` | `send-push` |
| `VAPID_PRIVATE_KEY` | `send-push` |
| `VAPID_SUBJECT` | `send-push` (defaults to `mailto:admin@dad-war-room.local`) |

---

## What's NOT integrated (intentionally / not yet)

Verified absent from code at this snapshot:

- **Discord webhooks** — no `discord` or `webhook` references in `src/` or
  `scripts/` (matches present only in locale strings, never in code).
- **Sentry / error monitoring** — not installed; no DSN env var; no init code.
- **Analytics SaaS (PostHog / GA / Mixpanel / etc.)** — not present. The
  `/admin/analytics` page (`src/pages/admin/AdminAnalytics.tsx`) is fed
  exclusively by server-side aggregate queries against `login_events` and
  `member_accounts` (`src/repositories/analytics.ts`).
- **Email service** — none. Supabase Auth's transactional emails are bypassed
  by the synthetic-email scheme (`@dad-war-room.local`), and accounts are
  created with `email_confirm: true` so no confirmation email ever fires.
- **React Query / SWR** — not installed. Repository hooks (`useEvents`,
  `useMembers`, etc.) manage their own fetch + state.
- **Charts (recharts/visx)** — not installed.
- **PDF rendering (react-pdf / pdfjs-dist)** — not installed.
- **Realtime Supabase channels** — no `.channel(` calls anywhere in `src/`.
  All freshness is hook-driven re-fetch on focus / mutation.
- **Supabase Storage backups** — none (no script writes to a fourth bucket).
  Bucket files are considered permanent per the storage repo's docstring.
