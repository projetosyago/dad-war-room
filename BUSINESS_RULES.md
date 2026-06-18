# DAD War Room — Business Rules Catalogue

> Generated 2026-06-18. Every rule, permission, validation, calculation, and gating logic in code.

## Index
- [1. Permissions & roles](#1-permissions--roles)
- [2. Validation rules](#2-validation-rules)
- [3. Calculations / formulas](#3-calculations--formulas)
- [4. Game-domain rules](#4-game-domain-rules)
- [5. State machines](#5-state-machines)
- [6. Notifications / push fan-out logic](#6-notifications--push-fan-out-logic)
- [7. i18n behavior](#7-i18n-behavior)
- [8. Cross-cutting rules](#8-cross-cutting-rules)
- [9. Rules NOT yet enforced (gaps)](#9-rules-not-yet-enforced-gaps)
- [10. Consequences of changing each rule](#10-consequences-of-changing-each-rule)

---

## 1. Permissions & roles

### 1.1 Role enum

Defined in DB at `supabase/migrations/20260615005744_fase_b_member_accounts_and_role_system.sql:13-17` and mirrored in TS at `src/types/domain.ts:86`:

```
account_role = 'ally' | 'member' | 'r2' | 'r3' | 'r4' | 'r5'
```

DB-side comment (`20260615005744_fase_b...sql:28-29`):
> `ally = read-only guest from another alliance (NOT counted as a DAD member). member/r2/r3 = regular members. r4/r5 = admin.`

### 1.2 Flag derivation (FRONTEND — `src/hooks/useAuth.ts:29-40`)

| Flag | Roles that get `true` |
|---|---|
| `isAdmin` | `r4`, `r5` |
| `isVotingMember` | `member`, `r2`, `r3`, `r4`, `r5` (everyone except `ally`) |
| `isAlly` | `ally` only |

**DB mirror** (defense in depth) — `private.is_admin()` / `private.is_voting_member()` / `private.is_ally()` SECURITY DEFINER functions at `supabase/migrations/20260615040409_audit_move_security_definer_to_private_schema.sql:29-60`:
- `is_admin()` → role ∈ {r4, r5} AND `active = true` (line 36)
- `is_voting_member()` → role ∈ {member, r2, r3, r4, r5} AND `active = true` (line 47)
- `is_ally()` → role = 'ally' AND `active = true` (line 58)

`active = true` is part of every check — deactivated accounts have NO permissions, even with role unchanged. Public schema thin SECURITY INVOKER wrappers at lines 64-86.

### 1.3 What each role CAN do

#### ally (role='ally')
- ✅ SELECT every public catalogue table (events, occurrences, milestones, polls, poll_options, poll_votes, members, member_accounts, heroes, pets, masters, troop_tiers, member_power_snapshots, event_participants, alliance_settings) — RLS allows `SELECT TO authenticated USING (true)` on all read-public tables
- ✅ UPDATE own `member_accounts` row except `role` field (RLS: `member_accounts_update` at `20260616044704_perf_consolidate_remaining_admin_self_overlaps.sql:11-25`)
- ✅ Read the audience-filtered notification bell — receives messages where `audience='all'` or `audience='allies'` or (`audience='custom'` AND in `custom_account_ids`) — `src/hooks/useMyNotifications.ts:108-121`
- ✅ Receive push notifications (`audienceRoles('allies') = ['ally']` — `supabase/functions/send-push/index.ts:66-77`)
- ✅ Read own `push_subscriptions` rows (`push_subs_own_select` policy — `20260616054801_push_notifications_schema.sql:56-57`)
- ✅ INSERT own `push_subscriptions` (`push_subs_own_insert` — same migration, line 58-59)
- ✅ Upload to `avatars` bucket under own auth.uid prefix (`avatars_insert_own` — `20260616051723_storage_buckets...sql:23-27`)
- ✅ INSERT own `login_events` rows (`login_events_insert` — `20260615005744_fase_b_member_accounts_and_role_system.sql:188-191`)
- ✅ View members detail page (route `/alliance/members/:nick` is behind `RequireAuth` only — `src/App.tsx:139-167`)
- ✅ View poll detail (UI shows results per `shouldShowResults` rules)

#### ally CANNOT
- ❌ Vote in polls — RLS `poll_votes_insert` requires `is_voting_member()` (`20260616044704_perf_consolidate_remaining_admin_self_overlaps.sql:48-62`)
- ❌ Be shown the "Voting" notification audience (only `voting`-role users receive messages with `audience='voting'` — `src/hooks/useMyNotifications.ts:113-114`)
- ❌ See admin routes — `ProtectedAdminRoute` at `src/components/ProtectedAdminRoute.tsx:25-27` redirects to `/` when `!auth.isAdmin`
- ❌ Change own role — `member_accounts_update` WITH CHECK forces `role` to remain unchanged unless `is_admin()` (`20260616044704...sql:17-25`)
- ❌ See "Pending polls" Hub card — `src/components/dashboard/PendingPollsCard.tsx:29` early-returns null when `!auth.isVotingMember`
- ❌ Be counted as a DAD member: `listDadMembers()` in `src/repositories/accounts.ts:34-42` filters `.neq('role', 'ally')`

UI markers for ally accounts: `<AllyChip />` rendered in `src/pages/Settings.tsx:92`, `src/pages/PollDetail.tsx:483-490` ("polls.detail.allyBanner"), and `src/pages/Polls.tsx:111`. Card variant flips to `card-hero--crimson` for allies in `src/components/dashboard/UserHeroCard.tsx:101-105`.

#### member / r2 / r3 (regular voting members)
- All ally permissions PLUS:
- ✅ Vote in open polls — RLS `poll_votes_insert` requires `is_voting_member()` AND poll status='open' AND (no closes_at OR closes_at > NOW()) — `20260616044704_perf_consolidate_remaining_admin_self_overlaps.sql:48-62`
- ✅ DELETE own votes while poll is open — `poll_votes_delete` policy, same conditions, lines 30-43
- ✅ Receive messages with `audience='voting'` — `src/hooks/useMyNotifications.ts:113-114`
- ✅ Listed in "Pending polls" Hub widget — `src/repositories/polls.ts:267-278` (`listPollsPendingVote`)

#### member / r2 / r3 CANNOT
- ❌ Reach any `/admin/*` route — `ProtectedAdminRoute` (`src/components/ProtectedAdminRoute.tsx:25-27`)
- ❌ Create accounts, reset passwords (Edge Functions reject with 403 — `supabase/functions/create-account/index.ts:73-75`, `supabase/functions/reset-password/index.ts:53-55`)
- ❌ INSERT/UPDATE/DELETE on any admin-write table (events, occurrences, milestones, polls, poll_options, members, alliance_settings, heroes, pets, masters, troop_tiers, push_messages, event_participants) — every per-verb policy requires `is_admin()`

#### r4 / r5 (admin) — adds on top of voting member
- ✅ Reach `/admin/*` — `ProtectedAdminRoute:8-30` lets through when `auth.isAdmin`
- ✅ `enter()` admin shell mode automatically when navigating to `/admin/*` — `src/App.tsx:103-112`
- ✅ Full INSERT/UPDATE/DELETE on every public table (per-verb admin policies — see `20260616044611_perf_consolidate_overlapping_policies.sql:1-72`, plus `events_admin_insert/update/delete` at `0002_rls_policies.sql:19-30`, etc.)
- ✅ Upload to `notification-images` and `milestone-bodies` buckets (`notif_images_admin_all`, `milestone_bodies_admin_all` — `20260616051723_storage_buckets...sql:44-53`)
- ✅ Create/reset accounts via Edge Functions (`supabase/functions/create-account/index.ts:73-75`; `reset-password/index.ts:53-55`)
- ✅ Read all `login_events` (`login_events_select` — `20260615005744_fase_b...sql:184-186`)
- ✅ Read all `push_message_deliveries` (`push_deliveries_admin_select` — `20260616054801_push_notifications_schema.sql:74-75`)
- ✅ Receive `audience='admins'` messages — `src/hooks/useMyNotifications.ts:116-118` and `send-push/index.ts:70-71`
- ✅ See vote tallies regardless of `results_visibility` setting — `src/repositories/polls.ts:251` (`if (ctx.isAdmin) return true`)
- ✅ Promote/demote roles via direct UPDATE to `member_accounts` (RLS allows admin update with no WITH CHECK on role — `20260616044704...sql:11-25`)
- ✅ Deactivate / reactivate accounts via `setAccountActive` (`src/repositories/accounts.ts:141-147`)

#### r4 vs r5 distinction
- **Only r5 can create r5 accounts** — enforced in Edge Function `create-account/index.ts:87-89`:
  ```ts
  if (body.role === 'r5' && caller.role !== 'r5') {
    return json({ error: 'Only r5 can create r5 accounts' }, 403)
  }
  ```
- UI mirror: `src/pages/admin/AdminAccounts.tsx:127-131` hides `r5` from role picker for r4 callers.
- DB does NOT explicitly enforce r4-cannot-create-r5 in RLS — admin INSERT policy only checks `is_admin()`. The Edge Function is the single enforcement point. **Gap noted in §9.**

### 1.4 Public-read tables (anyone, signed-in or not — `TO anon, authenticated` or `USING (true)`)
- `events`, `event_occurrences`, `kingdom_milestones` (`0002_rls_policies.sql:15-17, 32-34, 49-51`)
- `member_power_snapshots` (`20260616060557_members_power_snapshots.sql:35`)
- `event_participants` (`20260616060607_event_participants.sql:19`)
- `heroes`, `pets`, `masters`, `troop_tiers`, `troop_tier_branch_icons` (`20260616060625_game_catalogue_schema.sql:76`)
- `alliance_settings` (`20260616044907_alliance_settings_singleton.sql:25-26`)
- `push_messages` SELECT allowed `USING(true)` (`20260616054801_push_notifications_schema.sql:66`)

### 1.5 Auth-required (`TO authenticated USING(true)`)
- `members` (`20260615021304_fase_c_members_roster.sql:87-88`)
- `member_accounts` (`20260615005744_fase_b...sql:159-161`)
- `polls`, `poll_options`, `poll_votes` (`20260615032838_fase_d_polls_system.sql:88-99, 111-113`)
- `login_events` (self or admin only — `20260615005744_fase_b...sql:184-186`)

### 1.6 Self-only privileges
- `member_accounts` UPDATE — own row only, cannot change own `role` (`20260616044704_perf_consolidate_remaining_admin_self_overlaps.sql:11-25`)
- `login_events` INSERT — `account_id = auth.uid()` (`20260615005744_fase_b...sql:188-191`)
- `push_subscriptions` INSERT/UPDATE/DELETE — `account_id = auth.uid()` or admin (`20260616054801_push_notifications_schema.sql:58-64`)
- `poll_votes` DELETE/INSERT — `account_id = auth.uid()` (plus admin override since `20260616044704_perf_consolidate_remaining_admin_self_overlaps.sql`)
- Storage `avatars` bucket — `(storage.foldername(name))[1] = auth.uid()::text` (`20260616051723_storage_buckets...sql:23-41`)
- Cannot deactivate yourself in UI — `src/pages/admin/AdminAccounts.tsx:222-225`:
  ```ts
  if (account.id === auth.user?.id && account.active) {
    window.alert(t('admin.accounts.cantDeactivateSelf'))
    return
  }
  ```
  (No DB enforcement — UI-only.)

### 1.7 Route gates (FRONTEND)
- `<RequireAuth>` (`src/components/RequireAuth.tsx:17-35`): redirect to `/login` (preserves `from`) when signed-out. Applied to every member-facing route except `/login` (`src/App.tsx:93-167`).
- `<ProtectedAdminRoute>` (`src/components/ProtectedAdminRoute.tsx:8-30`): redirect to `/login` when signed-out; redirect to `/` when signed-in but `!isAdmin`. Wraps every `/admin/*` route (`src/App.tsx:173-313`).
- Legacy `/admin/login` → `/login` redirect (`src/App.tsx:170`).
- Legacy redirects: `/admin/dashboard` → `/admin/events`, `/admin/accounts` → `/admin/members/accounts`, `/admin/occurrences` → `/admin/events/occurrences`, `/admin/milestones` → `/admin/alliance/timeline`, `/members` → `/alliance/members`, `/polls` → `/alliance/polls`, `/polls/:slug` → `/alliance/polls/:slug` (`src/App.tsx:316-322, 164-166`).

### 1.8 Push subscription / language sync
- `usePushSubscription.subscribe()` (`src/hooks/usePushSubscription.ts:73-91`) requires `account?.id`:
  ```ts
  if (!account?.id) throw new Error('Sign in before enabling push notifications.')
  ```
- Language code propagated to all the user's subscriptions on i18n change via `updateLanguage()` (`src/repositories/pushSubscriptions.ts:121-131`)

---

## 2. Validation rules

### 2.1 Login (`src/pages/Login.tsx`)
- Username + password both required at submit — `src/pages/Login.tsx:101-107`:
  ```ts
  if (!username.trim() || !password) { setError(...); return }
  ```
- No client min-length on password at login (only at create/reset — see below).
- Username → email mapping at `src/repositories/auth.ts:12-15`:
  ```ts
  const trimmed = input.trim().toLowerCase()
  return trimmed.includes('@') ? trimmed : `${trimmed}${SYNTHETIC_EMAIL_DOMAIN}`
  ```
  (`SYNTHETIC_EMAIL_DOMAIN = '@dad-war-room.local'` — line 6.)
- Failed-signin telemetry: `recordLoginEvent('failed_signin', undefined, currentUserAgent())` is fired on throw (`src/hooks/useAuth.ts:124-127, 138-142`). RPC enforces anon → only `failed_signin` with `account_id IS NULL` (`20260616051634_record_login_event_anon_restrict.sql:25-31`).

### 2.2 Account creation Edge Function (`supabase/functions/create-account/index.ts`)
Caller checks:
- Authorization header required (`81-90` → 401)
- Caller must have role r4 or r5 (`73-75` → 403)
- Only r5 can create r5 (`87-89` → 403)

Body validation:
- `username`, `password`, `role` all required (`81-83` → 400)
- `role` must be in `['ally','member','r2','r3','r4','r5']` (`23, 84-86` → 400)
- Username regex `/^[a-z0-9._-]{2,32}$/` — 2-32 chars, lowercase alphanumeric + `. _ -` (`95-97` → 400)
- Password ≥ 6 chars (`98-100` → 400)
- Display name defaults to username if empty (`92`)
- `languageCode` lowercased, sliced to first 8 chars, defaults `'en'` (`93`)
- Username forced to lowercase (`91`)
- Email computed as `${username}@dad-war-room.local` (`102`)
- `email_confirm: true` on createUser (`113`) — no email-link confirmation flow
- `password_temporary: false` hard-coded on the new row (`132`) — *"Salles: don't force password change"* (`132` comment)
- On member_accounts insert failure: auth user is rolled back via `auth.admin.deleteUser` (`138-141`)

### 2.3 Password reset Edge Function (`supabase/functions/reset-password/index.ts`)
- Caller must be admin r4 or r5 (`52-55` → 403)
- `accountId` and `newPassword` required (`60-62` → 400)
- Password ≥ 6 chars (`63-65` → 400)
- **No `password_temporary` flag set** — explicit comment line 71: *"Salles 2026-06-14: just change the password. No password_temporary flag."* This contradicts the original `member_accounts.password_temporary` design (column kept for future, default flipped to `false` in `20260615012214_fase_b_disable_force_password_change.sql:7-11`).

### 2.4 Self password change (UI — `src/pages/admin/AdminAccounts.tsx:175-196`)
- `window.prompt` for new password
- Client-side check: `newPassword.length >= 6` else `window.alert('passwordTooShort')` (`180-183`)
- Repo: `src/repositories/accounts.ts:185-188`:
  ```ts
  export async function changeMyPassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
  }
  ```
  No min-length check in the repo — relies on UI + Supabase Auth defaults.

### 2.5 Profile update (`src/repositories/accounts.ts:155-182`)
- Typed patch, only changed fields sent
- `displayName` capped via UI `maxLength={40}` (`src/components/settings/ProfileEditor.tsx:233`)
- No repo-level length check.

### 2.6 Poll creation (`src/pages/admin/AdminPolls.tsx:42-72`)
Zod schema (`zodResolver` at line 122):
- `title`: trim, min 1, max 140 (`44`)
- `description`: trim, max 2000, optional (`45`)
- `type`: enum `['single','multi']` (`46`)
- `status`: enum `['draft','open']` — only 2 statuses settable on create (`47`)
- `opensAt` / `closesAt`: strings, optional (`48-49`)
- `resultsVisibility`: enum `['during','after_close','admin_only']` (`50`)
- `options`: array, min 2, max 12 (`52-54`, constants `MIN_OPTIONS=2`, `MAX_OPTIONS=12` lines 38-39)
- `superRefine` on options (`56-72`):
  - Trimmed non-empty count ≥ 2 (`58-64` → error code `minOptions`)
  - No case-insensitive duplicates (`65-71` → error code `duplicates`)

Repo-side enforcement (defense in depth — `src/repositories/polls.ts:107-162`):
- Minimum 2 options enforced again at line 108-110: `throw new Error('A poll needs at least 2 options.')`
- Slug generation: `slugify(title)` — NFKD-normalize, strip combining marks, non-alphanumeric → `-`, trim, max 60 chars (`35-43`)
- Slug collision retry: 4 attempts appending `-${random.toString(36).slice(2,5)}` (`116-121`)
- Share token: 6 chars from custom alphabet `'23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'` excluding ambiguous `0/1/Il/O` (`23, 25-33`)
- Share token collision retry: 4 attempts (`125-130`)
- Defaults: `status='open'`, `results_visibility='during'`, opensAt/closesAt/eventOccurrenceId null (`138-142`)
- Title/description trimmed before insert (`135-136`)
- Options rollback: if `poll_options` insert fails, the parent `polls` row is deleted (`157-160`)

UI input caps: poll title `maxLength={140}` (`251`), option label `maxLength={80}` (`348`).

### 2.7 Notifications form (`src/pages/admin/AdminNotifications.tsx`)
- Title `maxLength={60}` (`190`)
- Body `maxLength={240}` (`203`)
- `canSend` gate (`93-100`):
  ```ts
  const hasContent = draft.title.trim() && draft.body.trim()
  if (!hasContent) return false
  if (draft.schedule === 'later' && !draft.scheduledAt) return false
  if (draft.schedule === 'recurring' && !draft.recurrenceRule.trim()) return false
  if (draft.tapTarget === 'url' && !draft.tapUrl.trim()) return false
  ```
- `createdBy` requires signed-in account/user; else error (`104-108`)
- Audience defaults to `'voting'`; emoji defaults `'🐻'`; tap target defaults `'hub'` (`66-77`)
- DB CHECK on `audience`: `audience IN ('all','voting','admins','allies','custom')` (`20260616054801_push_notifications_schema.sql:28`)
- DB CHECK on `tap_target`: `IN ('hub','events','polls','alliance','url')` (line 30)
- `custom_account_ids` only sent when audience='custom' AND non-empty (`src/repositories/notifications.ts:109-112`)
- `tap_url` only sent when tap_target='url' (`src/repositories/notifications.ts:114`)

### 2.8 Storage upload (`src/repositories/storage.ts`)
Per-bucket caps (`30-43`):
- `avatars`: 2 MB, mime ∈ {jpeg, png, webp, gif}
- `notification-images`: 5 MB, mime ∈ {jpeg, png, webp}
- `milestone-bodies`: 5 MB, mime ∈ {jpeg, png, webp, gif}

Client-side validation (`92-107`):
- Rejects unsupported mime: `'Formato não suportado. Use ${human}.'`
- Rejects oversize: `'Arquivo muito grande. Máximo ${mb} MB.'`
- Rejects empty/invalid prefix
- File extension derived from filename + content-type, validated `/^[a-z0-9]{1,5}$/` (`51-58`)
- `pathPrefix` sanitized: trim slashes, collapse `..` (`60-67`)
- Object key: `${cleanPrefix}/${crypto.randomUUID()}.${ext}` (`109-110`)
- `upsert: false` (`115`)
- RLS-denial error message rewritten to user-facing Portuguese (`120-126`)

**DB mirrors** (defense in depth — `20260616051723_storage_buckets_avatars_notifications_milestones.sql:11-19`):
- `avatars`: 2097152 bytes, jpeg/png/webp/gif
- `notification-images`: 5242880 bytes, jpeg/png/webp
- `milestone-bodies`: 5242880 bytes, jpeg/png/webp/gif

### 2.9 Heroes / Pets / Masters / TroopTiers DB constraints
- `heroes.generation` CHECK `BETWEEN 1 AND 12` (`20260616060625_game_catalogue_schema.sql:13`)
- `pets.generation` CHECK `BETWEEN 1 AND 12` (line 30)
- `masters.unlock_order` is `UNIQUE NOT NULL` (line 42)
- `troop_tiers.tier_label` is `UNIQUE NOT NULL` (line 51)
- Slugs `UNIQUE NOT NULL` for heroes, pets, masters, troop_tiers (lines 11, 28, 41, 51)

### 2.10 Members (in-game roster) DB constraints (`20260615021304_fase_c_members_roster.sql:37-57`)
- `nick` UNIQUE on `lower(nick)` (line 68-69)
- `power_m` numeric(7,1) DEFAULT 0
- `tg_level` CHECK `BETWEEN 1 AND 8` (line 43)
- `town_center_level` CHECK `BETWEEN 1 AND 30` (line 44)
- `members_tier_xor_tc` CHECK — cannot set BOTH `tg_level` and `town_center_level` (line 54-56):
  ```sql
  CONSTRAINT members_tier_xor_tc CHECK (
    NOT (tg_level IS NOT NULL AND town_center_level IS NOT NULL)
  )
  ```
- Status enum `('active','temporary_out','left')` — `markMemberLeft` does soft delete via status='left' rather than DELETE (`src/repositories/members.ts:156-163`)

### 2.11 Member_accounts DB constraints
- `username` UNIQUE, plus case-insensitive uniqueness via `member_accounts_username_lower_idx` (`20260615005744_fase_b...sql:34, 62-63`)
- `role` defaults to `'member'` (line 37)
- `language_code` defaults `'en'` (line 38)
- `active` defaults `true`, `password_temporary` defaults `false` (post `20260615012214_fase_b_disable_force_password_change.sql`)
- FK to `auth.users` ON DELETE CASCADE (line 33)

### 2.12 Event occurrences DB constraints (`0001_initial_schema.sql:48-59`)
- `duration_minutes` CHECK `> 0`, defaults 30
- FK to `events` ON DELETE CASCADE

### 2.13 Polls DB constraints (`20260615032838_fase_d_polls_system.sql:23-35`, full spec `20260615033958_fase_d_polls_full_spec.sql`)
- `slug` UNIQUE NOT NULL; unique on `lower(slug)` (`32, 46`)
- `share_token` UNIQUE NOT NULL (`33, 56-57`)
- `type` ENUM `'single' | 'multi'`
- `status` ENUM `'draft' | 'open' | 'closed' | 'archived'` (`20260615033958...sql:15`)
- `results_visibility` ENUM `'during' | 'after_close' | 'admin_only'` (`20260615033958...sql:21`)
- `poll_votes` PRIMARY KEY `(poll_id, option_id, account_id)` (line 75) — repeat votes for same option idempotent via UPSERT (`src/repositories/polls.ts:174-181`)

### 2.14 Event participants (`20260616060607_event_participants.sql`)
- PK `(event_occurrence_id, member_id)` (line 14) — composite enforces no duplicate participant per occurrence
- `participation_role` CHECK in `('leader','joiner','standby')` (line 10)
- FKs ON DELETE CASCADE

### 2.15 Push subscriptions
- `endpoint` UNIQUE NOT NULL (`20260616054801_push_notifications_schema.sql:11`)
- Index `WHERE active = true` (line 20)
- Client validates `sub.endpoint`, `sub.keys.p256dh`, `sub.keys.auth` present before upsert (`src/repositories/pushSubscriptions.ts:81-86`)
- UPSERT on conflict by `endpoint` re-activates inactive rows (`99-103`)

### 2.16 Username "redact" for logs (`supabase/functions/create-account/index.ts:42-46`)
Emails / usernames are masked in console logs: `salles@x.com` → `sa***@x.com`, `bob` → `bo***`.

### 2.17 Other input caps (admin pages)
- Account form password `minLength={6}` (`src/pages/admin/AdminAccounts.tsx:326`)
- Milestone name `maxLength={120}` (`src/pages/admin/AdminMilestones.tsx:232, 416`)
- Milestone notes `maxLength={200}` (`279, 429`)
- TroopTier `tier_label` `maxLength={16}` (`src/pages/admin/AdminTroopTiers.tsx:353`)
- Heroes / Pets / Masters name `maxLength={120}` (`AdminHeroes.tsx:396`, `AdminPets.tsx:375`, `AdminMasters.tsx:374`)

### 2.18 Markdown / HTML sanitization
- Tiptap output (admin rich text) passed through DOMPurify before `dangerouslySetInnerHTML` — `src/lib/sanitize.ts:30-39`
- Allowed tags whitelist: `h1-h6, p, br, hr, strong, em, u, s, mark, sub, sup, ul, ol, li, blockquote, a, img, code, pre, span, div` (`14-23`)
- Allowed attrs: `href, src, alt, title, target, rel, class, style` (`24-28`)
- Markdown for poll descriptions (`src/lib/markdown.ts`): supports bold/italic/code/links (http(s) only)/lists/`<br>`. Everything else escaped. No raw HTML passthrough (zero XSS surface).

---

## 3. Calculations / formulas

### 3.1 Hero upgrade — Star Shards
`src/data/hero-upgrade-costs.ts:33-39`

| Star tier | Shards (qty) | Cumulative |
|---|---:|---:|
| ★1 | 10 | 10 |
| ★2 | 40 | 50 |
| ★3 | 115 | 165 |
| ★4 | 300 | 465 |
| ★5 | 600 | 1065 |

`STAR_SHARD_TOTAL_KNOWN = 1065` (line 42). Cap at ★5 — *"The game caps heroes at ★5 — no ★6 in-game (per Salles 2026-06-17)"* (line 23 comment).

Item naming (`51-58`):
- Amadeus and Helga use hero-exclusive shards: `${heroName} Shards` (set `HERO_EXCLUSIVE_SHARDS = new Set(['Amadeus','Helga'])` at line 49)
- All other heroes: `${Rarity} General Hero Shard` (e.g. "Mythic General Hero Shard")

### 3.2 Hero upgrade — Skill Books
`src/data/hero-upgrade-costs.ts:76-87`

| Transition | Books |
|---|---:|
| Lvl 1 → 2 | 10 |
| Lvl 2 → 3 | 30 |
| Lvl 3 → 4 | 50 |
| Lvl 4 → 5 | 75 |

`SKILL_BOOK_TOTAL_PER_SKILL = 165` (`84-87`, reduce-sum). Same numbers across all rarities — *"Salles 2026-06-17: quantities are the same across all rarities; only the item-name token changes."*

Item name pattern: `${Rarity} ${Mode} Skill Book` — e.g. "Mythic Conquest Skill Book" or "Epic Expedition Skill Book" (`89-94`).

### 3.3 Hero upgrade — Widgets (Mythic only)
`src/data/hero-upgrade-costs.ts:107-112`

10 levels, +5 widgets each: `(i+1) * 5` for i ∈ [0..9].

| Level | Qty | Cumulative |
|---|---:|---:|
| 1 | 5 | 5 |
| 2 | 10 | 15 |
| 3 | 15 | 30 |
| 4 | 20 | 50 |
| 5 | 25 | 75 |
| 6 | 30 | 105 |
| 7 | 35 | 140 |
| 8 | 40 | 180 |
| 9 | 45 | 225 |
| 10 | 50 | 275 |

`WIDGET_TOTAL = 275` (`112`). Only Mythic heroes have widgets — `summarizeHeroCosts` returns `widgets: null` for rare/epic (`165-171`).

### 3.4 Per-hero totals (helper at `src/data/hero-upgrade-costs.ts:140-173`)
```ts
totalSkillBooks = conquestSkillCount * 165 + expeditionSkillCount * 165
starShards.qty = 1065
widgets.qty = 275 if mythic else null
```

### 3.5 Poll tally / pending counts
- `tallyVotes(poll)` at `src/repositories/polls.ts:257-264` — for each option count `votes.filter(v => v.optionId === option.id).length`
- `totalVoters` = distinct `accountId` (`src/pages/PollDetail.tsx:310-313`)
- `totalVotes` = `poll.votes.length` (`309`)
- `participationPct = totalVoters > 0 ? min(100, round(totalVoters / max(totalVoters, 10) * 100)) : 0` — note: this always reads 100% when totalVoters >= 10; documented as "informational only" with no real eligible-count source (`354-358`)
- `leadingId` = top of `[...tallied].sort((a,b) => b.count - a.count)` if first count > 0 (`322-325`)

### 3.6 Online / active session counts
`src/repositories/analytics.ts`:
- `countOnlineNow(thresholdMinutes = 5)` (`42-45`): distinct accounts with signin event in last 5 min
- `countActiveSessions()` (`51-54`): distinct accounts with signin in last 24h
- `countFailedSigninsLast24h()` (`60-69`): raw `failed_signin` count last 24h
- `countNeverLoggedIn()` (`76-83`): accounts where `last_login_at IS NULL`
- `MS_PER_MINUTE = 60_000`, `MS_PER_HOUR = 60 * MS_PER_MINUTE` (lines 16-17)

### 3.7 Power formatting / TC → tier
`src/data/roster.ts`:
- `formatPower(powerM)` (`87-91`):
  - `>= 1000` → `${(p/1000).toFixed(2)}B`
  - `>= 1` → `${p.toFixed(1)}M`
  - else → `${(p*1000).toFixed(0)}K`
- `totalAlliancePowerM(roster)` = sum of `power_m` (`83-85`)
- `highestTroopTier(member)` (`58-71`):
  - If `tg_level` set → `TG${tg_level}` (short-circuits)
  - Else by `town_center_level`:
    - `>= 30` → T10, `>= 26` → T9, `>= 22` → T8, `>= 19` → T7, `>= 16` → T6, `>= 13` → T5, `>= 11` → T4, `>= 7` → T3, `>= 4` → T2, `>= 1` → T1
    - else `'—'`
- `tierSortValue(tier)` (`73-77`): `'TG{n}'` → `100 + n`, `'—'` → `-1`, else parseInt of `slice(1)`
- DB CHECK constraints prevent `tg_level` and `town_center_level` from being set simultaneously (see §2.10)

### 3.8 Notification unread count
`src/hooks/useMyNotifications.ts:165-171`:
```ts
const unreadCount = useMemo(() => {
  if (!lastSeenMs) return messages.length
  return messages.filter((m) => {
    const ts = Date.parse(m.sent_at ?? m.created_at)
    return Number.isFinite(ts) && ts > lastSeenMs
  }).length
}, [messages, lastSeenMs])
```
- `lastSeenMs` from `localStorage` key `'war-room.last_seen_notification_at'` (`31`)
- `MAX_MESSAGES = 20` (line 32) — only the 20 most recent are fetched
- `markAllAsSeen()` writes `new Date().toISOString()` (`173-177`)

### 3.9 Push fan-out budget
`supabase/functions/send-push/index.ts:44`: `MAX_DELIVERIES_PER_INVOCATION = 500` — single cron tick processes at most 500 deliveries; remaining are picked up on next tick.

### 3.10 Push TTL
`send-push/index.ts:228`: web-push `TTL: 60 * 60 * 24` (24h). After TTL, push service drops the message.

### 3.11 Mythic widget chest icon resolver
`src/data/hero-upgrade-costs.ts:201-205`:
```ts
export function widgetChestIcon(generation?: number | null): string {
  if (!generation) return `${CHEST_ICON_ROOT}/custom-hero-widget-chest.png`
  const clamped = Math.min(6, Math.max(2, generation))
  return `${CHEST_ICON_ROOT}/gen-${clamped}-custom-hero-widget-chest.png`
}
```
**Gen 7 falls back to Gen 6 art** ("gen 7+ falls back to gen-6 until the wiki publishes new art" — comment line 198-200). Gen 1 also falls back to Gen 2 (clamp lower bound).

---

## 4. Game-domain rules

### 4.1 Hero roster (34 canonical heroes)
`src/data/heroes-roster.ts`:

**4 Rare heroes** (`32-37`): Olive, Edwin, Seth, Forrest

**8 Epic heroes** (`39-48`): Amane, Yeonwoo, Fahd, Chenko, Gordon, Diana, Howard, Quinn

**22 Mythic heroes across 7 generations** (`50-108`):
- **Gen 1**: Jabel, Amadeus, Helga, Saul (4)
- **Gen 2**: Hilde, Zoe, Marlin (3)
- **Gen 3**: Petra, Jaeger, Eric (3)
- **Gen 4**: Rosa, Alcar, Margot (3)
- **Gen 5**: Vivian, Long Fei, Thrud (3)
- **Gen 6**: Yang, Triton, Sophia (3)
- **Gen 7**: Wee & Woo, Charles, Ava (3)

`TOTAL_HEROES = ROSTER_INDEX.length` = 4 + 8 + 22 = **34** (`129`).

DB schema (`heroes.generation`) constrained `BETWEEN 1 AND 12` even though only 1-7 are populated (room for future gens 8-12).

### 4.2 Skill book quantities standardized across rarities
Confirmed by Salles 2026-06-17 — comment in `src/data/hero-upgrade-costs.ts:61-63`:
> *"Salles 2026-06-17: quantities are the same across all rarities; only the item-name token changes."*

### 4.3 Hero-exclusive shards
`src/data/hero-upgrade-costs.ts:49`:
```ts
const HERO_EXCLUSIVE_SHARDS = new Set(['Amadeus', 'Helga'])
```
Both ★ shards and `starShardIcon` return `null` for these heroes (use hero-specific image, no shared icon).

### 4.4 Widget chest icons gen-specific
See §3.11 above. Generation 2-6 art exists; gen 1 → gen 2 fallback, gen 7+ → gen 6 fallback, no-generation → generic chest.

### 4.5 Widget item name
`src/data/hero-upgrade-costs.ts:119-125`: if `exclusiveGearName` is provided → `${exclusiveGearName} Widget` (e.g. "Fate's Writ Widget" for Petra); else fallback to `${heroName}'s Widget`.

### 4.6 Game data labels kept in EN across all locales
Per `scripts/i18n/dont-translate.json` — sees §7.1 below. All hero names, troop tier labels (T1-T10, TG1-TG8), event names (Bear Hunt, KvK, Castle Battle, Viking Vengeance, Tri-Alliance, Cesar's Fury, Swordland Showdown, Lunar Festival), feature names (War Academy, Hero Hall, Crucible, Foundry), proper nouns (DAD, Truegold, BIGDADDYS, Salles, Kingshot) are EN across all locales.

### 4.7 Alliance ranks (R1-R5) and subgroups
`src/types/domain.ts:110-112`:
```ts
type AllianceRank = 'r1' | 'r2' | 'r3' | 'r4' | 'r5'
type MemberSubgroup = 'lieutenant' | 'alpha' | 'enforcerer' | 'supreme'
type MemberStatusValue = 'active' | 'temporary_out' | 'left'
```

DB enum comment (`20260615021304_fase_c_members_roster.sql:33-35`):
> `R1 (newcomer) → R5 (founder). Lieutenant = R1, Alpha = R2, Enforcerer = R3, Supreme = R4. R5 has none.`

**Important distinction**: `alliance_rank` (in-game R1-R5) is separate from `account_role` (app permission). A user can be game-R5 but app-`member`, or game-R1 but app-`r4` (admin). `members` table = game roster; `member_accounts` table = login + app role.

### 4.8 DAD tag positions
`members.dad_tag` text `'prefix' | 'suffix' | NULL` per column comment (`20260615021304_fase_c_members_roster.sql:65-66`). UI adapter `src/lib/memberAdapter.ts:21-23` narrows to those 2 values; anything else → undefined.

### 4.9 Allies are NOT counted as DAD members
- `src/repositories/accounts.ts:34-42` — `listDadMembers()` filters `.neq('role','ally').eq('active', true)`
- DB-side has no `members` row for ally accounts (`member_accounts.member_id` is null for them)
- UI sprinkles ally markers via `<AllyChip>` and crimson card variant

### 4.10 Town Center vs TG mutually exclusive
DB CHECK `members_tier_xor_tc` (see §2.10). UI helper `highestTroopTier` short-circuits on `tg_level` (see §3.7).

### 4.11 Kingdom milestone categories
`src/types/domain.ts:43-52`:
```ts
type MilestoneCategory = 'truegold' | 'heroes' | 'pets' | 'pvp' | 'feature'
  | 'master' | 'fog' | 'war-academy' | 'other'
```
DB enum at `0001_initial_schema.sql:10-12`.

### 4.12 Event statuses
`'active' | 'coming-soon' | 'archived'` (`src/types/domain.ts:7`, DB enum at `0001_initial_schema.sql:8`). `archiveEvent` sets `status='archived'` AND stamps `archived_at = NOW()` (`src/repositories/events.ts:40-42`).

### 4.13 Participation roles in events
`'leader' | 'joiner' | 'standby'` (`src/types/domain.ts:260`, DB CHECK at `20260616060607_event_participants.sql:10`).

Sort order in admin participants page (`src/repositories/eventParticipants.ts:122-145`):
```ts
const ROLE_ORDER = { leader: 0, joiner: 1, standby: 2 } // null = 9 (last)
```
Then by `member.nick` alphabetic.

### 4.14 Seed events (8)
`0003_seed_data.sql:6-31` — Bear Hunt 1 (active), Bear Hunt 2, King's Castle Battle, KvK, Viking Vengeance, Swordland Showdown, Tri-Alliance Clash, Cesar's Fury (all 7 of the rest `coming-soon`).

### 4.15 Seed milestones (37)
`0003_seed_data.sql:33-72` — covers Gen 1-8 heroes, Gen 1-8 pets, TG1-3/5/8/10, 4 masters, 7 PvP firsts, 3 fog clears, 5 features, war academy.

### 4.16 Power column
`members.power_m` numeric(7,1) — "Power in MILLIONS (e.g. 158.7). NUMERIC(7,1) lets us go to 9,999,999.9M = 9.99T" (`20260615021304_fase_c_members_roster.sql:61-62`).

---

## 5. State machines

### 5.1 Poll status state machine
DB enum: `'draft' | 'open' | 'closed' | 'archived'` (`20260615033958_fase_d_polls_full_spec.sql:15`)

Transitions (admin-only via repo functions in `src/repositories/polls.ts`):

| Transition | Function | Code |
|---|---|---|
| → open (publish) | `publishPoll(id)` | `198-202` — `UPDATE status='open'` |
| → closed (manual) | `closePollNow(id)` | `204-209` — `UPDATE status='closed', closed_at=NOW()` |
| closed → open | `reopenPoll(id)` | `211-215` — `UPDATE status='open', closed_at=NULL` |
| → archived | `archivePoll(id)` | `217-221` — `UPDATE status='archived'` |
| archived → closed (or specified) | `unarchivePoll(id, target='closed')` | `223-227` |
| Hard delete | `deletePoll(id)` | `229-232` — DELETE |

Implicit transition: a poll with `status='open'` is automatically "closed-effective" once `closes_at < NOW()` per `isPollOpen()` (`240-244`):
```ts
if (poll.status !== 'open') return false
if (!poll.closesAt) return true
return new Date(poll.closesAt).getTime() > Date.now()
```
DB votes RLS check (`20260616044704_perf_consolidate_remaining_admin_self_overlaps.sql:39, 58`) enforces the same: status='open' AND (closes_at IS NULL OR closes_at > NOW()) for votes to insert/delete.

**Visibility filtering** (`src/repositories/polls.ts:57-68`):
- Default `listPolls()` returns only `'open'` + `'closed'`
- `includeDrafts: true` adds drafts
- `includeArchived: true` adds archived

### 5.2 Member status state machine
`'active' | 'temporary_out' | 'left'` (`src/types/domain.ts:112`).

- New member: defaults `active` (`20260615021304_fase_c_members_roster.sql:47`)
- `markMemberLeft(id)` (`src/repositories/members.ts:156-163`): `UPDATE status='left'` — **soft delete, preserves history** (comment line 156)
- `temporary_out`: still counted as DAD by default — `listMembers(includeTemporaryOut: true)` is the default (`src/repositories/members.ts:27`)
- `left` members excluded by default (`includeLeft: false` default — `src/repositories/members.ts:27`)
- UI public view filters out `left`: `src/lib/memberAdapter.ts:41` — `members.filter(m => m.status !== 'left')`
- No automated transition triggers — admin manually flips via UI

### 5.3 Push message state machine
Per `push_messages` row state (`20260616054801_push_notifications_schema.sql:22-39`):

| State | Conditions |
|---|---|
| Draft / scheduled | `scheduled_for IS NOT NULL` AND `scheduled_for > NOW()` AND `sent_at IS NULL` AND `cancelled = false` |
| Pending (due) | `scheduled_for <= NOW()` AND `sent_at IS NULL` AND `cancelled = false` — pg_cron picks these up |
| Sent | `sent_at IS NOT NULL` |
| Cancelled | `cancelled = true` (never sent again) |

Index `push_messages_scheduled_idx` (line 39) targets `WHERE sent_at IS NULL AND cancelled = false`.

Transitions (`supabase/functions/send-push/index.ts`):
- Cron picks up pending messages (`117-131` — filter `sent_at IS NULL AND cancelled = false AND scheduled_for <= now`)
- After fan-out, message is stamped `sent_at = NOW()` (`267-275`)
- Idempotent: once `sent_at` is set, the message is never picked up again — comment line 14-16: *"Idempotent: a row is locked by `sent_at IS NULL` and gets stamped before the next invocation can reach it."*
- Per-delivery: `push_message_deliveries.delivered_at` set on success, `error` set on failure (`230-244`)
- Subscriptions returning 404/410 are deactivated: `active=false` (`248-251`)

Admin "send now" via UI: `sendPushImmediately(messageId)` — `src/repositories/notifications.ts:175-180` invokes the edge function with `{ message_id }` body, bypassing scheduled_for (`send-push/index.ts:123-125`).

### 5.4 Milestone "achieved" flag
`kingdom_milestones.achieved` boolean, default false (`0001_initial_schema.sql:75`). Listed via filter at `src/repositories/milestones.ts:13-21` (opts.achieved boolean).

`listUpcomingMilestones()` (`src/repositories/milestones.ts:28-42`): only `achieved=false` AND `unlock_date_utc` set AND `>= now - 1 day` (1-day lookback so "happens today/yesterday" still surfaces in the timeline card).

### 5.5 Event occurrence cancelled flag
`event_occurrences.cancelled` defaults false (`0001_initial_schema.sql:56`). `listOccurrencesInRange` filters by `cancelled=false` by default (`src/repositories/occurrences.ts:13, 21`).

### 5.6 Account active flag
`member_accounts.active` defaults true. `setAccountActive(id, false)` (`src/repositories/accounts.ts:141-147`) — toggle. Inactive accounts pass `private.is_admin()` / `is_voting_member()` / `is_ally()` checks as **false** (each helper has `AND active` clause — see §1.2). So inactive admin = effectively no permissions until reactivated.

UI prevents self-deactivation (see §1.6).

### 5.7 Admin mode (UI shell toggle)
`src/contexts/AdminModeContext.tsx`:
- `adminMode` bool persisted in `localStorage` key `'dad.adminMode'` (`32`)
- `enter()`, `exit()`, `toggle()` actions (`56-72`)
- Auto-exits when user signs out OR loses admin role (`77-81`): `if (adminMode && auth.status === 'signed-in' && !auth.isAdmin) exit()`
- Auto-enters when navigating to `/admin/*` AND user is admin (`src/App.tsx:103-112`)
- This is **NOT a permission gate** — comment line 13-14: *"Admin mode is a UI shell toggle (not a permission gate — auth.isAdmin still controls that)."*

### 5.8 Push subscription state
- Insert/Upsert sets `active=true` and `last_used_at=NOW()` (`src/repositories/pushSubscriptions.ts:88-103`)
- Unsubscribe in browser: `unsubscribePush()` then `removeSubscription(endpoint)` — DELETE (`src/repositories/pushSubscriptions.ts:109-115`, `src/hooks/usePushSubscription.ts:93-108`)
- Edge function marks `active=false` on 404/410 (`send-push/index.ts:248-251`) — stale endpoint stays in DB but is excluded from fan-out

---

## 6. Notifications / push fan-out logic

### 6.1 Audience expansion
`supabase/functions/send-push/index.ts:66-77`:

```ts
function audienceRoles(audience): string[] | null {
  switch (audience) {
    case "voting":  return ["member", "r2", "r3", "r4", "r5"]
    case "admins":  return ["r4", "r5"]
    case "allies":  return ["ally"]
    default:        return null  // 'all' or 'custom'
  }
}
```

Logic in main loop (`147-185`):
- `audience='all'` → no role filter, all active subscriptions
- `audience='custom'` → filter subscriptions where `account_id IN custom_account_ids`; if empty list, mark sent and skip (lines 156-163)
- Otherwise: query `member_accounts` for matching role IDs, then filter subscriptions (`165-185`)

### 6.2 Subscription filtering
All fan-out queries filter `active = true` on `push_subscriptions` (`send-push/index.ts:154`).

### 6.3 Bell panel client-side filtering (mirror)
`src/hooks/useMyNotifications.ts:108-121`:
```ts
const audienceFilters = ['audience.eq.all', `and(audience.eq.custom,custom_account_ids.cs.{${accountId}})`]
if (role in {member,r2,r3,r4,r5}) audienceFilters.push('audience.eq.voting')
if (role in {r4,r5}) audienceFilters.push('audience.eq.admins')
if (role === 'ally') audienceFilters.push('audience.eq.allies')
```
Plus `.not('sent_at','is',null).eq('cancelled', false)` — only actually-delivered, non-cancelled messages.
Order: `.order('sent_at', { ascending: false }).limit(20)`.

### 6.4 Delivery budget
`MAX_DELIVERIES_PER_INVOCATION = 500` (`send-push/index.ts:44`). Each cron tick sends at most 500 push events; leftover messages picked up next tick.

### 6.5 Per-delivery TTL
`webpush.sendNotification(..., { TTL: 60 * 60 * 24 })` — 24 hours (`send-push/index.ts:228`).

### 6.6 Endpoint cleanup
Subscriptions returning HTTP 404 or 410 from the push provider are deactivated:
```ts
if (status === 404 || status === 410) {
  await supabase.from("push_subscriptions").update({ active: false }).eq("id", sub.id);
}
```
(`send-push/index.ts:248-251`)

### 6.7 Delivery telemetry
Every attempt (success or failure) inserts a row into `push_message_deliveries` (`send-push/index.ts:210-258`):
- `delivered_at` set on success; `error` set on failure
- `attempted_at` default NOW()
- `opened_at` left null — not populated by code currently (would need SW open handler — **gap**)

### 6.8 Cron schedule
- Configured via Supabase pg_cron — *not in repo migrations*. HANDOFF.md§5 references "DEPLOY.md §Cron schedule" for the exact SQL.
- WAR_ROOM_LOG.md§0 confirms: *"pg_cron firing every minute → send-push v6 (verify_jwt=false) → 200"*
- Edge function deployed with `verify_jwt=false` (HANDOFF.md§0.9 wave 11 + WAR_ROOM_LOG.md line 14)

### 6.9 Notification bell unread tracking
LocalStorage `'war-room.last_seen_notification_at'` ISO timestamp (`src/hooks/useMyNotifications.ts:31`). Compares to message `sent_at ?? created_at`. `markAllAsSeen()` writes `new Date().toISOString()`.

### 6.10 Recent push messages aggregation
`src/repositories/notifications.ts:135-168`:
- Fetch last 20 push_messages
- Separately fetch `push_message_deliveries` for those message_ids
- Aggregate counts in JS:
  - `delivered` = count where `delivered_at IS NOT NULL`
  - `opened` = count where `opened_at IS NOT NULL`

---

## 7. i18n behavior

### 7.1 Don't-translate list
`scripts/i18n/dont-translate.json` — 3 matching modes (line 2 description):

**`exact`** (whole-string match) — entries include:
- Brand / proper nouns: `DAD`, `DAD War Room`, `DAD BIGDADDYS`, `[DAD] BIGDADDYS`, `BIGDADDYS`, `Salles`, `Kingshot`
- Game systems: `Truegold`, `Truegold Dust`, `Truegold Tempered`, `War Academy`, `Hero Hall`, `Crucible`, `Foundry`, `Fog`, `PvP`
- Troop tiers: `T1`-`T10`, `TG1`-`TG8`, `T1..T10`
- Ranks: `R1`-`R5`, `R2 Officer`, `R3 Officer`, `R4 — Admin`, `R5 — Admin`, `Alpha (R2)`, `Enforcerer (R3)`, `Lieutenant (R1)`, `Supreme (R4)`
- Events: `Bear Hunt`, `Bear Hunt 1`, `Bear Hunt 2`, `KvK`, `Castle Battle`, `Viking Vengeance`, `Tri-Alliance`, `Tri-Alliance Clash`, `Cesar's Fury`, `Swordland Showdown`, `Lunar`, `Lunar Festival`
- Tech: `Markdown`, `Tiptap`, `Discord`, `Imgur`, `Vercel`, `Supabase`, `GitHub`, `VAPID`, `PWA`, `Progressive Web App`
- Locales: `UTC`, `Notif.`, `Chat`
- Misc: `Kingdom 1652`, `Reino 1652`, `—`, `·`, `alice`, `ex: shen-yu`, `your_handle`, `#2`, `1-8`, `25-30`, `Joiner`, `Leader`, `Standby`, `Min`, `Sec`, `Nick`
- Template literals with interpolation: `lvl {{level}}`, `Lv.{{level}} · {{tier}}`, `Building lv {{lv}}`, `Hero: {{slug}}`, `Pet: {{slug}}`, `Gen {{gen}}`, `Generation {{gen}}`, `TG {{level}}`

**`regex`** (test against value): `^DAD\b`, `^Kingdom\s+\d+$`, `^Reino\s+\d+$`, `^\[DAD\]`, `^TG\s*\d+$`, `^T\s*\d+$`, `^R[1-5]$`

**`substring`** (case-insensitive contains): `BIGDADDY`, `GRANDÃO`, `GRANDAO`, `PAPAI`, `PAPAIZ`

**Also-skip rules** (line 100 note): pure URLs/paths, pure interpolations (`{{var}}` only), single non-alphabetic chars.

### 7.2 Browser auto-translate blocked
`index.html`:
- `<html lang="en" translate="no">` (line 2)
- `<meta name="google" content="notranslate" />` (line 11)
- Comment line 7-10: blocks Chrome/Edge/Safari auto-MT to prevent brand-name mangling (e.g. "DAD BIGDADDYS" → "PAPAI GRANDÃOS")

### 7.3 Supported languages (11)
`src/i18n.ts:20-22`:
```ts
['en', 'pt', 'es', 'fr', 'de', 'ru', 'tr', 'ar', 'zh', 'ko', 'ja']
```
- Each locale file has identical structure: 1658 lines per file at parity (`wc -l src/locales/*.json` confirms)
- HANDOFF.md§0 reports "1107 keys" post Wave 15; HANDOFF.md§2 reports "1074 keys post-translation"
- `fallbackLng: 'en'` (`src/i18n.ts:41`)
- Detection order: `localStorage` → `htmlTag` (`src/i18n.ts:48-51`)
- `LANGUAGE_STORAGE_KEY = 'dad-war-room.lang'` (`src/i18n.ts:17`)

### 7.4 RTL handling
`src/i18n.ts:55-63`:
```ts
const RTL_LANGS = new Set<string>(['ar'])
// On languageChanged: set document.documentElement.dir = 'rtl' | 'ltr'
```
Only Arabic is RTL.

### 7.5 Overflow defense
`src/components/I18nText.tsx:36-66`: wraps translated strings with `truncate` / `line-clamp-2` / `line-clamp-3` based on `maxLines` prop. Sets `title={text}` so truncated labels are still discoverable on hover.

### 7.6 Push subscription locale propagation
`src/repositories/pushSubscriptions.ts:121-131`: `updateLanguage(accountId, langCode)` updates ALL the user's `push_subscriptions` rows on i18n change — so the edge function picks the right copy without per-device updates.

### 7.7 Translation pipeline rule
HANDOFF.md§3: *"The script only fills where `target.value === en.value`."* Manual translations are never overwritten — re-running `npm run i18n:translate` is safe.

---

## 8. Cross-cutting rules

### 8.1 SECURITY DEFINER helpers in private schema
`supabase/migrations/20260615040409_audit_move_security_definer_to_private_schema.sql` moved `is_admin / is_voting_member / is_ally / account_role` to schema `private` so signed-in users can't call them via REST `/rest/v1/rpc/<name>`. Public schema retains SECURITY INVOKER wrappers.

Critical follow-up: `20260615053721_grant_private_schema_usage_to_authenticated.sql` grants `USAGE ON SCHEMA private TO authenticated, anon` — without it, all admin writes 403'd silently. Memory note `lesson_supabase_private_schema_usage.md` flags this.

### 8.2 RLS GRANT requirement (independent of policies)
`20260615015257_fase_b_grant_table_privileges.sql` — comment lines 7-16:
> *"RLS bypass on service_role is SEPARATE from table privileges: even with BYPASSRLS, you still need GRANT or you hit 'permission denied for table'. Same for `authenticated`: even if an RLS policy allows the write, no GRANT means PostgREST returns 401/permission denied at the GRANT layer."*

`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated/service_role` (`29-32`) so future `CREATE TABLE` doesn't repeat the gotcha.

### 8.3 Telemetry never blocks UX
`src/repositories/loginEvents.ts:18-37`: `recordLoginEvent()` swallows all errors via try/catch + console.warn — must NEVER block login flow.

`src/repositories/analytics.ts` is read-only and parallelized.

### 8.4 Member display ordering convention
All "list" repos order by `display_order ASC`:
- `members` (`src/repositories/members.ts:36`)
- `heroes` (`src/repositories/heroes.ts:21`)
- `pets` (`src/repositories/pets.ts:14`)
- `troop_tiers` (`src/repositories/troopTiers.ts:9`)
- `kingdom_milestones` (`src/repositories/milestones.ts:14`)
- `events` (`src/repositories/events.ts:7`)

Exception: `masters` orders by `unlock_order ASC` (`src/repositories/masters.ts:16`).

New members appended: `createMember` (`src/repositories/members.ts:128-153`) computes `MAX(display_order) + 1`.

### 8.5 Slug generation
`src/repositories/polls.ts:35-43` — NFKD normalize, strip combining marks, lowercase, non-alphanumeric → `-`, trim, max 60 chars. Collision retry: `${baseSlug}-${random.toString(36).slice(2,5)}` up to 4 times.

### 8.6 UTC everywhere
HANDOFF.md§8: *"UTC everywhere in DB and UI label."* DB columns named `*_utc` (e.g. `starts_at_utc`, `unlock_date_utc`) reinforce this. Power snapshots written by trigger use `now()` (DB UTC).

### 8.7 Soft delete pattern
- `events.archived_at` + `status='archived'` rather than DELETE (`src/repositories/events.ts:40-42`)
- `members.status='left'` rather than DELETE (`src/repositories/members.ts:156-163`)
- `member_accounts.active=false` rather than DELETE (`src/repositories/accounts.ts:141-147`)
- `push_subscriptions.active=false` on stale endpoint (rather than DELETE)
- `polls.status='archived'` rather than DELETE (`src/repositories/polls.ts:217-221`)

But also `deleteEvent`, `deletePoll`, `deletePet`, `deleteHero`, `deleteMaster`, `deleteTroopTier`, `deleteMilestone`, `deleteOccurrence` all exist as hard DELETE — admin uses them when needed.

### 8.8 power_m trigger snapshots
`20260616060557_members_power_snapshots.sql:18-32`: trigger `members_power_snapshot_trg` AFTER UPDATE on `members` inserts a snapshot row whenever `power_m` OR `tg_level` changes. Frontend never INSERTs to `member_power_snapshots` directly — read-only (`src/repositories/memberSnapshots.ts:1-27`).

### 8.9 Touch updated_at trigger
`public.touch_updated_at()` (`20260615005744_fase_b...sql:139-144`) applied via `BEFORE UPDATE FOR EACH ROW` on: `member_accounts`, `members`, `polls`. Two parallel implementations exist (`tg_set_updated_at` from `0001_initial_schema.sql:91-97` for `events`, `kingdom_milestones`).

### 8.10 Member-to-roster adapter
`src/lib/memberAdapter.ts` — adapts DB `Member` (lowercase ranks, camelCase) → UI `RosterMember` (uppercase ranks, snake_case). Filters out `status='left'` for public view (`41`).

### 8.11 Display order convention
`display_order INTEGER NOT NULL DEFAULT 100` is the project-wide convention (e.g. `0001_initial_schema.sql:35, 75`, `20260616060625_game_catalogue_schema.sql:19, 34`).

### 8.12 alliance_settings singleton
`alliance_settings.singleton boolean NOT NULL DEFAULT true`, UNIQUE index `WHERE singleton = true` — enforces exactly one row (`20260616044907_alliance_settings_singleton.sql:8-21`). `updateAllianceSettings` reads the singleton, then UPDATEs by id (`src/repositories/allianceSettings.ts:35-65`). Seed inserts default row only if missing (`33-35`).

### 8.13 Email confirmation skipped
`create-account/index.ts:113`: `email_confirm: true` — auth users created via this path never receive a confirmation email. Synthetic `@dad-war-room.local` emails wouldn't deliver anyway.

### 8.14 No password_temporary enforcement
`20260615012214_fase_b_disable_force_password_change.sql` flipped default to `false` and reset all existing rows to `false`. Reset edge function also leaves it `false` (`reset-password/index.ts:71-72`). The column is kept but **not used as a gate anywhere** in code — `grep` finds no UI check on this field. **Effectively a dead column** unless re-enabled.

### 8.15 Account row map
- `member_accounts` = login + app permission (role, displayName, language)
- `members` = in-game roster (nick, power, alliance rank, subgroup)
- `member_accounts.member_id` FK to `members.id`, nullable (an ally has no `member_id`; an unlinked member account has none until admin links it)
- FK `ON DELETE SET NULL` so when a member leaves and is hard-deleted from `members`, account stays as "unlinked" (`20260615021304_fase_c_members_roster.sql:99-108`)

---

## 9. Rules NOT yet enforced (gaps)

### 9.1 Login rate-limiting (app level)
HANDOFF.md§0.5 item 7: *"Login rate-limit via Supabase Dashboard auth settings"* — open todo. SESSION_LOG_2026-06-17.md line 330-331, 459-460, 495-496 all confirm this is **deferred to Supabase Dashboard config, not code**. No code-level rate limit exists.

### 9.2 r4 → r5 promotion at DB layer
The "only r5 can create r5" rule is enforced **only in the create-account Edge Function** (`supabase/functions/create-account/index.ts:87-89`). RLS `member_accounts_insert/update` policies just check `is_admin()` — an r4 calling direct INSERT/UPDATE via PostgREST could mint or promote to r5. The Edge Function is the single chokepoint. Direct UPDATE of `role` field on an existing user has no role-check beyond `is_admin()`.

### 9.3 Chat backend
HANDOFF.md§4: *"Chat translation (FUTURE Fase 9 — not implemented yet)"*. The `Chat` page exists as a coming-soon stub (referenced WAR_ROOM_LOG.md§2). No `chat_messages` table, no message RLS, no rate limit. `AdminChat` settings page (rate limit, attachments, max file size) writes to `localStorage` per WAR_ROOM_LOG.md line 122 — *"localStorage-backed today, swaps to chat_settings table when chat ships"*.

### 9.4 Push opened_at telemetry
`push_message_deliveries.opened_at` column exists but is never written by code. Would need SW notification-click handler to mark. UI uses it for "opened" counts (`src/repositories/notifications.ts:153-163`) but counts will always be 0 in practice.

### 9.5 Self-deactivation only blocked in UI
`AdminAccounts.tsx:222-225` prevents deactivating yourself via UI, but a self-targeted UPDATE in repo `setAccountActive(myId, false)` would succeed (admin RLS allows it; "update_self" RLS also allows it as long as role doesn't change). No DB-level guard against an admin deactivating themselves.

### 9.6 Last-admin protection
No rule prevents the last active r4/r5 from being deactivated, demoted, or deleted. CLAUDE.md context for the SISTER project (ler-liberta) calls this out as a critical rule — the DAD War Room codebase **does not** implement it.

### 9.7 Vote-while-draft / vote-while-archived
RLS denies inserts when poll status != 'open', so the case is handled. But the UI also bears responsibility: `canVote = open && auth.isVotingMember` (`src/pages/PollDetail.tsx:350`). If RLS were somehow bypassed (it isn't — defense in depth here is solid), no client-only fallback exists.

### 9.8 Custom audience IDs not validated
`AdminNotifications.tsx` doesn't expose a "custom" audience picker in the visible draft. `custom_account_ids` is `uuid[]` with no FK constraint — an admin (or buggy client) could insert IDs that don't exist in `member_accounts`. Edge function gracefully treats unknown IDs as no-recipient (`send-push/index.ts:156-163`).

### 9.9 Poll closes_at not enforced as future-only
`createPoll` accepts any `closes_at` value, including past dates. A poll could be created with `status='open'` AND `closes_at` already in the past — `isPollOpen` would immediately return false. No validation prevents this.

### 9.10 i18n parity check is manual
HANDOFF.md§2 ships a parity check via shell loop counting keys. CI does not run it — drift between locales is possible if a key is added to en.json without rerunning the translation script.

### 9.11 Username uniqueness case
DB enforces `lower(username)` UNIQUE (`member_accounts_username_lower_idx`). Edge Function lowercases input before insert (`create-account/index.ts:91`). But the `username` column itself only has UNIQUE on raw value (line 34) — both are enforced together, so this is consistent. No gap, just worth noting the dual constraint.

### 9.12 Markdown sanitizer is custom-built
`src/lib/markdown.ts` is a hand-rolled converter that escapes all HTML and only handles a small subset (bold/italic/code/links/lists). Stricter than DOMPurify but also won't process arbitrary safe HTML. Designed for poll descriptions only. The Tiptap-authored milestone content uses DOMPurify via `src/lib/sanitize.ts` — two separate paths.

### 9.13 No quorum / minimum-voter rule on polls
Polls close automatically only by `closes_at`. No "minimum N votes required" or "X% turnout" rule.

### 9.14 No vote-change limit
A voting member can change their single-vote pick unlimited times (DELETE-then-INSERT — `src/repositories/polls.ts:169-181`) until the poll closes.

### 9.15 No audit log
Admin actions (account create / role change / poll edit / member delete) are not logged. `login_events` only tracks signin/signout/password_change/failed_signin/pwa_install/pwa_uninstall.

### 9.16 No data-retention / expiration
- PDFs / images in storage: no TTL
- `member_power_snapshots`: retained forever (queries cap at 365 via `listSnapshotsForMember(memberId, limit=365)`)
- `login_events`: no purge
- `push_message_deliveries`: no purge
- HANDOFF.md§0.5 doesn't mention this — accepted state for v1.

### 9.17 Mythic gen 7 widget icon
By design fallback to gen 6 art (see §3.11). Comment line 198-200 marks this explicitly as a temporary workaround.

### 9.18 PendingPollsCard counts polls that the user *can* vote on but doesn't enforce ally exclusion at fetch
`listPollsPendingVote` (`src/repositories/polls.ts:267-278`) accepts any `accountId` and returns polls they haven't voted on. The hook (`src/hooks/usePolls.ts:67-121`) gates with the `voting: boolean` argument from the caller. If a caller passes `voting=true` for an ally, the query would still run. UI guard at `PendingPollsCard.tsx:29` covers this in practice.

### 9.19 No "leaving alliance" workflow
`members.status='left'` exists but there's no UI flow to handle: account becomes member-less (member_id null) but role remains 'member'. Admin would need to manually convert to 'ally' or deactivate.

### 9.20 Push payload size not validated
`send-push/index.ts:200-208` JSON-encodes `{ title, body, emoji, image, tap_target, tap_url, message_id }`. Web Push payload limit is ~4KB but no client/server check warns when title+body exceed (240+60 char caps don't account for emoji/URLs). In practice the UI caps avoid overflow.

---

## 10. Consequences of changing each rule

### 10.1 `isAdmin = r4 || r5` (`src/hooks/useAuth.ts:31`)
If you add a new admin role: **27 RLS policies** referencing `is_admin()` (per-verb policies in `20260616044611...sql`, `20260616044704...sql`, `0002_rls_policies.sql`, `20260615021304_fase_c...sql`, `20260615032838_fase_d_polls_system.sql`, `20260615033958_fase_d_polls_full_spec.sql`, `20260616051723_storage_buckets...sql`, `20260616054801_push_notifications_schema.sql`, `20260616060607_event_participants.sql`, `20260616060625_game_catalogue_schema.sql`, `20260616044907_alliance_settings_singleton.sql`, `20260616051612_alliance_settings_policy_split.sql`) all redefine through `private.is_admin()`. Update the SQL helper in **one place** — `20260615040409_audit_move_security_definer_to_private_schema.sql:29-38`. The TS flag derivation must also be updated. ProtectedAdminRoute and AdminMode auto-exit logic both read from `auth.isAdmin`.

### 10.2 Star shard / skill book / widget costs
Used in:
- `src/pages/HeroDetail.tsx:698, 716, 733-736` (Hero detail cost table)
- `summarizeHeroCosts()` (`src/data/hero-upgrade-costs.ts:140-173`)

Pure data — bumping the constants only changes display. No server-side checks against these values; players read them to plan upgrades.

### 10.3 Roster (34 heroes)
Adding/removing heroes:
- Frontend: update `src/data/heroes-roster.ts` arrays
- DB `heroes` table is separate — `AdminHeroes.tsx` creates rows independently; rosters not auto-synced
- `src/data/icon-library.ts` imports `RARE_HEROES, EPIC_HEROES, MYTHIC_GENERATIONS` for icon picker groups (line 17-19) — IconPicker breaks if a hero is removed without updating
- DB constraint `heroes.generation BETWEEN 1 AND 12` (`20260616060625_game_catalogue_schema.sql:13`) — gen 8+ already allowed at DB level

### 10.4 `is_voting_member` role list (`'member','r2','r3','r4','r5'`)
Defined in:
- `private.is_voting_member()` SQL (`20260615040409_audit...sql:40-49`)
- TS `deriveFlags` (`src/hooks/useAuth.ts:32-37`)
- `audienceRoles('voting')` in send-push edge function (`send-push/index.ts:68-69`)
- `useMyNotifications` audience filter (`src/hooks/useMyNotifications.ts:113-114`)

Adding/removing a role requires updates in all 4 places. The SQL function is the security boundary; the TS values are display.

### 10.5 `poll_votes` RLS conditions (`status='open' AND closes_at > NOW()`)
Defined in `20260616044704_perf_consolidate_remaining_admin_self_overlaps.sql:30-62` (both `poll_votes_delete` and `poll_votes_insert`). Mirror in TS `isPollOpen()` (`src/repositories/polls.ts:240-244`). Changing the DB rule without updating the TS predicate leads to UI buttons that appear enabled but fail at the server — confusing UX.

### 10.6 SYNTHETIC_EMAIL_DOMAIN (`@dad-war-room.local`)
`src/repositories/auth.ts:6` AND hardcoded in `supabase/functions/create-account/index.ts:102`. If you change the domain, you must update both places AND all existing rows in `auth.users` need email rewrite (otherwise users can't sign in). High blast radius — treat as immutable.

### 10.7 Storage bucket limits
Bucket limits defined twice:
- DB: `supabase/migrations/20260616051723_storage_buckets_avatars_notifications_milestones.sql:11-19` (file_size_limit + allowed_mime_types)
- Client: `src/repositories/storage.ts:30-43`

Mismatch = client-side rejection or server-side rejection (different error UX). Keep both in sync.

### 10.8 `MAX_DELIVERIES_PER_INVOCATION = 500`
Bumping this raises per-invocation latency AND web-push outbound bandwidth. If pg_cron fires every minute, the system can sustain ~30K deliveries/minute peak. Don't lower without ensuring the messages queue can drain.

### 10.9 Push TTL (24h)
Lowering: missed pushes drop sooner. Raising: provider rejects > 4 weeks. 24h is conservative for a war-room app where stale push events are usually irrelevant.

### 10.10 Member ordering (`display_order ASC`)
The order mirrors the in-game alliance window per the migration comment. Re-ordering randomly will confuse Salles + Council. Always preserve existing values when bulk-inserting; use `(MAX(display_order)+1)` for new rows (`createMember` already does this).

### 10.11 Power snapshot trigger (`tg_member_power_snapshot`)
Defined in `20260616060557_members_power_snapshots.sql:18-27`. Fires AFTER UPDATE on `members` whenever `power_m` OR `tg_level` changes. Disabling: power chart loses new data points; old points remain. Re-enabling later resumes capture but doesn't backfill the gap.

### 10.12 `card-hero` vs `card-elev`
HANDOFF.md§8 cheat-sheet: *"Use `card-hero` for hero panels, NOT `card-elev` (legacy with milky cream layer)."* Style-only — won't break logic but will visually diverge.

### 10.13 `data_real_atividade` / `requer_upload_pdf` / etc
These references in the system prompt's `claudeMd` block are from a **DIFFERENT project** (ler-liberta — `/Users/yagosales/Documents/Dev/ler-liberta/`). They do **not** apply to DAD War Room (`/Users/yagosales/Documents/Kingshot/DADkingshot/dad-guides`). Cross-project pollution — ignore for this catalogue.

### 10.14 Locale parity
HANDOFF.md§0: "11 locales × 1107 keys at parity". Adding a key only to en.json without running `npm run i18n:translate` leaves other locales falling back to the key string itself (cosmetic ugliness; no functional break). CI does not enforce parity.

### 10.15 `record_login_event` SECURITY DEFINER
Anon callers restricted to `failed_signin` with NULL account_id (`20260616051634_record_login_event_anon_restrict.sql:25-31`). Relaxing this opens a write surface — anon could spam any event type. The advisor warning is intentional per HANDOFF.md§6.

### 10.16 Username regex `/^[a-z0-9._-]{2,32}$/`
Defined only in `create-account/index.ts:95`. If you allow uppercase / longer / special chars: legacy users not affected, but might break URL routing or display assumptions. The synthetic email domain (`@dad-war-room.local`) puts a hard cap of ~64 chars total per RFC.

### 10.17 Poll min/max options (2-12)
`MIN_OPTIONS = 2`, `MAX_OPTIONS = 12` at `src/pages/admin/AdminPolls.tsx:38-39`. Also enforced in repo (`createPoll`: line 108-110 throws if < 2 options). Raising max requires UI redesign (the option list becomes cramped). Lowering below 2 makes "poll" meaningless.

### 10.18 Hero-exclusive shards (Amadeus, Helga)
`HERO_EXCLUSIVE_SHARDS = new Set(['Amadeus', 'Helga'])` (`hero-upgrade-costs.ts:49`). String-match by hero name (case-sensitive). If hero data uses different casing, the check silently fails. Hero name source: `src/data/heroes-roster.ts` `fallbackName` field — `Amadeus`, `Helga` strings match exactly.

### 10.19 Widget chest gen fallback (clamp 2-6)
`Math.min(6, Math.max(2, generation))` — gen 7+ always becomes gen 6. When new widget chest art ships for gen 7+, update the clamp.

### 10.20 `LANGUAGE_STORAGE_KEY = 'dad-war-room.lang'`
Changing this key means existing PWA installs lose their language preference once and fall back to browser detection. Acceptable but generates user feedback.

### 10.21 Admin self-protection (`cantDeactivateSelf`)
UI-only (`src/pages/admin/AdminAccounts.tsx:222-225`). Direct API call bypasses it. If an admin self-deactivates by mistake (or maliciously), only another admin can reactivate — and if it was the last admin, you'd need DB superuser intervention. **Hardening recommendation noted in §9.6.**

### 10.22 `audience` enum
DB CHECK `audience IN ('all','voting','admins','allies','custom')` (`20260616054801_push_notifications_schema.sql:28`). Adding new audience requires:
1. DB CHECK update (migration)
2. `audienceRoles()` in `send-push/index.ts:66-77`
3. `audienceFilters` in `src/hooks/useMyNotifications.ts:108-121`
4. `AUDIENCE_LABEL_KEYS` in `AdminNotifications.tsx:44-50` + matching i18n keys in all 11 locales
5. `PushAudience` type in `src/repositories/notifications.ts:7`

### 10.23 `tap_target` enum
DB CHECK `IN ('hub','events','polls','alliance','url')` (`20260616054801...sql:30`). Adding requires UI deep-link routing logic + i18n labels + type union update. UI default = 'hub'.

### 10.24 `kingdom_milestones` category enum (9 values)
`'truegold' | 'heroes' | 'pets' | 'pvp' | 'feature' | 'master' | 'fog' | 'war-academy' | 'other'`. Adding new category requires DB ENUM ALTER (PostgreSQL: irreversible add-value), TS type update, milestone icon resolver update, admin form select option.

### 10.25 Members power_m precision (numeric(7,1) → max 9,999,999.9M)
Max power expressible: 9.99 trillion. Realistic for v1; if game inflation surpasses, ALTER TABLE.