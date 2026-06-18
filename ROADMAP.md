# DAD War Room — Roadmap

> **Generated**: 2026-06-18 from session history + cross-referenced with agent findings.
> **Time horizon**: rolling 6 months from this date.
> **Estimation language**: T-shirt size (S = 1-2 days, M = 1 week, L = 2-4 weeks, XL = 1+ month).

This roadmap consolidates everything currently on the **wanted / planned / aspirational** list. Cross-reference with **TECH_DEBT.md** (bugs and known issues) and **LESSONS_LEARNED.md** (what to avoid while doing the items).

---

## 🚨 P0 — Blockers / mandatory before next major work

These must be resolved before substantial new development. Skipping them creates compounding pain.

### P0.1 · Hero Detail page visual redesign (BLOCKED on Claude.ai/design hand-off)
**Status**: rejected by user across 6 iterations (Waves 18-22). Currently using a placeholder UI.
**Path forward**: produce a mockup via Claude.ai/design (with `/design-sync` if VS Code Claude has interactive auth, else direct claude.ai/design), then implement here.
**Effort**: M (1 week) once a design is approved.
**Owner-ask required**: the design choice. Engineering work is unlocked the moment a mockup is approved.

### ~~P0.2 · Rotate exposed Vercel token~~ — DEFERRED (owner decision 2026-06-18)
**Status**: token was pasted in chat during Wave 10.
**Decision**: explicitly NOT rotating. Salles 2026-06-18: "é um projeto de uma
aliança de um jogo, pelo amor de deus." Risk model doesn't justify the hygiene
cost. Future sessions: don't re-propose unless the token is actually abused
OR the project's threat model changes (e.g., goes commercial / multi-tenant).
**Effort skipped**: S (10 min).

### P0.3 · `claude.ai/design` access for `/design-sync`
**Status**: skill is loaded; auth not configured in current CLI session (CLAUDE_CODE_OAUTH_TOKEN can't be expanded with design scopes).
**Path forward**: either (a) switch to VS Code Claude Code with interactive OAuth, or (b) run a one-off `env -u CLAUDE_CODE_OAUTH_TOKEN claude` session.
**Effort**: S (one shell command + interactive login).

---

## 🔥 P1 — Next 2-4 weeks (high impact, ready to start)

### P1.1 · Polish Hero Detail page (after P0.1 design lands)
- Implement the approved design
- Wire to existing `heroes-data.json` + `hero-upgrade-costs.ts` data sources
- Ensure mobile 375px PWA standalone works
- Add framer-motion animations sparingly
**Effort**: M (1 week)
**Dependencies**: P0.1

### P1.2 · Apply the 459-icon library across remaining pages (2 fases)
**Reality check (per Wave 24 nova-feature analysis 2026-06-18)**: Pets/Masters/
TroopTiers are NOT placeholders — they are functional DB-connected catalogue
pages that already render from `portrait_url`/`icon_url` columns, falling back
to Phosphor icons (PawPrint/Crown/Shield) when those are null. The actual gap
is that the fallback chain doesn't try the local kingshot library first.

**Available art on disk**: events (32 webp), pets (14), masters (4 — cassia,
pan, roman, valora). TroopTiers has NO kingshot art (legacy `/images/tiers/`
+ DB `troop_tier_branch_icons`).

**Risk discovered**: slug vs filename divergence (e.g. DB `cesars-fury` vs
disk `cesares-fury`). Mitigation: read-only Supabase query as step 0 to map
divergences before implementation.

**Phase 1 — DONE (wave 24)** (revised + Salles-approved 2026-06-18):
- **Masters**: real swap — 4/4 kingshot art matches DB slugs (cassia, pan,
  roman, valora). Implement local-first chain.
- **Pets**: wire dormant — `pets` table is empty (0 rows) but 14 webp on disk.
  Implement the fallback now in PetCard so it just works when admin populates
  the table later. Zero retrabalho.
- **Events**: REMOVED from P1.2 scope. The `kingshot/events/` library (32
  webp) contains GENERIC game events (Castle Battle, Lunar Festival,
  Champagne Fair, etc) — different taxonomy from the alliance's curated 8
  events in the DB (Bear 1/2, KvK, Cesar's Fury, etc). The naming
  coincidence "cesars-fury" (DB) vs "cesares-fury" (disk) is NOT a match —
  forcing it would mix concepts.
- **Members**: verify-only — `resolveAvatarUrl` already correct.
- **New helper**: `src/lib/catalogueIcon.ts` mirroring `heroAvatar.ts` pattern
- **Shared primitive**: extracted `<ChainedImage>` from HeroDetail into `src/components/ui/ChainedImage.tsx` (Masters + Pets now reuse it; also trims HeroDetail's over-cap line count — TECH_DEBT P2.3)
- **No migration, no new repo/hook, no new i18n keys**
- Effort: S (1-2 days, scope smaller after analysis)

**Spinoff (future, P3-P4)**: the unused `kingshot/events/` 32-icon library is
inventory for a "Game Events Reference" page — a separate feature that
catalogues all generic Kingshot events (not just the alliance's curated 8).
Different taxonomy, different page, different P-item.

**Phase 2 — BLOCKED (TroopTiers): no source art found.** Both sources
investigated 2026-06-18 (wave 24): kingshotwiki.com `/items/` has no troop/tier
category (only consumables/cosmetics — basic-resource, pet, chest, hero, master,
truegold, …); the kingshotdata.com scrape has no tier bucket; local manifests
have none. Existing tier art = legacy `/images/tiers/tg1-8.png` (truegold only,
no T1-T10) + DB `troop_tier_branch_icons` (per-branch).
**Decision pending (owner)** — (a) keep legacy `/images/tiers/*` indefinitely, or
(b) commission custom tier art. Do not start Phase 2 until decided.
- If later unblocked: extend scraper → `public/images/icons/kingshot/troop-tiers/`,
  update `src/data/icon-library.ts` (new group + manifest), wire TierGroup.

### P1.3 · Login rate-limit configuration
**Status**: planned in Wave 10 audit, not yet configured.
**Path**: Supabase Dashboard → Auth → Rate Limiting. Set conservative defaults (5 login attempts per 5 min per IP).
**Effort**: S (15 minutes config + verify with throttle test)

### P1.4 · Discord webhook for admin notifications
**Status**: in original Wave 6 backlog, still open.
**Scope**: when admin sends a push, ALSO post to a Discord channel webhook.
**Effort**: S-M (1-3 days). One edge function modification + Discord webhook URL in Supabase secrets.

### P1.5 · Refactor `AdminAccounts.tsx` (706 lines)
**Status**: identified in Wave 10 audit as the worst file-size offender.
**Goal**: split into 3-4 focused sub-pages (Create / List / Edit / Roles).
**Effort**: M (1 week). High risk of regression — admin account management is critical path. Demand test coverage before merging.

### P1.6 · Hero detail "Upgrade Costs" Tier 6 ✨
**Status**: noted as TBC in `hero-upgrade-costs.ts`. Per user (Wave 19), no hero has ★6 in-game — `STAR_SHARD_COSTS` now stops at tier 5.
**Action**: re-verify when next major Kingshot update lands. If wiki publishes ★6 cost, add the row + update `STAR_SHARD_TOTAL_KNOWN`.
**Effort**: S (15 minutes data update + spot-check).

---

## 📅 P2 — Next 1-3 months (substantial features)

### P2.1 · Event guide pages (7 more)
**Status**: `Bear1Guide.tsx` is the template; the other 7 events are placeholders.
**Events to build**:
- KvK
- Viking Vengeance
- Tri-Alliance Clash
- Cesar's Fury
- Swordland Showdown
- Lunar Festival
- Castle Battle
**Effort**: M per event (about 1 week each). Total: 2 months if done serially, or 3-4 weeks if 2-3 are batched.
**Note**: each event is data-driven — could refactor Bear1Guide into a generic `EventGuide` component that takes event-specific data, reducing per-event cost to ~1-2 days each.

### P2.2 · Pet / Masters portrait artwork ingestion
**Status**: scraped icons are available at `/images/icons/kingshot/{pets,masters}/`. Catalogue pages currently use placeholder layouts.
**Action**: build the catalogue grid (mirroring Heroes), wire to a `pets-roster.ts` and `masters-roster.ts` canonical list.
**Effort**: M (1 week for both)

### P2.3 · Member detail page enhancement
**Status**: `MemberDetail.tsx` exists but minimal. Could show:
- Power progression chart (snapshots from `member_power_snapshots` table — already exists)
- Hero roster the member uses
- Event participation history
**Effort**: M (1-2 weeks)

### P2.4 · `AdminOccurrences.tsx` rewrite
**Status**: agent flagged as "bug-prone" with inline `eslint-disable` comments hinting at TanStack Query migration needed.
**Action**: migrate to TanStack Query for proper cache + invalidation.
**Effort**: M (1 week)

### P2.5 · `AdminAnalytics` real metrics
**Status**: agent finding — "push delivery numbers are hardcoded placeholders".
**Action**: wire real metrics from `push_deliveries` table + computed read rates.
**Effort**: M (1 week)

### P2.6 · `AdminChat` backend wiring (Fase Y)
**Status**: agent finding — `AdminChat` persists config to localStorage only, no real backend.
**Action**: design + implement chat backend (Supabase Realtime channel + `chat_messages` table + RLS).
**Effort**: L (2-4 weeks). Realtime moderation, translation, audit logs all in scope.

### P2.7 · Multi-language announcements
**Status**: i18n is full for UI, but admin notifications are written once and pushed in the author's language.
**Action**: auto-translate notification message at send time, cache per-locale variant.
**Effort**: M (1 week)

---

## 🌅 P3 — 3-6 months (architectural improvements)

### P3.1 · Chat feature (Fase 9 from `PLANNING.md`)
Live chat with browser-native Translation API caching.
- `chat_messages` table + RLS
- `chat_translations` cache table
- Supabase Realtime channel
- UI: scroll, infinite back-fill, mentions, soft-delete
**Effort**: L (3-4 weeks)
**Replaces**: Discord as the in-app communication layer.

### P3.2 · Member roster admin uploads
Currently members are added via Supabase Dashboard or `AdminAccounts`. Add bulk import + CSV upload.
**Effort**: M (1-2 weeks)

### P3.3 · Hero-specific shards for more heroes
Currently only Amadeus + Helga use hero-exclusive shards. As more mythics get exclusive-shard mechanics in-game, extend `HERO_EXCLUSIVE_SHARDS` set.
**Effort**: S (5 minutes per hero as they're identified)

### P3.4 · Push notification audience: per-event opt-in
Currently push goes to "all members" or "all voting members" or specific user. Add per-event-type subscriptions ("don't push me about Bear Hunt anymore").
**Effort**: M (1-2 weeks)

### P3.5 · Live members status (auto-updated)
Currently `members.status = 'temporary_out'` is manually toggled. Build a `last_seen_at` column + cron to auto-flag inactive members.
**Effort**: M (1 week)

### P3.6 · TypeScript types regeneration cadence
**Status**: typegen ran ad-hoc in Wave 10. Should be automated monthly.
**Action**: GitHub Action that runs `supabase gen types typescript` monthly + PRs the diff.
**Effort**: S (1 day to set up)

---

## 🎯 P4 — Longer term / aspirational

### P4.1 · Multi-tenancy
**Status**: out of scope per PROJECT_OVERVIEW. Mentioned as a "would require refactor" item.
**Effort**: XL (1+ month). Schema changes, RLS per-tenant, account roles per-tenant.

### P4.2 · Mobile native app (instead of PWA)
**Status**: explicitly out of scope. PWA standalone serves the use case.
**Counter-argument**: native apps avoid iOS PWA quirks (Lessons 1, 2, 14).
**Effort**: XL (2+ months) for Expo / React Native build.

### P4.3 · Server-side rendering / pre-rendering
**Status**: not pursued — SPA + PWA shell is fine.

### P4.4 · GraphQL replacement of Supabase REST
**Status**: not pursued — current REST + RLS scale is fine.

### P4.5 · E2E tests via Playwright
**Status**: `playwright.config.ts.template` exists (per agent finding), not yet enabled.
**Effort**: L (2-3 weeks for meaningful coverage of critical flows).

### P4.6 · Cleanup of 3 dead components
**Status**: agent identified `BorderBeam`, `OrnamentDivider`, `Sparkles` in `src/components/ui/` have ZERO importers.
**Action**: delete files + clean up dead animation keyframes in `index.css`.
**Effort**: S (15 minutes)
**Quick win** — could be done any session.

### P4.7 · Migrate 3 pages off direct Supabase calls
**Status**: agent finding — `Pets.tsx`, `Masters.tsx`, `TroopTiers.tsx` (and `AdminEventParticipants`) call `supabase.from()` directly, bypassing the repository pattern.
**Action**: extract into `pets-repository.ts` etc.
**Effort**: S (half-day each)

### P4.8 · Cosmetic bug in `PowerChart`
**Status**: agent finding — `className="transition-all hover:r-6"` is a no-op (Tailwind doesn't generate `r-*` utilities for SVG `r` attribute).
**Action**: either generate the utility via Tailwind plugin OR use inline style.
**Effort**: S (10 minutes)
**Quick win**.

### P4.9 · `ProtectedAdminRoute` hardcoded English string
**Status**: agent finding — hardcodes "Checking session..." while `RequireAuth` uses `t(...)`.
**Action**: extract to i18n key, mirror `RequireAuth`.
**Effort**: S (10 minutes)
**Quick win**.

---

## 🛑 Explicitly NOT on roadmap

These were considered and REJECTED. Don't re-propose without strong new evidence.

| Item | Why rejected |
|---|---|
| Render the hero detail glass-continuous integration into Hub | User saw mockup, said "não impactante, deixa como está" (Wave 14). |
| Translate game-data labels (skill books, shards) to non-EN | Community convention is EN. Renamed Council "labels only" (URLs stay) confirmed the pattern. |
| Move all admin pages off RHF | Migration was attempted for `AdminPolls` (Wave 11). Marginal benefit, high churn. Other admin pages stay as-is unless they fail. |
| Add Storybook | Not needed; the design system lives in CSS + the existing card-hero variants are reviewable in-context. (Confirmed during `design-sync` shape detection — `shape = package`.) |
| Implement Sentry / error monitoring | Vercel Runtime Logs + Supabase logs cover the immediate need. Add only if user-reported bugs outpace observability. |

---

## ⚡ Quick wins anyone can do today

Bundle these into one PR labeled `chore: housekeeping`. 1-2 hours total.

1. P4.6 — delete 3 dead components
2. P4.8 — fix `PowerChart` SVG-r utility
3. P4.9 — i18n the `ProtectedAdminRoute` loading string
4. P0.2 — rotate Vercel token

---

## How to use this roadmap in a new session

When picking up work:

1. Check P0 first — if anything's red, do that.
2. Otherwise, pick from P1 (high impact, ready).
3. P2/P3 require user buy-in on scope before starting.
4. P4 is for slack time — quick wins or aspirational.

After finishing a roadmap item, **update this file**: move it to the "Done" section below, note the wave / commit that delivered it.

---

## Done (consolidated from session waves)

| Wave | Item | Date |
|---|---|---|
| 1-8 | All P0/P1 items from initial PLANNING.md (auth, members, events, push setup, i18n, etc.) | June 2026 |
| 9 | i18n hardening (browser auto-translate block, parity) | 2026-06-15 |
| 10 | Independent audit + 10 of 17 findings remediated | 2026-06-15 |
| 11 | Push notifications operational (CORS + pg_cron + verify_jwt) | 2026-06-16 |
| 12 | PWA icon system + iOS input zoom v1 | 2026-06-16 |
| 13 | Full icon system regen + cache-bust | 2026-06-16 |
| 14 | RequireAuth gate + fixed header + UX iterations | 2026-06-16 |
| 15 | Council redesign + card variation system | 2026-06-17 |
| 16 | Heroes catalogue redesign + Hero Detail v1 | 2026-06-17 |
| 17 | 459-icon library + heroAvatar alignment | 2026-06-17 |
| 18 | Hero Detail UX (banner compact, locale unified) | 2026-06-17 |
| 19 | Hero Detail polish (banner stats, costs as tabs, ★6 removed) | 2026-06-17 |
| 20 | Hero Detail (framed stats, gear icon, gear tabs) | 2026-06-17 |
| 21 | Skills card unification + description simplifier | 2026-06-17 |
| 22 | Hero banner matches UserHero card visual | 2026-06-17 |
| 23 | Project documentation consolidation (this set of docs) | 2026-06-18 |
