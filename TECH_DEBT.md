# DAD War Room — Technical Debt

> **Generated**: 2026-06-18 from code audit + session memory + agent findings.
> **Reading order**: P1 (critical) → P2 (load-bearing) → P3 (cleanup) → P4 (cosmetic).
> **Companion docs**: cross-reference with **LESSONS_LEARNED.md** for the historical context, **ROADMAP.md** for what's being addressed when.

This file catalogues **debt** — code that works but creates future cost. For known **bugs**, see TECH_DEBT-style entries marked 🐛. For pure **architectural debt**, marked 🏗. For **cleanup**, marked 🧹. For **inconsistency**, marked 🎭.

---

## 🚨 P1 — Critical (fix before next major feature)

### 🏗 P1.1 · Hero Detail page visual UX rejected
**Files**: `src/pages/HeroDetail.tsx` (833 LOC), `src/components/dashboard/GameCatalogueCard.tsx`, related skill/cost components.
**Problem**: 6 successive iterations of the page were rejected by the project owner. Current implementation in production is functional but visually disliked. The owner explicitly asked for a complete redesign via Claude.ai/design tool.
**Cost of leaving it**: blocking — the page is the second-most-frequently-visited member screen and reflects badly on the whole app.
**Fix path**: see **ROADMAP.md P0.1 + P1.1**. Awaiting Claude.ai/design mockup approval.
**Origin**: Waves 16-22.

### 🏗 P1.2 (TECH_DEBT) · `AdminAccounts.tsx` at 706 lines, single file
*Numbering note: TECH_DEBT priorities are independent of ROADMAP priorities.
ROADMAP.md has its own P1.2 (apply icon library across pages). When citing,
specify which doc: "TECH_DEBT P1.2" vs "ROADMAP P1.2".*
**File**: `src/pages/admin/AdminAccounts.tsx`.
**Problem**: project's own rule is "files ≤ 300 lines". This file is 2.3× over. Holds Create / List / Edit / Roles management for the admin's most critical workflow. High blast-radius if it breaks.
**Cost of leaving it**: every change is risky. Hard to grep for sub-features. Tests have to cover the whole monolith to be useful.
**Fix path**: split into 3-4 sub-pages, see **ROADMAP.md P1.5**.
**Origin**: identified Wave 10 audit, never resolved.

### 🐛 P1.3 · `AdminAnalytics` push-delivery numbers are hardcoded
**File**: `src/pages/admin/AdminAnalytics.tsx`.
**Problem**: agent audit found the displayed push delivery metrics are placeholder constants, NOT real data from `push_deliveries` table. Admins see fake "100% delivered" numbers.
**Cost of leaving it**: admin trust in metrics is undermined silently. If alliance leadership uses these numbers to make decisions, they're making them on fake data.
**Fix path**: wire to real metrics from `push_deliveries` + computed open rates. See **ROADMAP.md P2.5**.
**Origin**: identified by Wave 23 documentation audit.

### 🐛 P1.4 · `AdminChat` persists config to localStorage only
**File**: `src/pages/admin/AdminChat.tsx`.
**Problem**: admin sets chat moderation config (banned words, slow-mode, etc.). Settings save only to admin's own browser localStorage. Other admins / page reloads on different devices lose them. The backend "purge" action is a stub.
**Cost of leaving it**: misleading — config that says "saved" isn't durable. If admin clears browser cache, all config lost. Multi-admin coordination impossible.
**Fix path**: requires Fase Y chat backend (see **ROADMAP.md P3.1**), but the config persistence specifically is a smaller piece — could be lifted to a `chat_config` table now.
**Origin**: identified by Wave 23 audit.

---

## 🔥 P2 — Load-bearing (deal with within a quarter)

### 🏗 P2.1 · Pages bypass repository pattern (3+)
**Files**: `src/pages/Pets.tsx`, `src/pages/Masters.tsx`, `src/pages/TroopTiers.tsx`, partially `src/pages/admin/AdminEventParticipants.tsx`.
**Problem**: these pages call `supabase.from(...)` directly, bypassing the `src/repositories/` abstraction every other page uses. Inconsistency makes type-checking, mocking, and changes harder.
**Cost of leaving it**: when DB schema changes, repository-using pages need 1 file update; bypassing pages need page-level update. Tests can't mock these pages cleanly.
**Fix path**: extract into `pets-repository.ts` / `masters-repository.ts` / `troop-tiers-repository.ts`. See **ROADMAP.md P4.7**.
**Origin**: identified by Wave 23 audit.

### 🏗 P2.2 · `AdminOccurrences.tsx` flagged "bug-prone"
**File**: `src/pages/admin/AdminOccurrences.tsx`.
**Problem**: agent audit found inline `eslint-disable` comments referencing a missing TanStack Query migration. Stale data, cache invalidation, and re-render bugs likely.
**Cost of leaving it**: occurrence list (linked to events) may show stale or duplicated entries silently.
**Fix path**: migrate to TanStack Query for proper cache + invalidation. See **ROADMAP.md P2.4**.
**Origin**: identified by Wave 23 audit.

### 🏗 P2.3 · Large page files over 300 LOC (5 files)
**Files**:
- `HeroDetail.tsx` — 833 LOC (also see P1.1)
- `AdminAccounts.tsx` — 706 LOC (P1.2)
- `PollDetail.tsx` — 665 LOC
- `AdminPolls.tsx` — 561 LOC
- `AdminMilestones.tsx` — 517 LOC
**Problem**: project rule "files ≤ 300 lines" violated on 5 files. Each violator is a risk amplifier.
**Cost of leaving it**: refactor cost grows superlinearly with file size. Test isolation degrades. Code review fatigue increases.
**Fix path**: targeted refactors per file. Each file ~M effort.
**Origin**: identified in Wave 10 audit, only partially addressed.

### 🏗 P2.4 · `admin_users` table legacy after migration to `member_accounts.role`
**Table**: `public.admin_users`.
**Problem**: agent DATABASE audit found `admin_users` was superseded by `member_accounts.role ∈ {r4, r5}` in migrations M8/M15. Some repositories still read it once for an ownership check; new admin rows should NOT go in `admin_users`.
**Cost of leaving it**: a new admin written to `admin_users` won't have the right RLS coverage. Schema bloat. Confusion for new devs reading two tables for the same concept.
**Fix path**: deprecation migration — port any remaining `admin_users` rows into `member_accounts.role`, drop `admin_users` table, remove the legacy repository read.
**Origin**: identified by Wave 23 audit.

### 🎭 P2.5 · `AdminPolls` migrated to RHF + zod; other admin pages haven't
**Files**: `AdminPolls.tsx` (migrated, Wave 11), `AdminMilestones.tsx`, `AdminNotifications.tsx`, `AdminHeroes/Pets/Masters` (not migrated).
**Problem**: inconsistency. `AdminPolls` uses `useForm + useFieldArray + zodResolver` for type-safe validation. Other admin pages use scattered `useState` calls.
**Cost of leaving it**: validation gaps possible. Different forms have different UX patterns (error display, dirty state, etc.).
**Fix path**: migrate the rest. Each ~M effort. Spread across sprints; not urgent.
**Origin**: Wave 11.

### 🏗 P2.6 · Hero Detail data flow has 5 sources of truth
**Files**: `src/data/heroes-roster.ts`, `src/data/heroes-data.json`, `src/data/hero-upgrade-costs.ts`, `src/data/icon-library.ts`, `public/images/icons/kingshot/`, `public/images/icons/kingshotwiki/`.
**Problem**: a hero like Amadeus has data spread across 5 files. Adding a new hero requires updating multiple files. Inconsistencies are silent — name mismatch between roster and data, or icon path drift, can sit undetected.
**Cost of leaving it**: catalogue maintenance overhead. Risk of name/asset drift.
**Fix path**: unify into a single `heroes.ts` source that produces all derived shapes via codegen, OR build a consistency check script that runs in CI.
**Origin**: organic accumulation across Waves 16-20.

### 🐛 P2.7 · pg_cron `service_role_key` setting may be empty (legacy gotcha)
**Issue**: `current_setting('app.settings.service_role_key', true)` returns NULL in this Supabase project.
**Workaround**: every cron-triggered edge function uses `verify_jwt: false` and authenticates via its own `SUPABASE_SERVICE_ROLE_KEY` env var. Works fine.
**Why it's still debt**: future devs may build a new cron-triggered function with the assumption that the setting is populated, get 401s, debug for hours.
**Fix path**:
- Option A: populate the setting in Supabase Dashboard. One-time fix; future functions can use either approach.
- Option B: document the limitation prominently (this is one such place). Make `verify_jwt: false` the default convention for cron-triggered functions.
**Origin**: Wave 11.

### 🏗 P2.8 · Cache-bust query strings (`?v=2`) on PWA icons
**File**: `index.html`.
**Workaround**: every icon link has `?v=2` appended to defeat Vercel's `cache-control: max-age=31536000, immutable` header.
**Why it's debt**: every icon refresh requires bumping `v=N+1` manually. Easy to forget.
**Fix path**:
- Option A: add a Vercel `vercel.json` with custom cache headers for `/icons/*` (e.g. `max-age=86400`).
- Option B: automate the `v=` bump in a pre-deploy script that reads icon mtime.
**Origin**: Wave 13.

---

## 🧹 P3 — Cleanup (deal with within 6 months)

### 🧹 P3.1 · Dead components (3 files)
**Files**: `src/components/ui/BorderBeam.tsx`, `OrnamentDivider.tsx`, `Sparkles.tsx`.
**Problem**: agent grep found ZERO importers across `src/`. Animation keyframes for these still exist in `index.css`.
**Cost of leaving it**: confusion. Future devs may think these are usable.
**Fix path**: delete the 3 files + drop dead `@keyframes` in `index.css`. ~15 minutes.
**Origin**: identified by Wave 23 audit.

### 🧹 P3.2 · 12 unused indexes dropped (already done, mentioning for completeness)
**Status**: DONE in migration M22 (Wave 10). No action needed; mentioning so future devs don't try to "restore" them on grounds of "why was this dropped?".
**Reason for original drop**: low cardinality (role/category/status enums); 8 FK covering indexes added in M6/M7 replaced what mattered for joins.

### 🧹 P3.3 · `as any` and `eslint-disable` audit
**Files**: scattered. Notable ones flagged by Wave 23 agent:
- `ImageUploadField`: preserve-manual-memoization around upload `useCallback` (comment: non-critical under React 19 Compiler)
- `RichTextEditor`: exhaustive-deps on external `value` sync effect
- `NotificationsPanel`: immutability on `window.location.href` assignment
- `loginEvents.ts`: unused eslint-disable directive (line 30, 34)
- `AdminAnalytics.tsx:295`: unused eslint-disable directive
- `AdminPolls.tsx:130`: incompatible library warning
- `supabase.ts:10`: unused eslint-disable
**Cost of leaving it**: each suppression is a future bug surface. Should be re-evaluated yearly.
**Fix path**: audit pass — for each, either justify with comment OR remove the disable + fix the underlying issue.
**Origin**: ongoing.

### 🧹 P3.4 · `playwright.config.ts.template` exists but Playwright not enabled
**File**: `playwright.config.ts.template`.
**Problem**: template hints at planned e2e coverage that was never built.
**Cost of leaving it**: false signal — looks like e2e is in scope. Confuses contributors.
**Fix path**:
- If we intend to add e2e: rename to `.ts`, set up CI workflow, write tests. See **ROADMAP.md P4.5**.
- If not: delete the template + document the choice in **ARCHITECTURE.md "Not in architecture"**.
**Origin**: organic.

### 🧹 P3.5 · Cosmetic bug: `PowerChart` `hover:r-6` no-op
**File**: `src/components/PowerChart.tsx` (approximate).
**Problem**: `className="transition-all hover:r-6"` — Tailwind doesn't generate `r-*` utilities for SVG's `r` attribute. The class is a no-op.
**Cost of leaving it**: minor; visual effect doesn't fire on hover.
**Fix path**: use inline `style={{ r: 6 }}` on hover, OR add a Tailwind plugin generating `r-*` utilities, OR use a custom CSS rule.
**Origin**: identified by Wave 23 audit.

### 🧹 P3.6 · Hardcoded "Checking session..." in `ProtectedAdminRoute`
**File**: `src/components/ProtectedAdminRoute.tsx`.
**Problem**: hardcodes English. Sibling `RequireAuth.tsx` uses `t('ui.checkingSession', ...)`.
**Cost of leaving it**: non-EN users see English mid-route-change.
**Fix path**: add the i18n key, use it consistently. ~10 minutes.
**Origin**: identified by Wave 23 audit.

### 🧹 P3.7 · `NotificationsPanel` outside-click aria-label coupling
**File**: `src/components/NotificationsPanel.tsx`.
**Problem**: outside-click handler hardcodes `[aria-label="Notifications"]` to avoid racing the bell-trigger toggle. Tight coupling between the component and the bell button's accessibility metadata.
**Cost of leaving it**: if anyone changes the bell button's aria-label for translation or refactor, the panel breaks subtly.
**Fix path**: use a ref-based check or a shared data-attribute (`data-notifications-trigger`) instead of relying on aria-label.
**Origin**: identified by Wave 23 audit.

### 🧹 P3.8 · Two precache numbers in build output (191 vs ~1080)
**Status**: build output shows different precache counts at different times.
- Pre-icon-scrape: 191 entries
- Post-icon-scrape + wiki scrape: ~1080 entries
**Cost of leaving it**: cognitive load when comparing build sizes across waves. Not actually broken.
**Fix path**: document this transition in **ARCHITECTURE.md** (the architecture agent already mentioned this — verify it's there) and stop being surprised by it. No code change.
**Origin**: organic.

---

## 🎨 P4 — Cosmetic / aspirational

### 🎭 P4.1 · 7 pre-existing lint warnings (catalogue exists)
**Files**: spread across `AdminPolls.tsx`, `loginEvents.ts`, `AdminAnalytics.tsx`, `AdminEventParticipants.tsx`, `AdminOccurrences.tsx`, `supabase.ts`.
**Status**: known, accepted as "non-blocking". CI is green.
**Cost**: each warning is a future bug surface. Most are unused-eslint-disable or exhaustive-deps.
**Fix path**: P3 / P4 housekeeping bundle when convenient.

### 🎭 P4.2 · Mixed image extension conventions
**Status**: `kingshot/heroes/*.webp` vs `kingshotwiki/items/*.png`. Both work; neither is "wrong"; just inconsistent.
**Cost**: minor mental load when grepping.
**Fix path**: standardize on `.webp` for everything (smaller files). Re-scrape kingshotwiki items as webp via sharp conversion. Low priority.

### 🎭 P4.3 · `Chat.tsx` is a route-level placeholder (Fase Y)
**Status**: route exists, renders placeholder pointing to push notifications.
**Cost**: the BottomNav tab "Chat" leads nowhere meaningful.
**Fix path**: see **ROADMAP.md P3.1**.

---

## ⚠️ Specifically NOT debt (clarifications)

These look like debt but are intentional design choices. Don't "fix" them without understanding why.

| Item | Why it's not debt |
|---|---|
| `verify_jwt: false` on edge functions | Workaround for null `app.settings.service_role_key` (see P2.7). Documented as the deliberate pattern. |
| `position: fixed` instead of `sticky` for header / bottom nav | iOS PWA standalone mode bug (LESSONS_LEARNED §1, §14). `sticky` is FORBIDDEN. |
| Cache-bust `?v=N` on icons | Vercel cache vs iOS Safari interaction (LESSONS §2). Until P2.8 is done, this is the documented pattern. |
| Game-data labels in EN across all 11 locales | Convention rule (LESSONS §22). Community uses EN game terms. |
| Static JSON for hero roster/data/icons (instead of DB) | Editing cost vs runtime cost tradeoff. Heroes change rarely. Build-time scrape pipeline is documented. |
| Direct `kingshotdata.com` REST scrape in `scripts/` | One-off pipelines, run manually. Not a runtime dependency. |
| No Storybook | Card-hero variants are reviewable in-context. `design-sync` shape detection confirmed `package` not `storybook`. |
| No Redux / Zustand | React useState + Supabase onAuthStateChange handle cross-cutting state. |
| Wide repository layer (20 files) | Intentional one-domain-per-file. Pages depend on `useFoo()` not `supabase` directly. |

---

## Debt accounting rules

When you add new debt, **add it here AND tag it in the source code**:

```ts
// TECH-DEBT P2.5: AdminPolls uses RHF+zod; this admin page doesn't.
//                See TECH_DEBT.md for migration plan.
```

When you fix debt, **delete the entry** AND remove the source-code tag. Don't move to a "fixed" section — git history captures that.

---

## Audit cadence

This file should be re-audited **after every wave**. New debt accrues; old debt may resolve indirectly. The agent-driven audit pattern used in Wave 23 (parallel agents reading code sections, reporting findings) is the recommended template — see WAR_ROOM_LOG.md §2.19 onwards for the orchestration.
