# DAD War Room — Screens Inventory

> Generated 2026-06-18 by automated code reading. Reflects exact current state.
>
> Source of truth: `src/App.tsx` (route table), `src/pages/**/*.tsx` (34 page files),
> `src/components/BottomNav.tsx` + `src/components/AdminBottomNav.tsx` (nav tabs),
> `src/components/RequireAuth.tsx` + `src/components/ProtectedAdminRoute.tsx` (auth gates).

---

## Routes table

| Path | Page component | Auth gate | Purpose |
|---|---|---|---|
| `/login` | `Login` | public | Throne Hall sign-in (username/password) |
| `/` | `Hub` | member | Landing dashboard (hero, next event, polls, catalogue, timeline) |
| `/events` | `Events` | member | Upcoming events slider + full event catalogue |
| `/chat` | `Chat` | member | Placeholder for live chat (Fase Y) |
| `/alliance` | `Alliance` | member | Public alliance hub (crest, stats, announcements) |
| `/alliance/members` | `Members` | member | Roster directory (search, sort) |
| `/alliance/members/:nick` | `MemberDetail` | member | Per-member profile + power chart + history |
| `/alliance/polls` | `Polls` | member | Polls list (open / decided / archived tabs) |
| `/alliance/polls/:slug` | `PollDetail` | member | Single poll: vote, results, timeline, share |
| `/p/:token` | `PollByToken` | member | Short-URL resolver → redirects to canonical poll slug |
| `/heroes` | `Heroes` | member | Hero catalogue grouped by rarity |
| `/heroes/:slug` | `HeroDetail` | member | Hero stats / skills / upgrade-cost tables |
| `/pets` | `Pets` | member | Pet catalogue (Supabase) |
| `/masters` | `Masters` | member | Master characters list (Supabase) |
| `/troop-tiers` | `TroopTiers` | member | Troop tier reference (regular + truegold) |
| `/timeline/:slug` | `MilestoneDetail` | member | Kingdom timeline milestone detail |
| `/about` | redirect → `/alliance` | member | Legacy alias |
| `/settings` | `Settings` | member | Language, PWA, push, profile, admin entry |
| `/bear-1` | `Bear1Guide` | member | Bear Hunt 1 teaser page |
| `/members` | redirect → `/alliance/members` | member | Legacy alias |
| `/polls` | redirect → `/alliance/polls` | member | Legacy alias |
| `/polls/:slug` | redirect → `/alliance/polls/:slug` | member | Legacy alias |
| `/admin/login` | redirect → `/login` | public | Legacy alias |
| `/admin` | redirect → `/admin/events` | admin | Admin landing |
| `/admin/events` | `AdminEvents` | admin | CRUD events catalog |
| `/admin/events/occurrences` | `AdminOccurrences` | admin | Schedule single/recurring occurrences |
| `/admin/events/occurrences/:id/participants` | `AdminEventParticipants` | admin | Pin members to a specific occurrence |
| `/admin/members` | `AdminMembers` | admin | Roster management with edit drawer |
| `/admin/members/accounts` | `AdminAccounts` | admin | Login accounts (create, reset, link, deactivate) |
| `/admin/alliance` | `AdminAlliance` | admin | Alliance settings + hub links |
| `/admin/alliance/timeline` | `AdminMilestones` | admin | CRUD Kingdom Timeline milestones |
| `/admin/alliance/catalogue` | `AdminCatalogue` | admin | Catalogue hub (navigation only) |
| `/admin/alliance/catalogue/heroes` | `AdminHeroes` | admin | CRUD heroes catalogue |
| `/admin/alliance/catalogue/pets` | `AdminPets` | admin | CRUD pets catalogue |
| `/admin/alliance/catalogue/masters` | `AdminMasters` | admin | CRUD masters catalogue |
| `/admin/alliance/catalogue/troop-tiers` | `AdminTroopTiers` | admin | CRUD troop tiers |
| `/admin/polls` | `AdminPolls` | admin | Poll lifecycle management |
| `/admin/chat` | `AdminChat` | admin | Chat config (localStorage placeholder) |
| `/admin/notifications` | `AdminNotifications` | admin | Compose & dispatch push notifications |
| `/admin/analytics` | `AdminAnalytics` | admin | Member-activity KPIs dashboard |
| `/admin/dashboard` | redirect → `/admin/events` | admin | Legacy alias |
| `/admin/accounts` | redirect → `/admin/members/accounts` | admin | Legacy alias |
| `/admin/occurrences` | redirect → `/admin/events/occurrences` | admin | Legacy alias |
| `/admin/milestones` | redirect → `/admin/alliance/timeline` | admin | Legacy alias |
| `*` | redirect → `/` | — | Fallback |

**Auth model:**
- `public` — reachable signed-out (only `/login`).
- `member` — wrapped in `<RequireAuth>`; signed-out users redirect to `/login` with `location.state.from` preserved.
- `admin` — additionally wrapped in `<ProtectedAdminRoute>`; signed-in non-admins (r1/r2/r3, allies) bounce to `/`.

---

## Navigation flow

```
[ Entry: any URL ]
        │
        ▼
  RequireAuth ── signed-out ──► /login ──(success)──► return to requested URL (or /)
        │
        └── signed-in ─► page renders inside chrome (Header + Footer + BottomNav)
                          │
                          ▼
              ┌─────────────────────────────────────────┐
              │  Member BottomNav (5 tabs, mobile)      │
              │   [Home /]  [Events /events]            │
              │   [Chat /chat]  [Alliance /alliance]    │
              │   [Settings /settings]                  │
              └─────────────────────────────────────────┘

  Sub-flows reachable from member chrome:
    /                ──► UserHeroCard / NextEventCard / PendingPollsCard / GameCatalogueCard / KingdomTimelineCard
    /events          ──► UpcomingEventsSlider (cards link to event details)
                      ──► AllEventsCard (browse all events)
    /alliance        ──► /alliance/polls
                      ──► /alliance/members
                      ──► announcement tap_target → /, /events, /alliance/polls, /alliance, or external tap_url
    /alliance/members        ──► /alliance/members/:nick (per-member detail)
    /alliance/members/:nick  ──► /alliance/members (not-found back link)
    /alliance/polls          ──► /alliance/polls/:slug
                              ──► /admin/polls (admin-only "New poll" CTA)
    /alliance/polls/:slug    ──► native share or copy /p/:token
                              ──► /alliance/polls (back on not-found)
                              ──► /admin/polls (draft banner)
                              ──► /login (signed-out banner — unreachable behind RequireAuth)
    /p/:token        ──► (resolves) → /alliance/polls/:slug
                      ──► /alliance/polls (browse link on 404)
    /heroes          ──► /heroes/:slug
    /heroes/:slug    ──► /heroes (not-found back)
    /pets, /masters, /troop-tiers  ──► (terminal — no detail pages)
    /timeline/:slug  ──► milestone.sourceUrl (new tab)
    /bear-1          ──► /events
    /chat            ──► /settings (CTA to enable push notifications)
    /settings        ──► /admin/events (admin-only "Open admin" button)
                      ──► /login (signed-out fallback)

  Admin entry (Settings → Open admin OR direct /admin/* URL):
    App.tsx auto-flips adminMode when pathname starts with /admin/ AND auth.isAdmin.
    BottomNav swaps for AdminBottomNav (mobile, 7 scrollable tabs + Sair button).

              ┌──────────────────────────────────────────────┐
              │  AdminBottomNav (7 tabs + Sair, mobile)      │
              │   [Sair → navigate('/settings') then exit()] │
              │   [Eventos]  [Polls]  [Membros]              │
              │   [Chat]  [Aliança]  [Notif]  [Analytics]    │
              └──────────────────────────────────────────────┘

  Admin sub-flows:
    /admin/events            ──► /admin/events/occurrences
                              ──► /admin (back via legacy redirect)
    /admin/events/occurrences        ──► /admin/events (back)
                                       ──► /admin/events/occurrences/:id/participants
    /admin/events/occurrences/:id/participants  ──► /admin/events/occurrences (back)

    /admin/members           ──► /admin/members/accounts
                              ──► /admin (back)
    /admin/members/accounts  ──► /admin/members (back)

    /admin/alliance          ──► /admin/alliance/timeline
                              ──► /admin/alliance/catalogue
                              ──► /admin/notifications
                              ──► /alliance (public preview)
                              ──► /admin (back)
    /admin/alliance/timeline ──► /admin/alliance (back)
                              ──► /timeline/:slug (public view + preview, target="_blank")
    /admin/alliance/catalogue          ──► /admin/alliance (back)
                                        ──► /admin/alliance/catalogue/{heroes,pets,masters,troop-tiers}
    /admin/alliance/catalogue/heroes       ──► /admin/alliance/catalogue (back)
    /admin/alliance/catalogue/pets         ──► /admin/alliance/catalogue (back)
    /admin/alliance/catalogue/masters      ──► /admin/alliance/catalogue (back)
    /admin/alliance/catalogue/troop-tiers  ──► /admin/alliance/catalogue (back)

    /admin/polls             ──► /admin (back)
                              ──► /alliance/polls/:slug (preview per row)
                              ──► clipboard ${origin}/p/${shareToken}
    /admin/chat              ──► /admin (back)
    /admin/notifications     ──► /admin (back)
    /admin/analytics         ──► /admin (back)
```

---

## Per-screen documentation

### `Hub` (route: `/`)
- **Path**: src/pages/Hub.tsx
- **Auth**: member-only
- **Purpose**: Landing dashboard for signed-in members; composes hero, upcoming events, pending polls, game catalogue, and kingdom timeline cards.
- **Data consumed**: None directly — delegates to child cards (UserHeroCard, NextEventCard, PendingPollsCard, GameCatalogueCard, KingdomTimelineCard).
- **Data sent**: None directly.
- **Components used**: UserHeroCard, NextEventCard, PendingPollsCard, GameCatalogueCard, KingdomTimelineCard.
- **Business rules enforced**: None.
- **Navigation OUT**: None at this layer (handled by child cards).
- **Performance notes**: Pure composition; cost lives in child cards.
- **Status**: ✅ Stable

### `Login` (route: `/login`)
- **Path**: src/pages/Login.tsx
- **Auth**: public
- **Purpose**: Throne Hall sign-in with username/password against Supabase auth; offers inline language picker and PWA install entry point.
- **Data consumed**: `useAuth` (status, signInWithUsername), `usePwaInstall`, `useTranslation` (i18next), `SUPPORTED_LANGUAGES` constant.
- **Data sent**: Indirectly via `auth.signInWithUsername(username, password)` (resolved by auth repo to synthetic-email Supabase signIn — no direct `.from()` calls).
- **Components used**: EmbersBackground, ForgeTitle, OrnamentStamp, PwaInstallModal.
- **Business rules enforced**: Required username/password validation; friendly mapping of "Invalid login credentials" Supabase error; redirect-loop guard (excludes `/login` and `/sem-permissao` — actually only redirects if already signed-in to `redirectTo` or `/`); persists chosen language to localStorage.
- **Navigation OUT**: `navigate(redirectTo, { replace: true })` after signed-in (defaults to `/`).
- **Performance notes**: Background video + canvas embers; video gracefully hidden on error. No data fetching.
- **Status**: ✅ Stable

### `Events` (route: `/events`)
- **Path**: src/pages/Events.tsx
- **Auth**: member-only
- **Purpose**: Events landing page showing next 5 occurrences in a horizontal slider plus the full catalogue.
- **Data consumed**: None directly — delegates to UpcomingEventsSlider and AllEventsCard.
- **Data sent**: None directly.
- **Components used**: UpcomingEventsSlider, AllEventsCard.
- **Business rules enforced**: None.
- **Navigation OUT**: None at this layer.
- **Performance notes**: Pure composition.
- **Status**: ✅ Stable

### `Chat` (route: `/chat`)
- **Path**: src/pages/Chat.tsx
- **Auth**: member-only
- **Purpose**: Placeholder for the unreleased live chat; teases upcoming features (image upload, cross-alliance, history/reactions) and points users at push notifications as the interim broadcast channel.
- **Data consumed**: `useTranslation` only.
- **Data sent**: None.
- **Components used**: Local `FeatureCard` only.
- **Business rules enforced**: None.
- **Navigation OUT**: `Link to="/settings"` (enable push notifications).
- **Performance notes**: Static content.
- **Status**: ✅ Stable (placeholder by design; live channel pending)

### `Alliance` (route: `/alliance`)
- **Path**: src/pages/Alliance.tsx
- **Auth**: member-only
- **Purpose**: Alliance landing page with crest hero, key stats (rank/members/power), CTAs to subroutes (polls, members), composition snapshot, and recent announcements feed.
- **Data consumed**: `useAllianceSettings` (rank/motto/tagline), `useMembers`, `useMyNotifications` (audience-filtered push messages), `useTranslation`.
- **Data sent**: None.
- **Components used**: DadCrest, I18nText; local `CtaCard`, `StatTile`, `Compo` helpers.
- **Business rules enforced**: Falls back to hardcoded rank/motto/tagline if settings row missing; computes totals (totalPower, active members excluding `temporary_out`, TG5+, TG-any) from members list; maps announcement `tap_target` to internal routes (`hub→/`, `events→/events`, `polls→/alliance/polls`, `alliance→/alliance`) or external URL via `tap_url`; trims announcements to first 5.
- **Navigation OUT**: `/alliance/polls`, `/alliance/members`, plus per-announcement target (`/`, `/events`, `/alliance/polls`, `/alliance`, or `tap_url`).
- **Performance notes**: Reduces over full members list on every render for power/composition aggregates — fine for current alliance size; consider memoization if member count grows.
- **Status**: ✅ Stable

### `Bear1Guide` (route: `/bear-1`)
- **Path**: src/pages/Bear1Guide.tsx
- **Auth**: member-only
- **Purpose**: Preview/teaser page for the Bear Hunt 1 guide showing the 4 joiner hero portraits and a "coming soon" description.
- **Data consumed**: `heroImage(id)` from `../data/events`; `useTranslation`.
- **Data sent**: None.
- **Components used**: None beyond framer-motion primitives.
- **Business rules enforced**: Hardcoded joiner hero list (amadeus/B1, chenko/B2, amane/B3, yeonwoo/B4).
- **Navigation OUT**: `Link to="/events"`.
- **Performance notes**: Static; images lazy-loaded.
- **Status**: ✅ Stable (preview by design — full guide pending)

### `Settings` (route: `/settings`)
- **Path**: src/pages/Settings.tsx
- **Auth**: member-only
- **Purpose**: User settings hub — language, PWA install, push notifications, profile editor, account info, and admin-mode entry point.
- **Data consumed**: `useAuth` (status, account, user, role flags), `useAdminMode` (enter), `useTranslation`.
- **Data sent**: None directly (delegated to child components like ProfileEditor for profile mutations and PushNotificationsToggle for push prefs).
- **Components used**: LanguagePicker, PwaInstallButton, PushNotificationsToggle, ProfileEditor, AllyChip.
- **Business rules enforced**: Renders ProfileEditor and account card only when signed-in; "Open admin" button visible only if `auth.isAdmin`; sign-out button always visible when signed-in; ally chip shown when `auth.isAlly`.
- **Navigation OUT**: `navigate('/admin/events')` (admin entry); `Link to="/login"` (signed-out state); `auth.signOut()` (no explicit navigate — handled by auth).
- **Performance notes**: Lightweight; no large lists.
- **Status**: ✅ Stable

### `Members` (route: `/alliance/members`)
- **Path**: src/pages/Members.tsx
- **Auth**: member-only
- **Purpose**: Searchable, sortable directory of alliance members with combined-power summary; links to per-member detail pages.
- **Data consumed**: `useMembers`, `useAccounts`, `membersToRoster`, `resolveAvatarUrl`, `RANK_ORDER`/`tierSortValue`/`highestTroopTier`/`formatPower` from `../data/roster`.
- **Data sent**: None.
- **Components used**: MemberCard.
- **Business rules enforced**: Case-insensitive nick filter; four sort modes (power desc, tier desc with `tierSortValue`, rank desc with power tiebreaker, nick asc); maps each member to a resolved avatar URL (uploaded → hero slug → seeded fallback by `account.username` or `member.id`); shows skeletons during load; error callout on fetch failure.
- **Navigation OUT**: Per-row `to={`/alliance/members/${encodeURIComponent(m.nick)}`}` via MemberCard.
- **Performance notes**: Memoized roster/avatar map/sorted list keyed on `dbMembers`, `accounts`, `query`, `sort`. Builds Map of accounts-by-memberId per render of avatar memo — acceptable at current scale. Renders all matches in a CSS grid; no virtualization yet.
- **Status**: ✅ Stable

### `MemberDetail` (route: `/alliance/members/:nick`)
- **Path**: src/pages/MemberDetail.tsx
- **Auth**: member-only
- **Purpose**: Per-member profile showing hero card (avatar/rank/power/TG), power history chart, and grouped event participation history.
- **Data consumed**: `useParams` (`nick`), `useMemberDetail(nick)` (member, snapshots, participations, loading, error), `useAccounts`, `resolveAvatarUrl`, `formatPower`, `useTranslation`.
- **Data sent**: None.
- **Components used**: PowerChart; local `Hero`, `Stat`, `ParticipationCard`, `NotFoundCard`.
- **Business rules enforced**: URL nick decoded with `decodeURIComponent`; account lookup by `memberId` to drive avatar; fallback avatar path `/images/icons/kingshot/heroes/howard.webp` when unresolved; `temporary_out` status shown as danger badge with optional `statusNote`; TG-tier image clamped to `tg1`–`tg8`; participation grouped by `eventSlug` with count, latest occurrence ISO, and sorted by latest descending; loading skeletons + error callout + not-found card states.
- **Navigation OUT**: `Link to="/alliance/members"` from NotFoundCard.
- **Performance notes**: Memoized account lookup, avatar URL, and grouped participations. `accounts.find` is O(n) per render — fine at alliance scale. PowerChart cost depends on its own implementation.
- **Status**: ✅ Stable

### `Polls` (route: `/alliance/polls`)
- **Path**: src/pages/Polls.tsx
- **Auth**: member-only
- **Purpose**: Lists all alliance polls grouped into Open/Decided/Archived tabs with countdown badges and per-poll metadata. Read-only list view that drives navigation into poll detail.
- **Data consumed**: `useAuth`, `usePolls({ includeArchived: true })`, `isPollOpen` from `repositories/polls`.
- **Data sent**: None (read-only list).
- **Components used**: `AllyChip`, internal `TabButton`, `EmptyState`, `PollCard`, `StatusBadge`, `ParticipationRing`; `Link` to poll detail and admin polls.
- **Business rules enforced**: Status grouping (`archived` → archived; open via `isPollOpen` → open; else decided); urgency flagged if `<24h` remain; admin-only "New poll" link shown via `auth.isAdmin`; ally users see read-only chip.
- **Navigation OUT**: `/alliance/polls/:slug` (PollCard), `/admin/polls` (admin "New poll" link and empty-state CTA).
- **Performance notes**: Loads archived polls together with active (intentional — for the archived tab); `useMemo` groups polls in a single pass; participation ring intentionally disabled at list-time (no N+1 of votes).
- **Status**: ✅ Stable

### `PollDetail` (route: `/alliance/polls/:slug`)
- **Path**: src/pages/PollDetail.tsx
- **Auth**: member-only
- **Purpose**: Renders a single poll's hero, countdown, options with live tallies, voter chips, 48h sparkline of vote arrivals, and a sticky vote/share action bar. Handles vote casting, clearing, and short-URL sharing.
- **Data consumed**: `useAuth`, `useCountdown`, `usePoll(slug)`; `tallyVotes`, `isPollOpen`, `shouldShowResults` from `repositories/polls`; `markdownToHtml`.
- **Data sent**: Mutations go through `repositories/polls`: `vote(...)` / `clearVote(...)` / `clearAllVotesForPoll(...)` — these write to the `poll_votes` table (insert/delete on toggle). No direct `supabase.from()` calls in this file.
- **Components used**: `AllyChip`; internal `TimeBlock`, `Sep`, `CountdownBlock`, `StatusBadge`, `ParticipationDonut`, `VoteTimelineSparkline`, `VoterChip`.
- **Business rules enforced**: `canVote = open && signed-in && isVotingMember` (ally cannot vote); multi-poll toggles a vote off when already cast, single-poll replaces; `shouldShowResults(poll, { isAdmin })` gates result visibility (also covers `admin_only` and "until close" cases); draft/ally/signed-out banners; leading option highlighted; participation % uses a `max(voters, 10)` floor (acknowledged informational hack).
- **Navigation OUT**: `/alliance/polls` (back link on not-found), `/admin/polls` (draft banner), `/login` (signed-out banner); native share or clipboard copy of `${origin}/p/${shareToken}`.
- **Performance notes**: `useMemo` for `myVotes`, `tallied`, `totalVoters`, `voterIds`, `ranked`; sparkline recomputes every minute via `setInterval`; calls `refetch()` after each vote (full poll reload — acceptable given small vote counts).
- **Status**: ✅ Stable

### `PollByToken` (route: `/p/:token`)
- **Path**: src/pages/PollByToken.tsx
- **Auth**: member-only
- **Purpose**: Short-URL resolver — looks up a poll by its `shareToken` and redirects to the canonical `/alliance/polls/:slug` route; shows a 404 affordance if the token is invalid.
- **Data consumed**: `usePollByShareToken(token)`.
- **Data sent**: None.
- **Components used**: `Navigate` (react-router redirect), error/loading shims.
- **Business rules enforced**: Redirect on success; 404 view on invalid token.
- **Navigation OUT**: `/alliance/polls/:slug` (Navigate replace), `/alliance/polls` (browse link on error).
- **Performance notes**: Minimal — single hook call, no derived state.
- **Status**: ✅ Stable

### `MilestoneDetail` (route: `/timeline/:slug`)
- **Path**: src/pages/MilestoneDetail.tsx
- **Auth**: member-only
- **Purpose**: Detail view for a single kingdom timeline milestone — shows category, unlock date (UTC) with days-to/from-now, source link, and admin-authored HTML body.
- **Data consumed**: `getMilestoneBySlug(slug)` from `repositories/milestones`; `resolveMilestoneIcon`; `sanitizeAdminHtml`.
- **Data sent**: None (read-only).
- **Components used**: `ImageWithFallback`; internal `Detail` sub-component.
- **Business rules enforced**: HTML body is sanitized via `sanitizeAdminHtml` (DOMPurify — references audit finding #09) before injection via `dangerouslySetInnerHTML`; days delta computed against today; category labels via i18n.
- **Navigation OUT**: External `milestone.sourceUrl` opens in new tab (`target="_blank" rel="noreferrer noopener"`); back affordance is delegated to the sticky `Header` (commented in code).
- **Performance notes**: Single effect-based fetch with `alive` guard against unmount races; no list rendering.
- **Status**: ✅ Stable

### `Heroes` (route: `/heroes`)
- **Path**: src/pages/Heroes.tsx
- **Auth**: member-only
- **Purpose**: Hero catalogue page grouped by rarity (Rare → Epic → Mythic with Gen 1–7 subgroups). Each tile is a portrait + name linking into the hero detail page.
- **Data consumed**: Static imports — `RARE_HEROES`, `EPIC_HEROES`, `MYTHIC_GENERATIONS` from `data/heroes-roster.ts`; `heroes-data.json` for names/portraits.
- **Data sent**: None.
- **Components used**: Internal `RaritySection`, `SectionHeading`, `HeroGrid`, `HeroCard`, `Portrait`.
- **Business rules enforced**: Display ordering driven by canonical roster file; portrait fallback chain (local webp → remote scraped portrait → User glyph).
- **Navigation OUT**: `/heroes/:slug` (HeroCard).
- **Performance notes**: All static data — no async fetches; images use `loading="lazy"` and `decoding="async"`; per-card state machine for image fallback avoids imperative DOM hacks.
- **Status**: ✅ Stable

### `HeroDetail` (route: `/heroes/:slug`)
- **Path**: src/pages/HeroDetail.tsx
- **Auth**: member-only
- **Purpose**: Static, data-driven hero detail page — banner with avatar/stats/sources, tabbed Conquest/Expedition skills card, optional Mythic exclusive gear section, and tabbed upgrade-cost tables (Stars / Skills / Widgets).
- **Data consumed**: `heroes-data.json` (keyed by slug); `STAR_SHARD_COSTS`, `SKILL_BOOK_COSTS`, `WIDGET_COSTS`, `skillBookItemName`, `skillBookIcon`, `starShardIcon`, `widgetChestIcon` from `data/hero-upgrade-costs`.
- **Data sent**: None.
- **Components used**: Internal `BannerStats`, `ConquestPanel`, `ExpeditionPanel`, `ExclusiveGearSection`, `SkillRow`, `TabButton`, `RarityChip`, `ChainedImage`, `UpgradeCostsSection`, `StarsPanel`, `SkillsPanel`, `WidgetsPanel`, `ItemHeader`, `CostTable`.
- **Business rules enforced**: Widgets tab only renders for `rarity === 'mythic'`; Exclusive Gear section only renders for mythics with gear data; `simplifyDescription` rewrites scraped skill copy (strips hero-name prefix, "followed by" clauses, narrative lead-ins; converts continuation verbs to imperative); star shard item name special-cases hero-specific shards.
- **Navigation OUT**: `/heroes` (not-found back link).
- **Performance notes**: Heavy `useMemo` use for hero lookup and gear stats; all data is static JSON (no network); image fallback chain via `ChainedImage`.
- **Status**: ✅ Stable

### `Pets` (route: `/pets`)
- **Path**: src/pages/Pets.tsx
- **Auth**: member-only
- **Purpose**: Pets catalogue grid filterable by generation, sourced live from Supabase `pets` table. Each card shows portrait, generation badge, name, and optional description.
- **Data consumed**: Direct `supabase.from('pets').select(...)` (no hook abstraction).
- **Data sent**: None — read-only query: `select(..).eq('active', true).order('generation').order('display_order').order('name')`.
- **Components used**: `ImageWithFallback`; internal `PetCard`, `FilterChip`.
- **Business rules enforced**: Only `active = true` rows are loaded; generation filter chip set is derived from loaded data; empty-state hint suggests "next generation" number.
- **Navigation OUT**: None (no detail page — cards are non-interactive).
- **Performance notes**: Single fetch on mount with `alive` guard; `useMemo` for generation set and filtered visible list; skeletons during load.
- **Status**: ✅ Stable

### `Masters` (route: `/masters`)
- **Path**: src/pages/Masters.tsx
- **Auth**: member-only
- **Purpose**: Lists Master characters in unlock order with portrait, description, and release date. Read-only catalogue page sourced from Supabase.
- **Data consumed**: Direct `supabase.from('masters').select(...)`.
- **Data sent**: None — read-only query: `select(..).eq('active', true).order('unlock_order')`.
- **Components used**: `ImageWithFallback`; internal `MasterCard`, `formatDate`.
- **Business rules enforced**: Only `active = true` masters; date formatted via `toLocaleDateString` with try/catch fallback to raw ISO.
- **Navigation OUT**: None.
- **Performance notes**: Single fetch on mount with `alive` guard; skeleton placeholders during load; no derived computations beyond render.
- **Status**: ✅ Stable

### `TroopTiers` (route: `/troop-tiers`)
- **Path**: src/pages/TroopTiers.tsx
- **Auth**: member-only
- **Purpose**: Lists troop tiers split into Regular and Truegold groups, with tier label, icon, training building requirement, and description. Read-only reference page sourced from Supabase.
- **Data consumed**: Direct `supabase.from('troop_tiers').select(...)`.
- **Data sent**: None — read-only query: `select(..).order('display_order')`.
- **Components used**: `ImageWithFallback`; internal `TierGroup`.
- **Business rules enforced**: Tiers partitioned by `is_truegold` flag; Truegold group rendered with `card-hero--portrait` accent.
- **Navigation OUT**: None.
- **Performance notes**: Single fetch on mount with `alive` guard; `useMemo` for the two group filters; skeletons during load.
- **Status**: ✅ Stable

### `AdminEvents` (route: `/admin/events`)
- **Path**: src/pages/admin/AdminEvents.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: List, create, archive, and restore alliance events (the catalog of recurring/seasonal event types).
- **Data consumed**: `useEvents()` hook (lists events with status/metadata).
- **Data sent**: `createEvent()`, `updateEvent()` (restore via status='coming-soon' + archived_at=null), `archiveEvent()` — all targeting the `events` table via repositories/events.
- **Components used**: inline JSX (no major child components); Phosphor icons; standard form inputs.
- **Business rules enforced**: slug auto-generated from name via `slugify()`; new events default to status='coming-soon' with display_order=200; archive uses native `confirm()` dialog; archived rows render at 60% opacity; busy state is per-row (`busyId`).
- **Navigation OUT**: `/admin` (back), `/admin/events/occurrences` (occurrences sub-tool).
- **Performance notes**: Renders entire events list flat (no pagination); shows 4 skeleton items while loading.
- **Status**: ✅ Stable

### `AdminOccurrences` (route: `/admin/events/occurrences`)
- **Path**: src/pages/admin/AdminOccurrences.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: Schedule single or recurring occurrences of events on a calendar (event instances at specific UTC times), and delete upcoming ones.
- **Data consumed**: `useEvents()`; manually fetches via `listOccurrencesInRange(from, to, { includeCancelled: true })` for window of -1 day to +30 days.
- **Data sent**: `createOccurrence()`, `createRecurringOccurrences()` (writes N rows spaced by `intervalHours`), `deleteOccurrence()` — targets `event_occurrences` via repositories/occurrences.
- **Components used**: inline form JSX; Phosphor icons; `date-fns` format.
- **Business rules enforced**: starts_at_utc converted to ISO via `new Date(input).toISOString()`; recurring count capped at 50 in input; default duration=30min, intervalHours=48 (bear hunt cadence hint); default eventId set to first available; "Bear hunt hint" surfaced for interval.
- **Navigation OUT**: `/admin/events` (back), `/admin/events/occurrences/:id/participants` (per-row "squads" link).
- **Performance notes**: Two `useEffect`s with `eslint-disable react-hooks/set-state-in-effect` comments noting need for TanStack migration; fetches full -1d/+30d window on every reload.
- **Status**: ⚠️ Bug-prone (technical debt noted inline re: TanStack migration)

### `AdminEventParticipants` (route: `/admin/events/occurrences/:id/participants`)
- **Path**: src/pages/admin/AdminEventParticipants.tsx
- **Auth**: admin-only (ProtectedAdminRoute + RLS)
- **Purpose**: Per-occurrence squad editor — assign members to a specific event occurrence with role (leader/joiner/standby) and notes; inline edit and remove.
- **Data consumed**: `useEventParticipants(occurrenceId)`, `useMembers()`; direct `supabase.from('event_occurrences').select(..., event:events(...))` for header.
- **Data sent**: `addParticipant()`, `updateParticipant()`, `removeParticipant()` — writes to `event_participants` via repositories/eventParticipants.
- **Components used**: inline `RoleBadge` subcomponent; Phosphor icons; date-fns format.
- **Business rules enforced**: members already assigned filtered out of add-form dropdown (`availableMembers`); two-step crimson confirm for delete; inline edit with cancel; default new role='joiner'; feedback auto-dismisses after 2.2s; notes trimmed-to-null.
- **Navigation OUT**: `/admin/events/occurrences` (back).
- **Performance notes**: `assignedIds` and `availableMembers` memoized; `useEffect` to default draft member id flagged as "needs TanStack migration"; refetches full list after every mutation.
- **Status**: ✅ Stable

### `AdminMembers` (route: `/admin/members`)
- **Path**: src/pages/admin/AdminMembers.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: Roster management — list, filter (by rank, search by nick, temporary_out filter), and edit members via a side-drawer (nick, rank, subgroup, power, TG/TC level, status, notes, language hint).
- **Data consumed**: `useMembers(true)` — `true` likely includes inactive.
- **Data sent**: `updateMember()` — writes to `members` table via repositories/members.
- **Components used**: inline `MemberRow`, `FilterChip`, `EditDrawer` (bottom sheet on mobile, side drawer on desktop).
- **Business rules enforced**: tgLevel and townCenterLevel are mutually exclusive (error thrown client-side if both set); empty strings normalized to null; `left` members excluded from active/power counts; nick trimmed; subgroup '' → null.
- **Navigation OUT**: `/admin` (back), `/admin/members/accounts`.
- **Performance notes**: `filtered` and `counts` memoized; full list flat-rendered (no pagination); skeleton x5 while loading.
- **Status**: ✅ Stable

### `AdminAccounts` (route: `/admin/members/accounts`)
- **Path**: src/pages/admin/AdminAccounts.tsx
- **Auth**: admin-only (ProtectedAdminRoute); r4 can't create r5 (UI hides; Edge Function also enforces)
- **Purpose**: Manage login accounts: create accounts (member/ally/r2–r5), reset passwords, link/unlink to roster members, deactivate/reactivate.
- **Data consumed**: `useAccounts()`, `useAuth()`, `useMembers()`.
- **Data sent**: `createAccount()` (calls Edge Function), `resetAccountPassword()`, `setAccountActive()`, `linkAccountToMember()` — writes to `member_accounts`/`auth.users` via repositories/accounts and repositories/members.
- **Components used**: inline `AccountRow`, `LinkPicker` (member-search overlay), `FilterChip`, `AllyChip`.
- **Business rules enforced**: r4 cannot create r5 (filtered from `allowedRoles`); cannot deactivate self (alert + button disabled); password min 6 chars (validated via `prompt` + alert); username pattern `[a-z0-9._-]{2,32}`; members already linked to another account are hidden from picker; ally accounts cannot be linked to roster; uses `window.prompt`/`window.confirm`/`window.alert` (not custom modals).
- **Navigation OUT**: `/admin/members` (back).
- **Performance notes**: `memberById` and `linkedMemberIds` memoized; full list flat-rendered; uses native browser prompts (UX limitation, not perf).
- **Status**: ✅ Stable

### `AdminAlliance` (route: `/admin/alliance`)
- **Path**: src/pages/admin/AdminAlliance.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: Alliance admin hub — links to Kingdom Timeline + Catalogue + Announcements, plus inline editor for the `alliance_settings` singleton (rank, motto, tagline, brand colors, capture date) used on the public `/alliance` page.
- **Data consumed**: `useAllianceSettings()`.
- **Data sent**: `updateAllianceSettings()` — writes the singleton row to `alliance_settings` via repositories/allianceSettings; all empty strings normalized to null.
- **Components used**: inline `AllianceMetadataEditor`, `AdminAllianceCta`, `Field` subcomponents.
- **Business rules enforced**: All fields trimmed; empty→null on save; brand color swatches preview live via inline `style={{ background }}`; save flash auto-shows "Saved" indicator with timestamp.
- **Navigation OUT**: `/admin` (back), `/admin/alliance/timeline`, `/admin/alliance/catalogue`, `/admin/notifications`, `/alliance` (public link in intro text).
- **Performance notes**: One `useEffect` to hydrate form state from async settings (flagged for TanStack migration); no list rendering.
- **Status**: ✅ Stable

### `AdminMilestones` (route: `/admin/alliance/timeline`)
- **Path**: src/pages/admin/AdminMilestones.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: CRUD for Kingdom Timeline milestones — create with name/category/unlock-date/notes/slug, then expand each row to edit rich-text body, icon, achieved flag, and metadata.
- **Data consumed**: `useAllMilestones()`.
- **Data sent**: `createMilestone()`, `updateMilestone()`, `deleteMilestone()` — writes to `milestones` table via repositories/milestones.
- **Components used**: `RichTextEditor` (components/admin), `IconPicker` (components/admin), `resolveMilestoneIcon` helper.
- **Business rules enforced**: slug auto-generated via local `slugify()` (NFD-normalize, strip combining marks, hyphenate, 80-char cap); name required (≤120 chars); notes ≤200 chars; date converted local→ISO; empty strings normalized to null; inline delete requires explicit crimson confirm; flash banner auto-dismisses after 2s; categories enum-restricted to 9 options.
- **Navigation OUT**: `/admin/alliance` (back), `/timeline/:slug` (public view + preview, with target="_blank" on preview).
- **Performance notes**: 6 skeleton rows while loading; full list flat-rendered; only the editing row mounts the heavy RichTextEditor.
- **Status**: ✅ Stable

### `AdminCatalogue` (route: `/admin/alliance/catalogue`)
- **Path**: src/pages/admin/AdminCatalogue.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: Catalogue hub — pure navigation page with 4 CTA cards pointing to CRUD pages for game-data tables (heroes, pets, masters, troop tiers).
- **Data consumed**: none (static page)
- **Data sent**: none
- **Components used**: inline `CatalogueCta` subcomponent.
- **Business rules enforced**: none (navigation-only)
- **Navigation OUT**: `/admin/alliance` (back), `/admin/alliance/catalogue/heroes`, `/admin/alliance/catalogue/pets`, `/admin/alliance/catalogue/masters`, `/admin/alliance/catalogue/troop-tiers`.
- **Performance notes**: Static — no fetching, no state.
- **Status**: ✅ Stable

### `AdminHeroes` (route: `/admin/alliance/catalogue/heroes`)
- **Path**: src/pages/admin/AdminHeroes.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: CRUD interface for the Hero catalogue — list, create, edit, and delete heroes with portrait upload and metadata (generation, role, preferred troop branch, release date).
- **Data consumed**: `useHeroes({ includeInactive: true })` hook.
- **Data sent**: `createHero`, `updateHero`, `deleteHero` from `repositories/heroes` (writes to `heroes` table).
- **Components used**: `ImageUploadField` (bucket `milestone-bodies`, prefix `heroes`), internal `HeroFormFields` subcomponent.
- **Business rules enforced**: name required; slug auto-generated via local `slugify()` (NFD-normalised, lowercase, ≤80 chars) but editable; generation min=1/max=12; `preferred_branch` enum (`infantry`/`cavalry`/`archer`/null); empty strings normalised to null before persisting; busy guard on every async action; flash highlight 2s after save; inline confirm-before-delete pattern.
- **Navigation OUT**: `Link to="/admin/alliance/catalogue"` (back button).
- **Performance notes**: 6-row skeleton during load; full list rendered without virtualization (acceptable — hero count is small/bounded).
- **Status**: ✅ Stable

### `AdminPets` (route: `/admin/alliance/catalogue/pets`)
- **Path**: src/pages/admin/AdminPets.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: CRUD interface for the Pet catalogue — mirror of AdminHeroes minus the role/branch fields.
- **Data consumed**: `usePets({ includeInactive: true })` hook.
- **Data sent**: `createPet`, `updatePet`, `deletePet` from `repositories/pets` (writes to `pets` table).
- **Components used**: `ImageUploadField` (bucket `milestone-bodies`, prefix `pets`), internal `PetFormFields` subcomponent.
- **Business rules enforced**: name required; slug auto-generated and editable; generation min=1; empty strings normalised to null; busy guard; 2s flash highlight; inline delete confirmation.
- **Navigation OUT**: `Link to="/admin/alliance/catalogue"` (back).
- **Performance notes**: 6-row skeleton during load; no virtualization (bounded pet count).
- **Status**: ✅ Stable

### `AdminMasters` (route: `/admin/alliance/catalogue/masters`)
- **Path**: src/pages/admin/AdminMasters.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: CRUD interface for the Master (training/leadership unit) catalogue, ordered by an `unlockOrder` instead of generation.
- **Data consumed**: `useMasters()` hook (no `includeInactive` flag, but field is editable).
- **Data sent**: `createMaster`, `updateMaster`, `deleteMaster` from `repositories/masters` (writes to `masters` table).
- **Components used**: `ImageUploadField` (bucket `milestone-bodies`, prefix `masters`), internal `MasterFormFields` subcomponent.
- **Business rules enforced**: name required; slug auto-generated/editable; `unlock_order` min=1; empty strings → null; busy guard; flash highlight; inline delete confirmation.
- **Navigation OUT**: `Link to="/admin/alliance/catalogue"` (back).
- **Performance notes**: 6-row skeleton; no virtualization.
- **Status**: ✅ Stable

### `AdminTroopTiers` (route: `/admin/alliance/catalogue/troop-tiers`)
- **Path**: src/pages/admin/AdminTroopTiers.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: CRUD interface for troop tier reference data (tier label, display order, building level requirement, Truegold flag, icon).
- **Data consumed**: `useTroopTiers()` hook.
- **Data sent**: `createTroopTier`, `updateTroopTier`, `deleteTroopTier` from `repositories/troopTiers` (writes to `troop_tiers` table).
- **Components used**: `ImageUploadField` (bucket `milestone-bodies`, prefix `troop-tiers`), internal `TierFormFields` subcomponent.
- **Business rules enforced**: `tier_label` required (max 16 chars); `training_building_level` optional (empty string → null); `is_truegold` boolean flag; busy guard; flash highlight; inline delete confirmation.
- **Navigation OUT**: `Link to="/admin/alliance/catalogue"` (back).
- **Performance notes**: 6-row skeleton; no virtualization (tier count is small).
- **Status**: ✅ Stable

### `AdminPolls` (route: `/admin/polls`)
- **Path**: src/pages/admin/AdminPolls.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: Poll management console — create polls with options/schedule/visibility, filter by status, and run lifecycle actions (publish, close, reopen, archive, unarchive, delete) plus share-link copy.
- **Data consumed**: `usePolls({ includeDrafts: true, includeArchived: true })` hook.
- **Data sent**: `createPoll`, `publishPoll`, `closePollNow`, `reopenPoll`, `archivePoll`, `unarchivePoll`, `deletePoll` from `repositories/polls` (writes to `polls`/`poll_options` tables); reads `isPollOpen` helper.
- **Components used**: `react-hook-form` + `useFieldArray` + `zodResolver`; internal `PollAdminRow` and `TypePick` subcomponents.
- **Business rules enforced**: Zod schema — title 1–140 chars, description ≤2000, 2–12 options, no duplicate option labels (case-insensitive), poll type `single`/`multi`, initial status `draft`/`open`, results visibility `during`/`after_close`/`admin_only`; `opensAt`/`closesAt` converted to ISO; `window.confirm` before delete; per-row `busyId` lock during async actions; status-tinted action buttons appear conditionally per poll status.
- **Navigation OUT**: `Link to="/admin"` (back); per-row `Link to={'/alliance/polls/${poll.slug}'}` (preview); clipboard writes `${origin}/p/${shareToken}`.
- **Performance notes**: 3-row skeleton; in-memory filter+count over `polls` array (fine at expected scale).
- **Status**: ✅ Stable

### `AdminChat` (route: `/admin/chat`)
- **Path**: src/pages/admin/AdminChat.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: Chat moderation/config panel — adjusts per-user rate limits, image-attachment policy, and exposes a "Clear all messages" purge action.
- **Data consumed**: `localStorage` key `dad-war-room.chat-config` via `loadConfig()` lazy initializer (no Supabase yet).
- **Data sent**: `localStorage.setItem` only; comment at line 81 marks where `DELETE FROM chat_messages` will be wired in "Fase Y" — no backend mutation today.
- **Components used**: Internal `ConfigCard`, `NumberRow`, `ToggleRow` subcomponents.
- **Business rules enforced**: `messagesPerHour` 1–1000; `minSecondsBetweenMessages` 0–120; `maxFileSizeMb` 1–50; `dirty` flag disables save until changes made; two-step confirmation before purge; reset-to-defaults button.
- **Navigation OUT**: `Link to="/admin"` (back).
- **Performance notes**: Trivial — single localStorage read on mount, no list rendering.
- **Status**: ✅ Stable (UI is a placeholder; backend wiring deferred to "Fase Y" per inline comment — not a defect, scoped by design)

### `AdminNotifications` (route: `/admin/notifications`)
- **Path**: src/pages/admin/AdminNotifications.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: Compose and dispatch push notifications — title/body/emoji/image, audience targeting, tap-target routing, and schedule (now/later/recurring) with live preview and recent-pushes history.
- **Data consumed**: `useAuth()` for `account.id`/`user.id`; `useRecentPushMessages(20)` hook.
- **Data sent**: `createPushMessage` and `sendPushImmediately` from `repositories/notifications` (writes to push messages table; for `schedule === 'now'` it both creates then immediately sends).
- **Components used**: `ImageUploadField` (bucket `notification-images`, prefix `notif-`).
- **Business rules enforced**: title ≤60 chars, body ≤240 chars; `canSend` memo requires title+body, plus `scheduledAt` when `later`, `recurrenceRule` when `recurring`, `tapUrl` when `tapTarget === 'url'`; must be signed in (createdBy from auth); empty strings → null before persisting; emoji preset list (10 entries); audiences: `all`/`voting`/`admins`/`allies`/`custom`; tap targets: `hub`/`events`/`polls`/`alliance`/`url`.
- **Navigation OUT**: `Link to="/admin"` (back).
- **Performance notes**: Recent-pushes list capped at 20; preview panel re-renders on every keystroke of the draft (cheap — small DOM).
- **Status**: ✅ Stable

### `AdminAnalytics` (route: `/admin/analytics`)
- **Path**: src/pages/admin/AdminAnalytics.tsx
- **Auth**: admin-only (ProtectedAdminRoute)
- **Purpose**: Read-only dashboard of member-activity KPIs — live counters (online/sessions/failed signins), last-login activity buckets (24h/7d/30d), PWA install split, push delivery, never-logged-in roster, and language distribution.
- **Data consumed**: `useAccounts()` hook; `countOnlineNow`, `countActiveSessions`, `countFailedSigninsLast24h`, `countNeverLoggedIn` from `repositories/analytics`.
- **Data sent**: None — this page is read-only.
- **Components used**: Internal `Kpi`, `BucketTile`, `SplitBar` subcomponents; `useNowTicker` (30s interval) and `useLiveCounters` (re-fetches when ticker rolls over) custom hooks.
- **Business rules enforced**: `classifyLastLogin` buckets accounts into `1d`/`7d`/`30d`/`never`; "online now" = last login within 5 minutes; "active session" = within 24h; buckets are cumulative (1d counted in 7d and 30d); top-8 language groups only; push delivery section uses hardcoded placeholder values (88 opened / 30 ignored).
- **Navigation OUT**: `Link to="/admin"` (back).
- **Performance notes**: `computeStats` memoized on `[accounts, now]` — O(n) over accounts plus a Map for language counts. Ticker re-renders the whole page every 30s and triggers parallel `Promise.all` of 4 RPC counters — acceptable but worth watching as account count grows. Push split values are stubbed (hardcoded) — not a perf issue but an outstanding data wire-up.
- **Status**: ⚠️ Bug-prone (push delivery numbers are hardcoded placeholders, not real data)
