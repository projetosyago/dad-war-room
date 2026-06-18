# DAD War Room — Database Schema

> Generated 2026-06-18 from `supabase/migrations/*.sql` (34 migrations).
> Project: `ilogsrlbenhdzkfgexvt` on Supabase. PostgreSQL 15. RLS enabled on every table.
>
> Per project memory ([Wave 10 audit remediation], 2026-06-16): all 34 migrations
> are confirmed applied to the remote project. Migrations `0006`–`20260616060647`
> were backfilled from the remote DB into `supabase/migrations/` after a drift
> incident.

---

## Migration ledger

| # | Filename | Purpose |
|---|---|---|
| 1 | `0001_initial_schema.sql` | Core schema: `admin_users`, `events`, `event_occurrences`, `kingdom_milestones`; `event_status` / `milestone_category` enums; `tg_set_updated_at()` trigger; first `is_admin()`. |
| 2 | `0002_rls_policies.sql` | Enable RLS + public-read / admin-write policies on the four initial tables. |
| 3 | `0003_seed_data.sql` | Seed 8 events + 37 kingdom milestones. |
| 4 | `0004_security_hardening.sql` | Lock function `search_path`; switch `is_admin()` to SECURITY INVOKER (later reversed in Fase B). |
| 5 | `0005_grants_base_privileges.sql` | Grant table-level SELECT/INSERT/UPDATE/DELETE to `anon`/`authenticated` so PostgREST can serve `/rest/v1/*`. |
| 6 | `0006_wave9_covering_indexes.sql` | FK covering indexes on `event_participants.added_by`, `member_power_snapshots.recorded_by`. |
| 7 | `0007_wave10_remaining_fk_covering_indexes.sql` | FK covering indexes on 8 hot paths flagged by performance advisor. |
| 8 | `20260615005744_fase_b_member_accounts_and_role_system.sql` | **Fase B**: `member_accounts`, `login_events`; `account_role` / `login_event_type` enums; SECURITY DEFINER role helpers (`account_role`, `is_admin`, `is_voting_member`, `is_ally`); `touch_updated_at()` trigger. |
| 9 | `20260615005852_fase_b_harden_touch_updated_at.sql` | Set `search_path = ''` on `touch_updated_at()`. |
| 10 | `20260615012214_fase_b_disable_force_password_change.sql` | Default `password_temporary` to false; reset stale flags. |
| 11 | `20260615015257_fase_b_grant_table_privileges.sql` | Grants on `member_accounts`/`login_events`/`admin_users` + default privileges for future tables. |
| 12 | `20260615021304_fase_c_members_roster.sql` | **Fase C**: `members` roster table; `alliance_rank` / `member_subgroup` / `member_status` enums; FK `member_accounts.member_id → members.id`. |
| 13 | `20260615032838_fase_d_polls_system.sql` | **Fase D**: `polls`, `poll_options`, `poll_votes`; `poll_type` enum; full RLS for vote/re-vote workflow. |
| 14 | `20260615033958_fase_d_polls_full_spec.sql` | Polls full spec: `poll_status`/`results_visibility` enums; `status`/`opens_at`/`closed_at`/`share_token`/`results_visibility` columns; drops legacy `results_visible_during_voting`. |
| 15 | `20260615040409_audit_move_security_definer_to_private_schema.sql` | Move SECURITY DEFINER helpers into `private` schema; keep thin SECURITY INVOKER wrappers in `public`. |
| 16 | `20260615052019_milestones_body_html.sql` | Add `kingdom_milestones.body_html` (Tiptap rich content). |
| 17 | `20260615053721_grant_private_schema_usage_to_authenticated.sql` | `GRANT USAGE ON SCHEMA private TO authenticated, anon` (fixes 403s on admin writes — see Lesson "Supabase private schema USAGE"). |
| 18 | `20260615053754_milestones_icon_url.sql` | Add `kingdom_milestones.icon_url`. |
| 19 | `20260616044514_perf_add_fk_indexes.sql` | FK indexes on `event_occurrences.created_by`, `events.created_by`, `member_accounts.created_by`, `poll_votes.option_id`, `polls.created_by`, `polls.event_occurrence_id`. |
| 20 | `20260616044529_perf_admin_users_initplan_fix.sql` | Wrap `auth.uid()` in `SELECT` for initplan optimization on `admin_users` policy. |
| 21 | `20260616044611_perf_consolidate_overlapping_policies.sql` | Split `FOR ALL` admin policies into per-verb INSERT/UPDATE/DELETE on `member_accounts`, `members`, `polls`, `poll_options`, `poll_votes`. |
| 22 | `20260616044633_perf_drop_unused_indexes.sql` | Drop 12 unused indexes flagged by advisor. |
| 23 | `20260616044704_perf_consolidate_remaining_admin_self_overlaps.sql` | Merge admin + self policies on `member_accounts` UPDATE and `poll_votes` INSERT/DELETE. |
| 24 | `20260616044820_auth_telemetry_record_login_event.sql` | Add `record_login_event()` SECURITY DEFINER RPC. |
| 25 | `20260616044907_alliance_settings_singleton.sql` | `alliance_settings` singleton row + seed (rank `#2`, motto, brand colors). |
| 26 | `20260616051612_alliance_settings_policy_split.sql` | Split admin write policy into per-verb policies. |
| 27 | `20260616051634_record_login_event_anon_restrict.sql` | Restrict anon callers to `failed_signin` with NULL account. |
| 28 | `20260616051723_storage_buckets_avatars_notifications_milestones.sql` | Storage buckets `avatars`, `notification-images`, `milestone-bodies` + per-bucket policies. |
| 29 | `20260616054716_login_events_account_nullable.sql` | Make `login_events.account_id` nullable for anon failed-signin events. |
| 30 | `20260616054801_push_notifications_schema.sql` | `push_subscriptions`, `push_messages`, `push_message_deliveries` + RLS. |
| 31 | `20260616060557_members_power_snapshots.sql` | `member_power_snapshots` + `tg_member_power_snapshot()` AFTER UPDATE trigger. |
| 32 | `20260616060607_event_participants.sql` | `event_participants` (composite PK) + admin-write RLS. |
| 33 | `20260616060625_game_catalogue_schema.sql` | `heroes`, `pets`, `masters`, `troop_tiers`, `troop_tier_branch_icons`; `troop_branch` enum. |
| 34 | `20260616060647_game_catalogue_seeds.sql` | Seed 33 heroes, 18 troop tiers, 4 masters. |

---

## Schema overview

```
                                    auth.users (Supabase managed)
                                          │
                                          │ id = auth.users.id
                          ┌───────────────┼────────────────┐
                          ▼                                ▼
                  admin_users (legacy)           member_accounts
                                                       │
                                                  member_id (nullable)
                                                       ▼
                                                   members ──────────────┐
                                                       │                 │
                                                       ▼                 ▼
                                       member_power_snapshots    event_participants
                                              (AFTER UPDATE trigger)     │
                                                                         │
                                            ┌─── events ─────────────────┤
                                            │       │                    │
                                            │       ▼                    │
                                            │  event_occurrences ────────┘
                                            │       │
                                            │       │
                                            │       ▼
                                            │     polls ── poll_options ── poll_votes
                                            │       │                          │
                                            │   (FK event_occurrence_id)       │ account_id
                                            │                                  ▼
                                            │                          member_accounts
                                            │
                                            ▼
                                     kingdom_milestones
                                     (no FKs out)

  member_accounts ──┬── login_events
                    ├── push_subscriptions ── push_message_deliveries ── push_messages
                    └── (created_by FKs on polls, events, occurrences…)

  alliance_settings  (singleton, no FKs)
  heroes / pets / masters / troop_tiers / troop_tier_branch_icons (catalogue, no FKs to roster)
```

---

## Schemas

- `public` — all application tables, RLS-protected, exposed via PostgREST.
- `private` — SECURITY DEFINER role-check helpers (`is_admin`, `is_voting_member`,
  `is_ally`, `account_role`). Created in M15 to keep these out of the REST surface.
  `authenticated` and `anon` have `USAGE` on the schema (M17) so RLS policies that
  reference these functions resolve correctly.
- `auth` — Supabase-managed. Only `auth.users.id` is referenced (FK targets).
- `storage` — Supabase-managed. M28 adds buckets and per-bucket policies on
  `storage.objects`.

---

## Per-table documentation

### `admin_users`

- **Schema**: `public`
- **Purpose**: Legacy admin allowlist from M1, kept for the pre-Fase-B
  `public.is_admin()` codepath. The Fase B rewrite (M8/M15) ignores this table
  and consults `member_accounts.role ∈ {r4, r5}` instead; the table is still
  read by `repositories/auth.ts` for an ownership check.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | — | FK `auth.users.id ON DELETE CASCADE` |
  | `display_name` | TEXT | no | — | |
  | `ingame_nick` | TEXT | yes | — | |
  | `created_at` | TIMESTAMPTZ | no | `NOW()` | |
- **Primary key**: `id`
- **Foreign keys**: `id → auth.users(id)`
- **Indexes**: PK only
- **RLS policies**:
  - `admin_users_self_select` (M20-optimized): a row is visible only to its
    owner (`id = auth.uid()`).
- **Used by**: `src/repositories/auth.ts`
- **Notes**: Conceptually superseded by `member_accounts.role`. Do not add new
  rows here — use a Fase B account with `role = 'r4'` or `'r5'`.

---

### `events`

- **Schema**: `public`
- **Purpose**: Catalogue of recurring/seasonal game events (Bear Hunt, KvK,
  Viking Vengeance…). Each event can have many `event_occurrences`.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `slug` | TEXT | no | — | UNIQUE; URL identifier (`/bear-1`). |
  | `name` | TEXT | no | — | |
  | `short_name` | TEXT | yes | — | |
  | `description` | TEXT | yes | — | |
  | `icon_url` | TEXT | yes | — | |
  | `guide_route` | TEXT | yes | — | App route to the guide page (NULL = no guide yet). |
  | `status` | `event_status` | no | `'coming-soon'` | enum: active / coming-soon / archived. |
  | `display_order` | INTEGER | no | `100` | |
  | `accent_color` | TEXT | yes | — | Hex color for UI. |
  | `is_seasonal` | BOOLEAN | no | `false` | |
  | `created_at` | TIMESTAMPTZ | no | `NOW()` | |
  | `updated_at` | TIMESTAMPTZ | no | `NOW()` | Auto-touched by trigger. |
  | `archived_at` | TIMESTAMPTZ | yes | — | |
  | `created_by` | UUID | yes | — | FK `auth.users(id)`. |
- **Primary key**: `id`
- **Foreign keys**: `created_by → auth.users(id)`
- **Indexes**: `events_status_idx (status)`, `events_display_order_idx (display_order)`,
  `events_created_by_idx (created_by)` (M19), and the implicit unique index on `slug`.
- **RLS policies**:
  - `events_public_select` — anyone (`anon` + `authenticated`) can read all rows.
  - `events_admin_insert` / `events_admin_update` / `events_admin_delete` —
    only callers where `public.is_admin()` returns true (i.e. `member_accounts.role ∈ {r4, r5}`).
- **Used by**: `src/repositories/events.ts`
- **Triggers**: `events_set_updated_at` BEFORE UPDATE → `tg_set_updated_at()`.
- **Notes**: Seeded with 8 events in M3.

---

### `event_occurrences`

- **Schema**: `public`
- **Purpose**: Individual scheduled instances of an event (with start time,
  duration, optional phase label, optional iCal recurrence rule).
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `event_id` | UUID | no | — | FK `events(id) ON DELETE CASCADE`. |
  | `starts_at_utc` | TIMESTAMPTZ | no | — | |
  | `duration_minutes` | INTEGER | no | `30` | CHECK `> 0`. |
  | `phase_label` | TEXT | yes | — | e.g. "Prep" / "Castle Battle" / "Brawl" / "Final" for KvK. |
  | `notes` | TEXT | yes | — | |
  | `recurrence_rule` | TEXT | yes | — | iCal RRULE string (e.g. `FREQ=HOURLY;INTERVAL=48`). |
  | `cancelled` | BOOLEAN | no | `false` | |
  | `created_at` | TIMESTAMPTZ | no | `NOW()` | |
  | `created_by` | UUID | yes | — | FK `auth.users(id)`. |
- **Primary key**: `id`
- **Foreign keys**: `event_id → events(id) CASCADE`; `created_by → auth.users(id)`.
- **Indexes**: `event_occurrences_starts_at_idx`,
  `idx_event_occurrences_event_id` (M7),
  `event_occurrences_created_by_idx` (M19).
  *(`event_occurrences_event_idx` from M1 was dropped in M22 as unused.)*
- **RLS policies**: `occurrences_public_select` (open read); admin-only INSERT/UPDATE/DELETE.
- **Used by**: `src/repositories/occurrences.ts`, `src/pages/admin/AdminEventParticipants.tsx`
- **Notes**: Joined into `event_participants` (M32) and optionally referenced
  by `polls.event_occurrence_id`.

---

### `kingdom_milestones`

- **Schema**: `public`
- **Purpose**: Kingdom Timeline checkpoints (TG unlocks, hero/pet generations,
  PvP firsts, feature drops). Editable countdown dates, optional rich body.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `slug` | TEXT | no | — | UNIQUE. URL identifier. |
  | `name` | TEXT | no | — | |
  | `category` | `milestone_category` | no | — | enum: `truegold` / `heroes` / `pets` / `pvp` / `feature` / `master` / `fog` / `war-academy` / `other`. |
  | `unlock_date_utc` | TIMESTAMPTZ | yes | — | |
  | `notes` | TEXT | yes | — | |
  | `source_url` | TEXT | yes | — | |
  | `display_order` | INTEGER | no | `100` | |
  | `achieved` | BOOLEAN | no | `false` | |
  | `generation` | INTEGER | yes | — | For hero/pet milestones. |
  | `tg_level` | INTEGER | yes | — | For Truegold milestones. |
  | `created_at` | TIMESTAMPTZ | no | `NOW()` | |
  | `updated_at` | TIMESTAMPTZ | no | `NOW()` | Auto-touched. |
  | `body_html` | TEXT | yes | — | **Added M16**. Sanitized Tiptap HTML for `/timeline/:slug`. |
  | `icon_url` | TEXT | yes | — | **Added M18**. Optional per-milestone icon override. |
- **Primary key**: `id`
- **Foreign keys**: none
- **Indexes**: `kingdom_milestones_unlock_date_idx`,
  `kingdom_milestones_display_order_idx`, and implicit unique on `slug`.
  *(`kingdom_milestones_category_idx` from M1 was dropped in M22.)*
- **RLS policies**: public SELECT; admin-only INSERT/UPDATE/DELETE.
- **Used by**: `src/repositories/milestones.ts`
- **Triggers**: `kingdom_milestones_set_updated_at` BEFORE UPDATE.
- **Notes**: Seeded with 37 milestones in M3 (Gen 1–8 heroes/pets, TG3/5/8/10,
  Masters, PvP firsts, fog clears…).

---

### `member_accounts`

- **Schema**: `public`
- **Purpose**: Per-person login record. One row per `auth.users` entry. `role`
  determines what they can write. `member_id` optionally links the account to
  an in-game roster row (NULL for allies).
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | — | FK `auth.users(id) ON DELETE CASCADE`. |
  | `username` | TEXT | no | — | UNIQUE; user types this at `/login`; synthetic email = `username || '@dad-war-room.local'`. |
  | `display_name` | TEXT | no | — | |
  | `member_id` | UUID | yes | — | FK `members(id) ON DELETE SET NULL` (added M12). |
  | `role` | `account_role` | no | `'member'` | enum: `ally` / `member` / `r2` / `r3` / `r4` / `r5`. `r4`/`r5` are admins; `ally` is a read-only guest. |
  | `language_code` | TEXT | no | `'en'` | |
  | `avatar_hero_slug` | TEXT | yes | — | |
  | `avatar_image_url` | TEXT | yes | — | |
  | `active` | BOOLEAN | no | `true` | |
  | `password_temporary` | BOOLEAN | no | `false` (was `true` in M8, flipped in M10) | Kept but unused — force-change disabled. |
  | `first_login_at` | TIMESTAMPTZ | yes | — | Stamped by `record_login_event()` on first signin. |
  | `last_login_at` | TIMESTAMPTZ | yes | — | Updated on each signin. |
  | `pwa_installed_at` | TIMESTAMPTZ | yes | — | |
  | `created_by` | UUID | yes | — | FK `auth.users(id)`. |
  | `created_at` | TIMESTAMPTZ | no | `NOW()` | |
  | `updated_at` | TIMESTAMPTZ | no | `NOW()` | Auto-touched. |
- **Primary key**: `id`
- **Foreign keys**: `id → auth.users(id) CASCADE`; `member_id → members(id) SET NULL`;
  `created_by → auth.users(id)`.
- **Indexes**: `member_accounts_username_lower_idx` (UNIQUE on `lower(username)`);
  `idx_member_accounts_member_id` (M7); `member_accounts_created_by_idx` (M19).
  *(M22 dropped `member_accounts_role_idx`, `member_accounts_active_idx`,
  `member_accounts_member_id_idx`; the M7 covering index replaced the last.)*
- **RLS policies**:
  - `member_accounts_select` — any authenticated user reads all rows
    (needed for roster, chat author lookup, member tagging).
  - `member_accounts_update` (M23 merged self + admin) — caller may UPDATE
    if they're admin, or if updating their own row and not changing their own
    role (self-promotion blocked).
  - `member_accounts_admin_insert` / `_admin_delete` (M21) — admin-only.
- **Used by**: `src/repositories/accounts.ts`, `src/repositories/auth.ts`,
  `src/repositories/members.ts`, `src/repositories/analytics.ts`
- **Triggers**: `member_accounts_updated_at` BEFORE UPDATE → `touch_updated_at()`.
- **Notes**:
  - The repo layer filters allies out of "member list" responses; the UI tags
    ally rows with an ALLY chip.
  - `password_temporary` is preserved but defaults to false (M10) — admin
    resets/creates no longer force a password change.

---

### `login_events`

- **Schema**: `public`
- **Purpose**: Audit log of sign-ins, sign-outs, PWA installs, password changes,
  failed sign-ins. Drives the "who has logged in" admin panel.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `account_id` | UUID | **yes** (M29) | — | FK `member_accounts(id) ON DELETE CASCADE`. Nullable for anon `failed_signin` events. |
  | `event_type` | `login_event_type` | no | — | enum: `signin` / `signout` / `pwa_install` / `pwa_uninstall` / `password_change` / `failed_signin`. |
  | `user_agent` | TEXT | yes | — | |
  | `ip_hash` | TEXT | yes | — | |
  | `occurred_at` | TIMESTAMPTZ | no | `NOW()` | |
- **Primary key**: `id`
- **Foreign keys**: `account_id → member_accounts(id) CASCADE`
- **Indexes**: `idx_login_events_account_id` (M7).
  *(M22 dropped `login_events_account_idx` and `login_events_recent_idx`.)*
- **RLS policies**:
  - `login_events_select` — caller can read their own rows OR `is_admin()`.
  - `login_events_insert` — caller may insert rows where `account_id = auth.uid()`.
    (In practice, all writes go through the `record_login_event()` RPC.)
- **Used by**: `src/repositories/analytics.ts`
- **Notes**: M29 made `account_id` nullable so the `record_login_event()` RPC
  (M27/M29) can log anonymous failed-signin attempts. The RPC raises 42501 if
  an anon caller passes any other event type or a non-NULL `account_id`.

---

### `members`

- **Schema**: `public`
- **Purpose**: In-game alliance roster — one row per DAD member. Conceptually
  distinct from `member_accounts` (which is the *login*).
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `nick` | TEXT | no | — | In-game name; unique on `lower(nick)`. |
  | `rank` | `alliance_rank` | no | — | enum `r1`–`r5`. |
  | `subgroup` | `member_subgroup` | yes | — | enum `lieutenant` (R1) / `alpha` (R2) / `enforcerer` (R3) / `supreme` (R4); R5 has none. |
  | `power_m` | NUMERIC(7,1) | no | `0` | Power in MILLIONS, e.g. `158.7`. Range 0 → 9,999,999.9M (= 9.99T). |
  | `tg_level` | INTEGER | yes | — | CHECK 1–8. Mutually exclusive with `town_center_level`. |
  | `town_center_level` | INTEGER | yes | — | CHECK 1–30. |
  | `dad_tag` | TEXT | yes | — | `"prefix"` / `"suffix"` / NULL — where `[DAD]` goes in their nick. |
  | `tag_position` | TEXT | yes | — | |
  | `status` | `member_status` | no | `'active'` | enum: `active` / `temporary_out` / `left`. |
  | `status_note` | TEXT | yes | — | |
  | `lang_hint` | TEXT | yes | — | |
  | `note` | TEXT | yes | — | |
  | `display_order` | INTEGER | no | `0` | |
  | `created_at` | TIMESTAMPTZ | no | `NOW()` | |
  | `updated_at` | TIMESTAMPTZ | no | `NOW()` | Auto-touched. |
- **Constraint**: `members_tier_xor_tc` — `tg_level` and `town_center_level`
  cannot both be set on the same row.
- **Primary key**: `id`
- **Indexes**: `members_nick_unique` (UNIQUE on `lower(nick)`),
  `members_status_idx`, `members_display_order_idx`.
  *(M22 dropped `members_rank_idx` and `members_power_idx`.)*
- **RLS policies**:
  - `members_select` — any authenticated user reads all rows.
  - `members_admin_insert` / `_admin_update` / `_admin_delete` (M21).
- **Used by**: `src/repositories/members.ts`, `src/hooks/useMemberDetail.ts`
- **Triggers**:
  - `members_updated_at` BEFORE UPDATE → `touch_updated_at()`.
  - `members_power_snapshot_trg` AFTER UPDATE → `tg_member_power_snapshot()` —
    inserts a row into `member_power_snapshots` whenever `power_m` or
    `tg_level` changes.
- **Notes**: Allies do **not** get a row here — they only have a
  `member_accounts` row with `role = 'ally'` and `member_id = NULL`.

---

### `member_power_snapshots`

- **Schema**: `public`
- **Purpose**: Append-only history of power/TG changes per member. Populated
  automatically by the AFTER UPDATE trigger on `members`.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `member_id` | UUID | no | — | FK `members(id) ON DELETE CASCADE`. |
  | `power_m` | NUMERIC | no | — | |
  | `tg_level` | INTEGER | yes | — | |
  | `snapshot_at` | TIMESTAMPTZ | no | `NOW()` | |
  | `recorded_by` | UUID | yes | — | FK `auth.users(id)`. |
- **Primary key**: `id`
- **Indexes**: `member_power_snapshots_member_time_idx (member_id, snapshot_at DESC)`,
  `idx_member_power_snapshots_recorded_by` (M6).
- **RLS policies**: `mps_select` — open SELECT.
- **Used by**: `src/repositories/memberSnapshots.ts`
- **Triggers**: none (this is the *target* of `tg_member_power_snapshot()`).
- **Notes**: Public read so power-trend charts work for non-admins.

---

### `polls`

- **Schema**: `public`
- **Purpose**: Alliance polls (Viking time slots, Swordland legion preference…).
  Single or multi-select. Optionally tied to an event_occurrence so admins can
  cascade results into squad/legion assignment.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `slug` | TEXT | no | — | UNIQUE; `/polls/{slug}`. |
  | `title` | TEXT | no | — | |
  | `description` | TEXT | yes | — | |
  | `type` | `poll_type` | no | — | enum `single` / `multi`. |
  | `closes_at` | TIMESTAMPTZ | yes | — | NULL = open indefinitely. |
  | `event_occurrence_id` | UUID | yes | — | FK `event_occurrences(id) ON DELETE SET NULL`. |
  | `created_by` | UUID | yes | — | FK `auth.users(id)`. |
  | `created_at` | TIMESTAMPTZ | no | `NOW()` | |
  | `updated_at` | TIMESTAMPTZ | no | `NOW()` | Auto-touched. |
  | `status` | `poll_status` | no | `'open'` | **Added M14**. enum `draft` / `open` / `closed` / `archived`. |
  | `opens_at` | TIMESTAMPTZ | yes | — | **Added M14**. |
  | `closed_at` | TIMESTAMPTZ | yes | — | **Added M14**. |
  | `share_token` | TEXT | no | (backfilled) | **Added M14**. UNIQUE 6-char base62. |
  | `results_visibility` | `results_visibility` | no | `'during'` | **Added M14**. enum `during` / `after_close` / `admin_only`. |
- **Dropped columns**: `results_visible_during_voting` (BOOLEAN, M13) — migrated
  into `results_visibility` enum and dropped in M14.
- **Primary key**: `id`
- **Foreign keys**: `event_occurrence_id → event_occurrences(id) SET NULL`;
  `created_by → auth.users(id)`.
- **Indexes**: `polls_slug_lower_idx` (UNIQUE on `lower(slug)`),
  `polls_closes_at_idx`, `polls_created_at_idx`, `polls_share_token_unique`,
  `polls_status_idx` (M14), `polls_created_by_idx` (M19),
  `polls_event_occurrence_id_idx` (M19).
- **RLS policies**:
  - `polls_select` — any authenticated user.
  - `polls_admin_insert` / `_admin_update` / `_admin_delete` (M21).
- **Used by**: `src/repositories/polls.ts`
- **Triggers**: `polls_updated_at` BEFORE UPDATE.
- **Notes**: `admin_only` results visibility is enforced in the app/repo layer,
  not by RLS — `poll_votes` is SELECT-open to all authenticated users.

---

### `poll_options`

- **Schema**: `public`
- **Purpose**: One row per choice on a poll. `metadata` is a JSONB tag used to
  cascade results into other systems (`{ "legion": 1 }`, `{ "time_utc": "18:00" }`).
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `poll_id` | UUID | no | — | FK `polls(id) ON DELETE CASCADE`. |
  | `label` | TEXT | no | — | |
  | `display_order` | INTEGER | no | `0` | |
  | `metadata` | JSONB | yes | — | |
  | `created_at` | TIMESTAMPTZ | no | `NOW()` | |
- **Primary key**: `id`
- **Indexes**: `idx_poll_options_poll_id` (M7).
  *(`poll_options_poll_idx` from M13 was dropped in M22.)*
- **RLS policies**: `poll_options_select` (any authenticated); admin-only
  INSERT/UPDATE/DELETE (M21).
- **Used by**: `src/repositories/polls.ts`

---

### `poll_votes`

- **Schema**: `public`
- **Purpose**: One row per (poll, option, account) triple. Re-vote = DELETE +
  INSERT performed by the repo layer.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `poll_id` | UUID | no | — | FK `polls(id) CASCADE`. |
  | `option_id` | UUID | no | — | FK `poll_options(id) CASCADE`. |
  | `account_id` | UUID | no | — | FK `member_accounts(id) CASCADE`. |
  | `voted_at` | TIMESTAMPTZ | no | `NOW()` | |
- **Primary key**: composite `(poll_id, option_id, account_id)`
- **Indexes**: `idx_poll_votes_account_id` (M7), `poll_votes_option_id_idx` (M19).
  *(M22 dropped `poll_votes_account_idx` and `poll_votes_poll_idx`.)*
- **RLS policies**:
  - `poll_votes_select` — any authenticated user (results visible to allies too).
  - `poll_votes_insert` (M23 merged self + admin): caller must be admin, **or**
    inserting their own vote on a poll with `status = 'open'` and either no
    `closes_at` or `closes_at > NOW()`, while being a voting member
    (`is_voting_member()` excludes allies).
  - `poll_votes_delete` (M23 merged self + admin): same gate as INSERT — caller
    may delete their own vote while poll is open; admins may delete any.
  - `poll_votes_admin_update` (M21) — admin-only UPDATE (rare).
- **Used by**: `src/repositories/polls.ts`
- **Notes**: Allies CAN see results but cannot vote — the `is_voting_member()`
  gate in the INSERT policy enforces this.

---

### `event_participants`

- **Schema**: `public`
- **Purpose**: Roster assignment for a specific event occurrence. Composite
  PK ensures one row per (occurrence, member).
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `event_occurrence_id` | UUID | no | — | FK `event_occurrences(id) CASCADE`. |
  | `member_id` | UUID | no | — | FK `members(id) CASCADE`. |
  | `participation_role` | TEXT | yes | — | CHECK in `('leader','joiner','standby')`. |
  | `notes` | TEXT | yes | — | |
  | `added_by` | UUID | yes | — | FK `member_accounts(id)`. |
  | `added_at` | TIMESTAMPTZ | no | `NOW()` | |
- **Primary key**: composite `(event_occurrence_id, member_id)`
- **Indexes**: `event_participants_member_idx`,
  `idx_event_participants_added_by` (M6).
- **RLS policies**: `ep_select` (open SELECT); admin-only INSERT/UPDATE/DELETE.
- **Used by**: `src/repositories/eventParticipants.ts`, `src/pages/admin/AdminEventParticipants.tsx`
- **Notes**: Public read so attendance lists are visible on the Hub.

---

### `alliance_settings`

- **Schema**: `public`
- **Purpose**: Singleton row holding alliance-wide presentation data (rank,
  motto, brand colors). Enforced single-row with a partial UNIQUE index.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `singleton` | BOOLEAN | no | `true` | Used in the partial UNIQUE index. |
  | `rank` | TEXT | yes | — | e.g. `#2`. |
  | `motto` | TEXT | yes | — | |
  | `tagline` | TEXT | yes | — | |
  | `brand_primary` | TEXT | yes | — | Hex color. |
  | `brand_accent` | TEXT | yes | — | Hex color. |
  | `captured_at` | DATE | yes | — | When the snapshot was taken. |
  | `updated_at` | TIMESTAMPTZ | no | `NOW()` | |
  | `updated_by` | UUID | yes | — | FK `auth.users(id)`. |
- **Primary key**: `id`
- **Indexes**: `alliance_settings_singleton_idx` (UNIQUE partial on
  `(singleton) WHERE singleton = true`), `idx_alliance_settings_updated_by` (M7).
- **RLS policies**:
  - `alliance_settings_select` — open SELECT (anon + authenticated).
  - `alliance_settings_admin_insert` / `_admin_update` / `_admin_delete`
    (M26 split from the original `FOR ALL` policy).
- **Used by**: `src/repositories/allianceSettings.ts`
- **Notes**: Seeded with `rank='#2'`, `motto='Elegance in Peace, Chaos in Battle.'`,
  `tagline='Kingdom 1652'`, `brand_primary='#f4cf73'`, `brand_accent='#e25656'`.

---

### `push_subscriptions`

- **Schema**: `public`
- **Purpose**: Web Push (PWA) subscription endpoints per account/browser.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `account_id` | UUID | yes | — | FK `member_accounts(id) CASCADE`. |
  | `endpoint` | TEXT | no | — | UNIQUE. The push service URL. |
  | `p256dh` | TEXT | no | — | Web Push P-256 key. |
  | `auth_token` | TEXT | no | — | Web Push auth secret. |
  | `language_code` | TEXT | no | `'en'` | |
  | `user_agent` | TEXT | yes | — | |
  | `subscribed_at` | TIMESTAMPTZ | no | `NOW()` | |
  | `last_used_at` | TIMESTAMPTZ | yes | — | |
  | `active` | BOOLEAN | no | `true` | |
- **Primary key**: `id`
- **Indexes**: `push_subscriptions_account_idx (account_id) WHERE active = true`.
- **RLS policies**: per-verb policies — caller may SELECT/UPDATE/DELETE rows
  where `account_id = auth.uid()` OR `is_admin()`; INSERT requires
  `account_id = auth.uid()` (no admin override on insert).
- **Used by**: `src/repositories/pushSubscriptions.ts`, `src/hooks/usePushSubscription.ts`

---

### `push_messages`

- **Schema**: `public`
- **Purpose**: Admin-authored push notifications. Can target audiences or
  custom account lists; can be one-shot or recurrence-based.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `title` | TEXT | no | — | |
  | `body` | TEXT | no | — | |
  | `emoji` | TEXT | yes | — | |
  | `image_url` | TEXT | yes | — | |
  | `audience` | TEXT | no | — | CHECK in `('all','voting','admins','allies','custom')`. |
  | `custom_account_ids` | UUID[] | yes | — | Used when `audience = 'custom'`. |
  | `tap_target` | TEXT | no | `'hub'` | CHECK in `('hub','events','polls','alliance','url')`. |
  | `tap_url` | TEXT | yes | — | Used when `tap_target = 'url'`. |
  | `scheduled_for` | TIMESTAMPTZ | yes | — | |
  | `recurrence_rule` | TEXT | yes | — | iCal RRULE. |
  | `sent_at` | TIMESTAMPTZ | yes | — | Stamped when the worker dispatches. |
  | `cancelled` | BOOLEAN | no | `false` | |
  | `created_by` | UUID | yes | — | FK `member_accounts(id)`. |
  | `created_at` | TIMESTAMPTZ | no | `NOW()` | |
- **Primary key**: `id`
- **Indexes**: `push_messages_scheduled_idx (scheduled_for) WHERE sent_at IS NULL AND cancelled = false`,
  `idx_push_messages_created_by` (M7).
- **RLS policies**:
  - `push_msgs_select` — open SELECT (also granted to anon for landing-page previews).
  - `push_msgs_admin_insert` / `_admin_update` / `_admin_delete`.
- **Used by**: `src/repositories/notifications.ts`, `src/hooks/useMyNotifications.ts`

---

### `push_message_deliveries`

- **Schema**: `public`
- **Purpose**: Per-subscription delivery record. Tracks attempts, successes,
  opens, errors.
- **Columns**:
  | Name | Type | Nullable | Default | Notes |
  |---|---|---|---|---|
  | `id` | UUID | no | `gen_random_uuid()` | |
  | `message_id` | UUID | no | — | FK `push_messages(id) CASCADE`. |
  | `subscription_id` | UUID | no | — | FK `push_subscriptions(id) CASCADE`. |
  | `delivered_at` | TIMESTAMPTZ | yes | — | |
  | `opened_at` | TIMESTAMPTZ | yes | — | |
  | `error` | TEXT | yes | — | |
  | `attempted_at` | TIMESTAMPTZ | no | `NOW()` | |
- **Primary key**: `id`
- **Indexes**: `push_deliveries_message_idx`,
  `idx_push_message_deliveries_subscription_id` (M7).
- **RLS policies**: `push_deliveries_admin_select` — admin-only SELECT. No public
  insert/update policy: writes go via service_role from the worker.
- **Used by**: `src/repositories/notifications.ts`

---

### Game catalogue tables (M33/M34)

These five tables share the same RLS shape (open SELECT, admin-only writes)
created via a `DO $$ ... LOOP ...` block in M33. Their grant pattern is:
`GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated; GRANT SELECT … TO anon;`

#### `heroes`

- **Purpose**: In-game hero roster. 33 rows seeded in M34.
- **Columns**: `id UUID PK`, `slug TEXT UNIQUE NOT NULL`, `name TEXT NOT NULL`,
  `generation INTEGER NOT NULL CHECK BETWEEN 1 AND 12`, `role TEXT`,
  `preferred_branch troop_branch`, `portrait_url TEXT`, `description TEXT`,
  `released_at DATE`, `display_order INTEGER NOT NULL DEFAULT 100`,
  `active BOOLEAN NOT NULL DEFAULT true`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- **Indexes**: `heroes_active_idx (active)`, implicit UNIQUE on `slug`.
- **RLS**: `heroes_select` open; admin-only INSERT/UPDATE/DELETE.
- **Used by**: `src/repositories/heroes.ts`.

#### `pets`

- **Purpose**: In-game pet roster.
- **Columns**: `id UUID PK`, `slug TEXT UNIQUE NOT NULL`, `name TEXT NOT NULL`,
  `generation INTEGER NOT NULL CHECK BETWEEN 1 AND 12`, `portrait_url TEXT`,
  `description TEXT`, `released_at DATE`,
  `display_order INTEGER NOT NULL DEFAULT 100`,
  `active BOOLEAN NOT NULL DEFAULT true`.
- **RLS**: open SELECT; admin-only writes.
- **Used by**: `src/repositories/pets.ts`, `src/pages/Pets.tsx`.

#### `masters`

- **Purpose**: Master characters (4 seeded: Valora, Pan, Roman, Cassia).
- **Columns**: `id UUID PK`, `slug TEXT UNIQUE NOT NULL`, `name TEXT NOT NULL`,
  `unlock_order INTEGER NOT NULL UNIQUE`, `portrait_url TEXT`, `description TEXT`,
  `released_at DATE`, `active BOOLEAN NOT NULL DEFAULT true`.
- **RLS**: open SELECT; admin-only writes.
- **Used by**: `src/repositories/masters.ts`, `src/pages/Masters.tsx`.

#### `troop_tiers`

- **Purpose**: T1–T10 and TG1–TG8 tier metadata. 18 rows seeded.
- **Columns**: `id UUID PK`, `tier_label TEXT UNIQUE NOT NULL`,
  `is_truegold BOOLEAN NOT NULL`, `display_order INTEGER NOT NULL`,
  `training_building_level INTEGER`, `icon_url TEXT`, `description TEXT`.
- **RLS**: open SELECT; admin-only writes.
- **Used by**: `src/repositories/troopTiers.ts`, `src/pages/TroopTiers.tsx`.

#### `troop_tier_branch_icons`

- **Purpose**: Per-branch icon for each tier (e.g. TG5 infantry vs cavalry).
- **Columns**: `tier_id UUID REFERENCES troop_tiers(id) ON DELETE CASCADE`,
  `branch troop_branch NOT NULL`, `icon_url TEXT NOT NULL`,
  composite PK `(tier_id, branch)`.
- **RLS**: open SELECT; admin-only writes.

---

## Enums

| Type | Schema | Values | Defined in |
|---|---|---|---|
| `event_status` | `public` | `active`, `coming-soon`, `archived` | M1 |
| `milestone_category` | `public` | `truegold`, `heroes`, `pets`, `pvp`, `feature`, `master`, `fog`, `war-academy`, `other` | M1 |
| `account_role` | `public` | `ally`, `member`, `r2`, `r3`, `r4`, `r5` | M8 |
| `login_event_type` | `public` | `signin`, `signout`, `pwa_install`, `pwa_uninstall`, `password_change`, `failed_signin` | M8 |
| `alliance_rank` | `public` | `r1`, `r2`, `r3`, `r4`, `r5` | M12 |
| `member_subgroup` | `public` | `lieutenant`, `alpha`, `enforcerer`, `supreme` | M12 |
| `member_status` | `public` | `active`, `temporary_out`, `left` | M12 |
| `poll_type` | `public` | `single`, `multi` | M13 |
| `poll_status` | `public` | `draft`, `open`, `closed`, `archived` | M14 |
| `results_visibility` | `public` | `during`, `after_close`, `admin_only` | M14 |
| `troop_branch` | `public` | `infantry`, `cavalry`, `archer` | M33 |

---

## Functions / RPCs

### Role-check helpers (SECURITY DEFINER, schema `private`)

Defined in M15; granted EXECUTE to `service_role` and `authenticated`.
`USAGE` on `private` granted to `authenticated`/`anon` in M17.

| Signature | Returns | Purpose |
|---|---|---|
| `private.account_role()` | `account_role` | Caller's role from `member_accounts`, or NULL if inactive/missing. |
| `private.is_admin()` | `BOOLEAN` | True if caller's role ∈ `{r4, r5}`. |
| `private.is_voting_member()` | `BOOLEAN` | True if role ∈ `{member, r2, r3, r4, r5}` (excludes `ally`). |
| `private.is_ally()` | `BOOLEAN` | True if role = `ally`. |

### `public` wrappers (SECURITY INVOKER, M15)

| Signature | Body |
|---|---|
| `public.account_role()` | `SELECT private.account_role()` |
| `public.is_admin()` | `SELECT private.is_admin()` |
| `public.is_voting_member()` | `SELECT private.is_voting_member()` |
| `public.is_ally()` | `SELECT private.is_ally()` |

These exist so legacy code and RLS policies that referenced `public.is_admin()`
keep working. The original `public.is_admin()` (M1, queried `admin_users`) was
overwritten by Fase B (M8) and again by M15.

### Triggers (functions in `public`)

| Function | Used by trigger(s) | Purpose |
|---|---|---|
| `public.tg_set_updated_at()` (M1, hardened M4) | `events_set_updated_at`, `kingdom_milestones_set_updated_at` | BEFORE UPDATE — set `NEW.updated_at = NOW()`. |
| `public.touch_updated_at()` (M8, hardened M9) | `member_accounts_updated_at`, `members_updated_at`, `polls_updated_at` | Same purpose; Fase B equivalent. |
| `public.tg_member_power_snapshot()` (M31, SECURITY DEFINER) | `members_power_snapshot_trg` | AFTER UPDATE on `members` — insert a `member_power_snapshots` row whenever `power_m` or `tg_level` changes. |

### Auth telemetry RPC

`public.record_login_event(p_event_type login_event_type, p_account_id uuid DEFAULT NULL, p_user_agent text DEFAULT NULL) RETURNS void`

- SECURITY DEFINER, `search_path = ''`.
- Granted EXECUTE to `anon` and `authenticated`.
- **Anon caller restriction (M27)**: anon callers may only pass
  `event_type = 'failed_signin'` and `p_account_id IS NULL`. Anything else raises
  SQLSTATE `42501`.
- **Side effects (M29)**: inserts into `public.login_events`. For `signin`
  events with a non-NULL `p_account_id`, also updates `member_accounts.last_login_at`
  (and stamps `first_login_at` if it was NULL).
- Called from `src/repositories/auth.ts` via `supabase.rpc('record_login_event', …)`.

---

## Storage

Three Supabase Storage buckets, all public-read (created M28):

| Bucket | Size limit | Allowed MIME | Write policy |
|---|---|---|---|
| `avatars` | 2 MiB | jpeg, png, webp, gif | Authenticated user may INSERT/UPDATE/DELETE only objects whose first path component equals their `auth.uid()`. |
| `notification-images` | 5 MiB | jpeg, png, webp | Admin-only (`FOR ALL` with `is_admin()` USING + WITH CHECK). |
| `milestone-bodies` | 5 MiB | jpeg, png, webp, gif | Admin-only. |

Public read is satisfied by the default Supabase open-SELECT on `storage.objects`
plus the bucket's `public = true` flag — admins can serve images via the public
CDN URL without signing.

---

## Realtime

No Postgres-changes channels are currently subscribed by the client (verified by
grepping `src/` for `channel`/`postgres_changes`). All reads are imperative
queries through the repository layer. The `usePushSubscription` and `useAuth`
hooks reference Supabase but only for auth/session events, not realtime DB
subscriptions.

---

## Data flow

### "User signs in"

1. UI calls `signInWithPassword({ email: 'username@dad-war-room.local', password })`
   via `repositories/auth.ts`.
2. On success, `auth.users` row exists → client calls
   `supabase.rpc('record_login_event', { p_event_type: 'signin', p_account_id, p_user_agent })`.
3. `public.record_login_event()` inserts into `login_events` and stamps
   `member_accounts.last_login_at` / `first_login_at`.
4. Client fetches the matching `member_accounts` row to read `role`,
   `display_name`, `member_id` for session bootstrap.
5. Subsequent queries gate through RLS: `public.is_admin()` /
   `public.is_voting_member()` resolve via the `private` schema helpers.

### "Anon login fails"

1. UI calls `signInWithPassword(...)`, gets `auth.invalid_credentials` or similar.
2. Client calls `record_login_event('failed_signin', NULL, ua)`.
3. RPC's anon guard allows it (event type is `failed_signin`, account is NULL).
4. Row appears in `login_events` with `account_id = NULL` (M29 made the column nullable).

### "Admin creates an event"

1. Admin POSTs through `repositories/events.ts` (`from('events').insert(...)`).
2. Table privilege `GRANT INSERT … TO authenticated` (M5) lets PostgREST proceed.
3. RLS `events_admin_insert` evaluates `public.is_admin()` → `private.is_admin()`
   → `SELECT ... FROM member_accounts WHERE id = auth.uid() AND active AND role IN ('r4','r5')`.
4. On success, `events_set_updated_at` trigger stamps `updated_at`.

### "Member casts a poll vote"

1. UI calls `from('poll_votes').insert({ poll_id, option_id, account_id: <self> })`.
2. RLS `poll_votes_insert` (M23) checks:
   `is_admin() OR (account_id = auth.uid() AND is_voting_member() AND poll.status = 'open' AND (closes_at IS NULL OR closes_at > NOW()))`.
3. Allies (`role = 'ally'`) are blocked by `is_voting_member()`.
4. Re-vote: client DELETEs existing rows for `(poll_id, account_id)` (gated by
   `poll_votes_delete`, same `open` check) then INSERTs again.

### "Admin updates a member's power"

1. Admin UPDATEs `members.power_m` via `repositories/members.ts`.
2. RLS `members_admin_update` (M21) gates on `is_admin()`.
3. `members_updated_at` trigger touches `updated_at`.
4. `members_power_snapshot_trg` AFTER UPDATE fires; if `power_m` or `tg_level`
   changed it inserts a row into `member_power_snapshots` (with
   `recorded_by = NULL` — the trigger runs as SECURITY DEFINER without a caller
   context for that column; admins can call a dedicated repo path to record it
   explicitly).

### "Admin sends a push notification"

1. Admin INSERTs into `push_messages` (RLS `push_msgs_admin_insert`).
2. Worker (service_role) reads `push_messages WHERE scheduled_for ≤ NOW() AND sent_at IS NULL AND cancelled = false`
   (covered by `push_messages_scheduled_idx`).
3. For each target subscription, worker INSERTs into `push_message_deliveries`
   with `attempted_at = NOW()`, then web-pushes and stamps `delivered_at` or
   `error`.
4. Client's service worker, on open, can POST back to a worker endpoint that
   updates `opened_at`. Only admins can SELECT `push_message_deliveries`
   (`push_deliveries_admin_select`).

### "User views the Kingdom Timeline"

1. Anyone (anon OK via `events_public_select` analogue for `kingdom_milestones`)
   does `from('kingdom_milestones').select('*').order('display_order')`.
2. UI renders cards; `/timeline/:slug` fetches `body_html` (M16) and renders the
   sanitized Tiptap output.

---

## Migrations not yet applied / out-of-band changes

Per the project memory file (`MEMORY.md` → "DAD War Room: state + project log")
and the headers on migrations M6 onward, **all 34 migrations have been confirmed
applied to the remote project `ilogsrlbenhdzkfgexvt` as part of the Wave 10
backfill on 2026-06-16**.

The local `supabase/migrations/` directory was reconciled with the remote DB on
that date — any migrations that had been applied directly via the Supabase MCP
`apply_migration` tool (without a local file) were pulled down and committed
with their original timestamps. Headers like
`-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)` mark these
formerly-out-of-band migrations.

No drift is currently expected. To re-verify in a future session:

```sh
supabase migration list
# compare against `ls supabase/migrations/*.sql`
```

If the lists ever diverge again, follow the same playbook: pull missing
migrations from the remote, commit with original timestamps, and record the
incident in `PROGRESSO.md` / project memory.
