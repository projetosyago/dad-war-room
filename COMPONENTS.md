# DAD War Room — Components Inventory

> Generated 2026-06-18 by automated code reading. Reflects exact current state.
> Stack: React 19 + TypeScript + Tailwind 3 + framer-motion + react-router-dom + react-i18next + Supabase.

## Stats
- Total components: **37**
- Layout / chrome / routing: **8** (Header, BottomNav, AdminBottomNav, Footer, ScrollToTop, RequireAuth, ProtectedAdminRoute, NotificationsPanel)
- Dashboard cards: **7** (under `dashboard/`)
- Login screen: **3** (under `login/`)
- Settings cards: **4** (under `settings/`)
- Admin editors: **2** (under `admin/`)
- UI primitives: **6** (under `ui/`)
- Charts: **1** (`charts/PowerChart`)
- Icons: **2** (`DadCrest`, `icons/TroopGemIcon`)
- Feature cards / shared: **4** (EventCard, MemberCard, PwaInstallModal, I18nText)

## Index by category

**Layout, navigation, routing**
- `Header` + `HeaderSpacer` — fixed top bar with brand, member/admin nav, notifications bell.
- `BottomNav` + `BottomNavSpacer` — mobile-only bottom tab bar (5 member tabs).
- `AdminBottomNav` + `ADMIN_TOP_NAV` — mobile admin nav (Sair + 7 tabs); also exports the array for the desktop header.
- `Footer` — single-line discreet credits.
- `ScrollToTop` — react-router scroll behavior fix + hash anchor handling.
- `RequireAuth` — gates member pages behind signed-in session (layout route via `<Outlet />`).
- `ProtectedAdminRoute` — gates admin pages behind r4/r5 perms.
- `NotificationsPanel` — bell dropdown showing recent push messages.

**Dashboard cards (Hub)**
- `UserHeroCard`, `NextEventCard`, `UpcomingEventsSlider`, `KingdomTimelineCard`, `PendingPollsCard`, `GameCatalogueCard`, `AllEventsCard`.

**Login screen**
- `EmbersBackground`, `ForgeTitle`, `OrnamentStamp`.

**Settings cards**
- `ProfileEditor`, `LanguagePicker`, `PushNotificationsToggle`, `PwaInstallButton`.

**Admin editors**
- `IconPicker`, `RichTextEditor`.

**Charts**
- `PowerChart` — member power timeline.

**Icons (custom SVGs)**
- `DadCrest`, `TroopGemIcon`.

**Feature cards / shared**
- `EventCard`, `MemberCard`, `PwaInstallModal`, `I18nText`.

**UI primitives**
- `ImageWithFallback`, `ImageUploadField`, `AllyChip`, `BorderBeam` *(unused)*, `OrnamentDivider` *(unused)*, `Sparkles` *(unused)*.

---

## Per-component documentation

### `AdminBottomNav` — mobile admin tab strip with horizontal scroll affordances
- **Path**: `src/components/AdminBottomNav.tsx`
- **Used by**: `src/App.tsx`, `src/components/Header.tsx` (consumes the exported `ADMIN_TOP_NAV` array for the desktop variant), `src/contexts/AdminModeContext.tsx` (string references only)
- **Purpose**: 7-tab admin nav (events, polls, members, chat, alliance, notifications, analytics) for mobile, with chevron scroll buttons that appear when content overflows. "Sair" lives outside the scroll container so it can never be obscured.
- **Props**: none (no `interface`). Internal `AdminNavItem` shape:
  ```ts
  interface AdminNavItem {
    to: string
    labelKey: string
    icon: typeof CalendarPlus
  }
  ```
- **Hooks used**: `useCallback`, `useEffect`, `useRef`, `useState`, `useNavigate`, `useTranslation`, `useAdminMode`.
- **External deps**: `react-router-dom` (`NavLink`), `react-i18next`, `@phosphor-icons/react`, `framer-motion` (active-tab `layoutId` glow + dot), `cn`.
- **Renders**: Crimson-tinted `<nav md:hidden fixed>` with safe-area padding, "Sair" pinned left, scrollable 7-`<NavLink>` strip with edge fade gradients + chevron buttons, active tab gets gold halo and dot. Also exports `ADMIN_TOP_NAV` for desktop header reuse.
- **Risks / acoplamentos**: Tight coupling with `Header.tsx` via re-export of `ADMIN_TOP_NAV`; relies on parent `App.tsx` to gate mounting via `adminMode`. `handleExit` order (`navigate(...)` BEFORE `exit()`) is load-bearing — comment explains the auto-enter race in `App.tsx`. ResizeObserver attached per mount.
- **Status**: ✅ Stable

---

### `BottomNav` (+ `BottomNavSpacer`) — mobile member bottom tab bar
- **Path**: `src/components/BottomNav.tsx`
- **Used by**: `src/App.tsx`, `src/components/Header.tsx` (uses `BottomNavSpacer` indirectly), `src/pages/Alliance.tsx`
- **Purpose**: 5-tab member nav (Home, Events, Chat, Alliance, Settings) shown only below md. Uses framer-motion `layoutId` so the gold glow + dot animate between tabs. `BottomNavSpacer` reserves vertical space so page content doesn't sit under the fixed bar.
- **Props**: none. Internal `NavItem` shape:
  ```ts
  interface NavItem {
    to: string
    labelKey: string
    icon: typeof House
    end?: boolean
  }
  ```
- **Hooks used**: `useTranslation`.
- **External deps**: `react-router-dom` (`NavLink`), `react-i18next`, `@phosphor-icons/react`, `framer-motion`, `cn`, `I18nText`.
- **Renders**: `<nav md:hidden fixed>` with inline `paddingBottom: env(safe-area-inset-bottom)`, gold top hairline, 5 `<NavLink>` tabs. Comments explain why inline style (avoids min() clamping) and why min-height in spacer (border-box safe-area math).
- **Risks / acoplamentos**: Tab list hardcoded (Chat is "coming-soon" until Phase Y per comment). Spacer height calc must mirror nav structure exactly — if nav padding changes, spacer must change too.
- **Status**: ✅ Stable

---

### `DadCrest` — inline SVG alliance crest (crimson banner + gold trinity flame)
- **Path**: `src/components/DadCrest.tsx`
- **Used by**: `src/pages/Alliance.tsx`
- **Purpose**: Decorative alliance crest. Inline SVG so it scales perfectly; gold/crimson gradient defs are id-suffixed by `size` to avoid duplicate-id collisions when multiple instances render.
- **Props**:
  ```ts
  interface DadCrestProps {
    size?: number
    className?: string
    withRibbon?: boolean
    ariaLabel?: string
  }
  ```
- **Hooks used**: none.
- **External deps**: none beyond React.
- **Renders**: SVG `viewBox="0 0 240 280"` with optional "DAD" gold-bordered ribbon on top, crimson banner-shield path, inner gold tracing, trinity-flame emblem.
- **Risks / acoplamentos**: Gradient ids use `String(size)` as suffix — two crests at the same size on one page will share def ids (works since defs are identical, but technically duplicate ids).
- **Status**: ✅ Stable

---

### `EventCard` — event tile (active / coming-soon / archived)
- **Path**: `src/components/EventCard.tsx`
- **Used by**: `src/components/dashboard/AllEventsCard.tsx`, `src/components/dashboard/UpcomingEventsSlider.tsx`, `src/components/dashboard/NextEventCard.tsx`, `src/components/dashboard/PendingPollsCard.tsx`, `src/components/dashboard/UserHeroCard.tsx` *(checks suggest these import `EventCard` paths but only AllEventsCard truly uses it as a component; the others share the iconography)*, `src/pages/Hub.tsx`
- **Purpose**: Compact event icon-card. Active becomes a `Link` to `event.guideRoute`; archived/coming-soon stay inert with desaturated icon + status badge.
- **Props**:
  ```ts
  interface EventCardProps {
    event: GameEvent
    index?: number
  }
  ```
- **Hooks used**: `useTranslation`.
- **External deps**: `react-router-dom` (`Link`), `framer-motion`, `react-i18next`, `@phosphor-icons/react`, `ImageWithFallback`, `cn`, `GameEvent` type from `types/domain`.
- **Renders**: motion `<div>` with staggered entry. Inner block: radial accent glow when active, large `ImageWithFallback` icon, status badge (`badge-active` / `badge-mute`), title + description, CTA row.
- **Risks / acoplamentos**: Fallback icon path `/images/events/bear-hunt.png` hardcoded as default if `event.iconUrl` is null.
- **Status**: ✅ Stable

---

### `Footer` — single-line credits strip
- **Path**: `src/components/Footer.tsx`
- **Used by**: `src/App.tsx`
- **Purpose**: Tiny, low-contrast footer. Admin entry is explicitly NOT here (lives in `/settings → Advanced`).
- **Props**: none.
- **Hooks used**: `useTranslation`.
- **External deps**: `react-i18next`.
- **Renders**: One `<p>` with alliance · kingdom · creator name, all uppercase tracking.
- **Risks / acoplamentos**: None.
- **Status**: ✅ Stable

---

### `Header` (+ `HeaderSpacer`) — fixed top bar
- **Path**: `src/components/Header.tsx`
- **Used by**: `src/App.tsx`
- **Purpose**: Fixed header with brand (link to `/`), back button on internal pages, member/admin desktop nav (swapped via `useAdminMode`), and notifications bell with red unread dot. Spacer reserves vertical space so page content doesn't sit under the fixed bar.
- **Props**: `Header` takes none. `HeaderInner` (private) takes `{ adminMode: boolean; onExitAdmin: () => void }`.
- **Hooks used**: `useState` (scrolled, bellOpen), `useEffect` (scroll listener), `useAdminMode`, `useNavigate`, `useLocation`, `useTranslation`, `useMyNotifications`.
- **External deps**: `react-router-dom`, `react-i18next`, `@phosphor-icons/react`, `cn`, `NotificationsPanel`, `useMyNotifications` hook, `useAdminMode` context, `ADMIN_TOP_NAV` from `AdminBottomNav`.
- **Renders**: `fixed top-0` `<header>` with glass blur, scroll-sensitive height (`h-16` → `h-14` on scroll), 3-slot layout on internal pages (back · centered title · bell), full layout on Hub. Gold hairline (or crimson in admin mode) below.
- **Risks / acoplamentos**: `onExit` order — navigate first then `exit()` — comment explains race with `App.tsx` auto-enter effect. Hardcoded brand string `"DAD BIGDADDYS"` with `translate="no"`. `HeaderSpacer` size targets `h-16` floor — comment notes a harmless 8px gap when scrolled (h-14).
- **Status**: ✅ Stable

---

### `I18nText` — long-language-safe translated text wrapper
- **Path**: `src/components/I18nText.tsx`
- **Used by**: `src/components/BottomNav.tsx`
- **Purpose**: Wraps a translated string with overflow defenses (truncate / line-clamp) so PT/DE/RU/KO labels don't blow up tight UI containers. Sets `title` to the full text so truncated content is still discoverable on hover.
- **Props**:
  ```ts
  type Props = {
    k: string
    fallback?: string
    maxLines?: 1 | 2 | 3
    vars?: Record<string, string | number>
    className?: string
    as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4'
    title?: string
    children?: ReactNode
  }
  ```
- **Hooks used**: `useTranslation`.
- **External deps**: `react-i18next`, `cn`.
- **Renders**: Dynamic tag (default `<span>`) with `block min-w-0` plus `truncate` or `line-clamp-N`.
- **Risks / acoplamentos**: Only used in `BottomNav` despite the general-purpose design — broader rollout would help other tight labels.
- **Status**: ✅ Stable

---

### `MemberCard` — alliance member roster row
- **Path**: `src/components/MemberCard.tsx`
- **Used by**: `src/lib/memberAdapter.ts`, `src/pages/Members.tsx`
- **Purpose**: Rich member card: rank-stripe, portrait with rank ribbon, nick, power, troop tier (TG gem image or steel `TroopGemIcon` pre-TG), DAD tag, "out" badge. When `to` is provided the whole card becomes a `<Link>` with stronger hover; AdminMembers omits `to` so admin row-actions don't fight a parent link.
- **Props**:
  ```ts
  interface MemberCardProps {
    m: RosterMember
    index?: number
    heroSlug?: string
    avatarUrl?: string | null
    to?: string
  }
  ```
- **Hooks used**: `useTranslation`.
- **External deps**: `react-router-dom`, `framer-motion`, `react-i18next`, `@phosphor-icons/react`, `ImageWithFallback`, `TroopGemIcon`, `formatPower` + `highestTroopTier` from `data/roster`, `cn`. Types `AllianceRank`, `RosterMember` from `data/roster`.
- **Renders**: motion `<li>` (or `<li><Link>`) with rank-coded stripe, framed portrait, rank ribbon, name + DAD chip + Out badge, power numerals, tier badge (gold TG gem or steel troop gem).
- **Risks / acoplamentos**: Tied to roster shape (`m.rank`, `m.power_m`, `m.dad_tag`, `m.town_center_level`, `m.status`, `m.status_note`). Default hero slugs by rank are hardcoded. Tier image path `/images/tiers/tg${level}.png` assumed.
- **Status**: ✅ Stable

---

### `NotificationsPanel` — bell-dropdown showing recent push messages
- **Path**: `src/components/NotificationsPanel.tsx`
- **Used by**: `src/components/Header.tsx`
- **Purpose**: Floating panel under the bell. Lists recent `push_messages` rows; clicking routes to the message's `tap_target` (hub/events/polls/alliance or external URL). Closes on outside click / Escape.
- **Props**:
  ```ts
  interface NotificationsPanelProps {
    open: boolean
    onClose: () => void
  }
  ```
- **Hooks used**: `useEffect`, `useRef`, `useNavigate`, `useTranslation`, `useMyNotifications`.
- **External deps**: `react-router-dom`, `react-i18next`, `@phosphor-icons/react`, `cn`, `useMyNotifications` hook (provides `messages`, `loading`, `PushMessageRow`, `PushTapTarget`).
- **Renders**: Returns `null` when closed. Open: `role="dialog"` `card-hero` panel anchored top-right; header strip with count, scrollable list of buttons (emoji + title + body + time-ago), footer link to `/alliance#announcements`.
- **Risks / acoplamentos**: Has `eslint-disable-next-line react-hooks/immutability` at line 84 around `window.location.href` assignment for external URLs. Outside-click handler hardcodes `[aria-label="Notifications"]` to avoid racing the bell-trigger's own toggle — fragile if header changes the aria-label.
- **Status**: ⚠️ Has known issues (eslint-disabled mutation; aria-label brittleness)

---

### `ProtectedAdminRoute` — admin-only route gate
- **Path**: `src/components/ProtectedAdminRoute.tsx`
- **Used by**: `src/App.tsx`
- **Purpose**: Wraps admin pages. Loading → placeholder. Signed-out → `/login` with `state.from`. Signed-in but not admin → `/`. Otherwise renders children.
- **Props**:
  ```ts
  interface ProtectedAdminRouteProps {
    children: React.ReactNode
  }
  ```
- **Hooks used**: `useAuth`, `useLocation`.
- **External deps**: `react-router-dom`, `useAuth` hook.
- **Renders**: Loading text, `<Navigate>`, or `<>{children}</>`.
- **Risks / acoplamentos**: Loading state text is hardcoded English ("Checking session...") — not via `useTranslation`. `RequireAuth` uses `t()` for the same purpose, which is inconsistent.
- **Status**: ⚠️ Has known issues (hardcoded English string)

---

### `PwaInstallModal` — tutorial modal for browsers without programmatic install
- **Path**: `src/components/PwaInstallModal.tsx`
- **Used by**: `src/pages/Login.tsx`
- **Purpose**: Platform-specific install steps (iOS Safari Share→Add to Home Screen, macOS Safari File→Add to Dock, Firefox bookmark, generic fallback). Locked body scroll while open; Escape closes.
- **Props**:
  ```ts
  interface Props {
    open: boolean
    platform: InstallPlatform
    onClose: () => void
  }
  ```
- **Hooks used**: `useEffect` (Esc handler + body scroll lock), `useTranslation`.
- **External deps**: `react-i18next`, `@phosphor-icons/react`, `InstallPlatform` type from `usePwaInstall` hook.
- **Renders**: Returns `null` when closed. Otherwise full-screen backdrop + `card-hero` modal with eyebrow, title, subtitle, numbered step list (each with optional icon), close button.
- **Risks / acoplamentos**: Steps computed by `stepsFor(platform, t)` — switch on string union; falls through to generic. Tightly coupled to i18n keys `pwa.install.<platform>.*`.
- **Status**: ✅ Stable

---

### `RequireAuth` — member-page layout gate
- **Path**: `src/components/RequireAuth.tsx`
- **Used by**: `src/App.tsx`
- **Purpose**: Layout route. Loading → placeholder. Signed-out → `/login` preserving `state.from`. Signed-in → `<Outlet />`.
- **Props**: none.
- **Hooks used**: `useAuth`, `useLocation`, `useTranslation`.
- **External deps**: `react-router-dom`, `react-i18next`, `useAuth`.
- **Renders**: Loading text, `<Navigate>`, or `<Outlet />`.
- **Risks / acoplamentos**: Note the inconsistency with `ProtectedAdminRoute` (this one uses `t()`, the other hardcodes).
- **Status**: ✅ Stable

---

### `ScrollToTop` — react-router scroll behavior fix
- **Path**: `src/components/ScrollToTop.tsx`
- **Used by**: `src/main.tsx`, `src/components/NotificationsPanel.tsx` *(string reference for hash-anchor flow only)*
- **Purpose**: Restores "new page = scroll to top" while preserving back/forward scroll position (POP). Also smooth-scrolls to a `#hash` anchor element when present.
- **Props**: none. Renders `null`.
- **Hooks used**: `useEffect`, `useLocation`, `useNavigationType`.
- **External deps**: `react-router-dom`.
- **Renders**: nothing.
- **Risks / acoplamentos**: Uses `'instant' as ScrollBehavior` cast — TS lib types may not include `'instant'` in older defs.
- **Status**: ✅ Stable

---

### `IconPicker` — admin icon library / URL / upload picker
- **Path**: `src/components/admin/IconPicker.tsx`
- **Used by**: `src/data/icon-library.ts` *(provides the data shape `IconEntry`, `IconGroupKey`)*, `src/pages/admin/AdminMilestones.tsx`
- **Purpose**: Three-mode picker for milestone / inline icons: (1) browse the curated ~500-icon library grouped by category, (2) paste a custom URL, (3) upload to the `milestone-bodies` bucket. Emits the chosen URL via `onChange`.
- **Props**:
  ```ts
  export interface IconPickerProps {
    value: string | null
    onChange: (path: string | null) => void
    defaultSuggestion?: string | null
  }
  ```
- **Hooks used**: `useMemo`, `useState`, `useTranslation`.
- **External deps**: `react-i18next`, `@phosphor-icons/react`, `ImageUploadField`, `ICON_GROUPS`, `ALL_ICON_ENTRIES`, `ICON_LIBRARY_COUNT`, `findIconEntry`, `IconEntry`, `IconGroupKey` from `data/icon-library`.
- **Renders**: Card with current-selection preview, search input, group pills, scrollable grouped grid of icon tiles (with "Show more" per group), custom URL input + Apply button, and `ImageUploadField` for upload.
- **Risks / acoplamentos**: Bucket name `milestone-bodies` hardcoded for both the upload destination and the path prefix `milestone-icons`. Helper components (`GroupPill`, `IconTile`) live in same file.
- **Status**: ✅ Stable

---

### `RichTextEditor` — Tiptap WYSIWYG editor (admin)
- **Path**: `src/components/admin/RichTextEditor.tsx`
- **Used by**: `src/lib/sanitize.ts` *(works the inverse direction — provides the HTML this editor produces)*, `src/pages/admin/AdminMilestones.tsx`
- **Purpose**: Tiptap-based rich text editor with H2/H3, bold/italic/underline, ordered/bullet lists, blockquote, alignment L/C/R, image embed (upload + URL), undo/redo. Emits HTML via `onChange` on every doc mutation.
- **Props**:
  ```ts
  export interface RichTextEditorProps {
    value: string
    onChange: (html: string) => void
    placeholder?: string
    minHeight?: string
  }
  ```
- **Hooks used**: `useEditor`, `useEffect`, `useState`, `useTranslation`.
- **External deps**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-image`, `@tiptap/extension-placeholder`, `@phosphor-icons/react`, `react-i18next`, `ImageUploadField`.
- **Renders**: Toolbar (heading 2/3, bold/italic/underline, lists, quote, align, image popover, undo/redo). Optional image-insert popover with upload + URL input. `<EditorContent>` at the bottom. Skeleton while editor not initialized.
- **Risks / acoplamentos**: `// eslint-disable-next-line react-hooks/exhaustive-deps` at line 83 on the external-`value` sync effect (intentional — only re-runs when value changes from outside). Bucket `milestone-bodies` + path `inline-images` hardcoded for image upload.
- **Status**: ⚠️ Has known issues (eslint-disabled deps; external sync may double-emit if upstream isn't careful)

---

### `PowerChart` — pure-SVG line chart of member power over time
- **Path**: `src/components/charts/PowerChart.tsx`
- **Used by**: `src/pages/MemberDetail.tsx`
- **Purpose**: Renders a sorted ASC series of `MemberPowerSnapshot[]` as a gold gradient line + area chart. No external chart library — `~150 LOC` of plain SVG. Native `<title>` tooltips on dot markers.
- **Props**:
  ```ts
  interface PowerChartProps {
    snapshots: MemberPowerSnapshot[]
    height?: number
  }
  ```
- **Hooks used**: `useMemo` (3×: points, ticks/yMin/yMax, paths), `useTranslation`.
- **External deps**: `react-i18next`, `date-fns` (`format`), `@phosphor-icons/react`, `MemberPowerSnapshot` from `types/domain`, `formatPower` from `data/roster`.
- **Renders**: `card-hero` wrapper, header with `TrendUp` icon, "not enough data" message if < 2 snapshots, otherwise `<svg viewBox="0 0 800 ${height}">` with gradient defs, baseline + top dashed guide, min/max y-axis labels, 6 x-axis ticks ("MMM dd"), area fill, line path, dot markers with `<title>` tooltips.
- **Risks / acoplamentos**: Tooltip via `<title>` is browser-default styling; not custom. `className="transition-all hover:r-6"` won't actually animate `r` attribute via Tailwind (no `r-*` utility) — minor cosmetic miss.
- **Status**: ⚠️ Has known issues (`hover:r-6` Tailwind class is a no-op)

---

### `AllEventsCard` — Events page filterable grid
- **Path**: `src/components/dashboard/AllEventsCard.tsx`
- **Used by**: `src/pages/Events.tsx`
- **Purpose**: Pill-filter row (All / Active / Coming Soon / Archived) + responsive grid of `EventCard`s. "All" excludes archived.
- **Props**: none.
- **Hooks used**: `useMemo`, `useState`, `useTranslation`, `useEvents`.
- **External deps**: `framer-motion`, `react-i18next`, `@phosphor-icons/react`, `useEvents`, `EventCard`, `EventStatus`/`GameEvent` types, `cn`.
- **Renders**: motion `<section>` with filter pills + counter, then error callout / skeleton grid / empty state / `EventCard` grid.
- **Risks / acoplamentos**: Grid uses inline `gridTemplateColumns: repeat(auto-fit, minmax(220px, 1fr))` style.
- **Status**: ✅ Stable

---

### `GameCatalogueCard` — Heroes / Pets / Masters / Troop Tiers tile grid
- **Path**: `src/components/dashboard/GameCatalogueCard.tsx`
- **Used by**: `src/pages/Hub.tsx`
- **Purpose**: 2×2 (mobile) / 4-up (sm+) category tiles linking to the catalogue pages. Per design rule (wave 14): NO icon glyphs in tiles, only uploaded game-asset images. Categories without art (pets, masters) render an empty radial-wash placeholder.
- **Props**: none. Internal `CategoryDef`:
  ```ts
  interface CategoryDef {
    to: string
    labelKey: string
    image?: string
    tone: Tone  // 'gold' | 'crimson' | 'steel' | 'violet'
  }
  ```
- **Hooks used**: `useTranslation`.
- **External deps**: `framer-motion`, `react-router-dom`, `react-i18next`, `@phosphor-icons/react` (only `BookBookmark`, `ArrowRight` for chrome).
- **Renders**: motion `<section>` (`card-hero card-hero--steel`) with eyebrow + title, then 4 `<CategoryTile>` Links with tone-coded ring/glow/halo.
- **Risks / acoplamentos**: Pet/master tile placeholders are intentional — change requires updating the comment too.
- **Status**: ✅ Stable

---

### `KingdomTimelineCard` — upcoming K1652 milestones widget
- **Path**: `src/components/dashboard/KingdomTimelineCard.tsx`
- **Used by**: `src/pages/Hub.tsx`
- **Purpose**: List of up to 6 upcoming milestones with category-tinted icons (or hero-portrait stack when milestone refers to a generation). Days-to-go counter on the right.
- **Props**: none.
- **Hooks used**: `useUpcomingMilestones(6)`, `useTranslation`.
- **External deps**: `framer-motion`, `react-router-dom`, `react-i18next`, `@phosphor-icons/react`, `date-fns` (`differenceInCalendarDays`, `format`), `ImageWithFallback`, `resolveMilestoneIcon`/`HeroPortrait` from `lib/milestoneIcon`, `MilestoneCategory` type, `cn`. Internal `HeroStack` helper component.
- **Renders**: `card-hero card-hero--violet` with K1652 header, error / skeleton / empty / list states. Each list item is a Link with either a 4-portrait overlap stack or a single framed icon.
- **Risks / acoplamentos**: Category icon and tint records have explicit entries for all 9 `MilestoneCategory` values — adding a new category requires updating both maps and the i18n keys. Hardcoded K1652 string + image path `/images/buildings/town-center-tg.png`.
- **Status**: ✅ Stable

---

### `NextEventCard` — countdown to next event occurrence
- **Path**: `src/components/dashboard/NextEventCard.tsx`
- **Used by**: `src/pages/Hub.tsx`
- **Purpose**: Hero card showing the next scheduled event with a live D/H/M/S countdown. Empty state has admin-only CTA `/admin/occurrences`.
- **Props**: none.
- **Hooks used**: `useTranslation`, `useNextOccurrence`, `useCountdown`, `useAuth`.
- **External deps**: `framer-motion`, `react-router-dom`, `react-i18next`, `@phosphor-icons/react`, `date-fns` (`format`), `ImageWithFallback`. Internal `TimeBlock` + `Separator` helpers.
- **Renders**: skeleton, error callout, empty state, or `card-hero card-hero--crimson` with framed icon, eyebrow + title + phase badge, countdown row (or "started X days ago"), and footer with UTC timestamp + guide link.
- **Risks / acoplamentos**: Fallback icon `/images/events/bear-hunt.png` hardcoded.
- **Status**: ✅ Stable

---

### `PendingPollsCard` — hub widget for polls awaiting user's vote
- **Path**: `src/components/dashboard/PendingPollsCard.tsx`
- **Used by**: `src/pages/Hub.tsx`
- **Purpose**: Shown only when signed-in AND `isVotingMember`. Lists up to 3 pending polls; if zero, renders an "all clear" success card (Salles 2026-06-15: never hide).
- **Props**: none.
- **Hooks used**: `useTranslation`, `useAuth`, `usePendingPolls(auth.account?.id, auth.isVotingMember)`.
- **External deps**: `framer-motion`, `react-router-dom`, `react-i18next`, `@phosphor-icons/react`.
- **Renders**: Returns `null` if signed-out / not voting member / still loading. Otherwise motion `<div className="card-hero">` (with `card-hero--success` modifier when empty) with eyebrow + title, optional 3-row `<ul>`, footer with counts + view-all link.
- **Risks / acoplamentos**: Returns null while loading — Hub layout therefore can't depend on this card occupying space until data resolves.
- **Status**: ✅ Stable

---

### `UpcomingEventsSlider` — horizontal swipeable next-5-events strip
- **Path**: `src/components/dashboard/UpcomingEventsSlider.tsx`
- **Used by**: `src/pages/Events.tsx`
- **Purpose**: Card-hero wrapper around a horizontally-scrollable strip of the next 5 occurrences (within 14 days). Each slide is its own mini-hero with accent color + radial wash.
- **Props**: none. Internal `EventSlide`'s prop type is inlined.
- **Hooks used**: `useMemo`, `useUpcomingOccurrences(14)`, `useTranslation`, internal `useRelativeLabel` (calls `useTranslation`).
- **External deps**: `framer-motion`, `react-router-dom`, `react-i18next`, `date-fns` (`format`, `isToday`, `isTomorrow`, `formatDistanceToNowStrict`), `@phosphor-icons/react`, `ImageWithFallback`. Internal `EventSlide` component.
- **Renders**: motion card-hero with header, then skeleton row / empty paragraph / `<ul>` of snap-x scroll slides, then footer with count + view-all link.
- **Risks / acoplamentos**: Fallback to `/events` link if `event.guideRoute` is null.
- **Status**: ✅ Stable

---

### `UserHeroCard` — "who you are" hub hero panel
- **Path**: `src/components/dashboard/UserHeroCard.tsx`
- **Used by**: `src/pages/MemberDetail.tsx`, `src/pages/Hub.tsx`
- **Purpose**: Top-of-hub identity panel. Signed-out → visitor variant with `/login` CTA. Signed-in → framed-portrait variant (gold double-ring for members, crimson for allies), displays nick, rank/role, power, TG level, DAD chip.
- **Props**: none.
- **Hooks used**: `useTranslation`, `useAuth`, `useMembers`.
- **External deps**: `framer-motion`, `react-router-dom`, `react-i18next`, `@phosphor-icons/react`, `formatPower` from `data/roster`, `resolveAvatarUrl` from `lib/heroAvatar`. Internal `Stat` helper.
- **Renders**: Loading skeleton, visitor card, or signed-in `card-hero` with rounded medallion avatar (double-ring), name, optional ally chip, stat row (Power image-icon + numeral, TG image + label, fallback role), and footer with username + rank + edit-profile link.
- **Risks / acoplamentos**: Tiered: linked `RosterMember` (joined via `account.memberId`) overrides display name/rank/power/TG. Stat `imageSrc` paths hardcoded: `/images/buildings/truegold-barracks.png`, `/images/tiers/tg${1..8}.png`.
- **Status**: ✅ Stable

---

### `TroopGemIcon` — steel "pre-Truegold" tier gem SVG
- **Path**: `src/components/icons/TroopGemIcon.tsx`
- **Used by**: `src/components/MemberCard.tsx`
- **Purpose**: Inline SVG steel/silver 8-point gem with crossed swords, used as the pre-TG troop tier badge. Per Salles' explicit feedback: NOT the town center building icon.
- **Props**:
  ```ts
  interface TroopGemIconProps {
    size?: number
    className?: string
    withSwords?: boolean
  }
  ```
- **Hooks used**: none.
- **External deps**: none beyond React.
- **Renders**: `viewBox="0 0 64 64"` SVG with gradient defs (id-suffixed by size), outer 8-point gem path, inner facet shadow path, crossed swords + hilts + center jewel when `withSwords`.
- **Risks / acoplamentos**: Same id-collision pattern as `DadCrest` — multiple instances at the same size share gradient ids.
- **Status**: ✅ Stable

---

### `EmbersBackground` — canvas particle fire embers (login screen)
- **Path**: `src/components/login/EmbersBackground.tsx`
- **Used by**: `src/pages/Login.tsx`
- **Purpose**: Canvas-based fire embers simulation with real physics (position, velocity, drift sin wave, thermal acceleration, life decay, per-particle flicker). Additive blending so overlapping embers glow stronger. Respects `prefers-reduced-motion` (renders one static frame), DPR capped at 2, fewer particles on mobile.
- **Props**:
  ```ts
  interface EmbersBackgroundProps {
    particleCount?: number
  }
  ```
- **Hooks used**: `useRef`, `useEffect`.
- **External deps**: none.
- **Renders**: `<canvas className="login-embers" aria-hidden="true">`. Particle pool lives in the effect; resize observer attached to window.
- **Risks / acoplamentos**: Default count: 36 mobile / 60 desktop. Relies on `.login-embers` CSS class existing in `index.css` for positioning.
- **Status**: ✅ Stable

---

### `ForgeTitle` — staggered-reveal "BIGDADDYS" title
- **Path**: `src/components/login/ForgeTitle.tsx`
- **Used by**: `src/pages/Login.tsx`
- **Purpose**: H1 with per-character `<span>` each carrying a `--i` CSS variable. CSS animations (Forge Reveal, Glint Sweep, Ember Pulse) are defined in `index.css`.
- **Props**:
  ```ts
  interface ForgeTitleProps {
    text?: string
    ariaLabel?: string
    className?: string
  }
  ```
- **Hooks used**: none.
- **External deps**: none.
- **Renders**: `<h1 className="login-title">` with per-character `<span style={{ '--i': i }}>`. Default text `"BIGDADDYS"`.
- **Risks / acoplamentos**: Animation behavior depends on `.login-title` CSS in `index.css`. `'--i' as string` cast in style object.
- **Status**: ✅ Stable

---

### `OrnamentStamp` — DAD acronym filigree stamp under login title
- **Path**: `src/components/login/OrnamentStamp.tsx`
- **Used by**: `src/pages/Login.tsx`
- **Purpose**: Decorative "── Dominate · Ally · Defend ──" stamp. Animates in 1.65s after page load via CSS in `index.css`.
- **Props**:
  ```ts
  interface OrnamentStampProps {
    words?: readonly [string, string, string]
  }
  ```
- **Hooks used**: none.
- **External deps**: none.
- **Renders**: `<div className="login-ornament">` with two flanking lines and a centered stamp of 3 words separated by ` · `.
- **Risks / acoplamentos**: Defaults `['Dominate', 'Ally', 'Defend']` — the words are NOT translated (acronym, by design).
- **Status**: ✅ Stable

---

### `LanguagePicker` — settings language selector
- **Path**: `src/components/settings/LanguagePicker.tsx`
- **Used by**: `src/pages/Settings.tsx`, `src/pages/Login.tsx`
- **Purpose**: Card-hero with click-to-expand language list. Persists choice to `localStorage` (`LANGUAGE_STORAGE_KEY`) and, if signed-in, calls `updateMyProfile` to persist server-side too.
- **Props**: none.
- **Hooks used**: `useState`, `useTranslation`, `useAuth`.
- **External deps**: `react-i18next`, `@phosphor-icons/react`, `SUPPORTED_LANGUAGES` + `LANGUAGE_STORAGE_KEY` from `i18n`, `updateMyProfile` from `repositories/accounts`.
- **Renders**: Card with current flag + native name, "Change" toggle, grid of language buttons with flag + native + ISO code + check mark on active.
- **Risks / acoplamentos**: `LANG_META` is a hardcoded map of 11 languages (en/pt/es/fr/de/ru/tr/ar/zh/ko/ja) — must stay in sync with `SUPPORTED_LANGUAGES`. localStorage swallows errors (private mode); profile update swallows errors (non-fatal). Flag emojis used for visual labels.
- **Status**: ✅ Stable

---

### `ProfileEditor` — display name / password / avatar editor
- **Path**: `src/components/settings/ProfileEditor.tsx`
- **Used by**: `src/pages/Settings.tsx`
- **Purpose**: Three editable rows (display name, password, avatar) with inline expand-to-edit panels. Avatar tab supports hero gallery, custom image upload (`avatars` bucket), or URL paste.
- **Props**: none. Internal sub-components: `ProfileRow`, `NameEditor`, `PasswordEditor`, `AvatarEditor`, `FormActions`.
- **Hooks used**: `useState` (editing tab, busy, status), `useTranslation`, `useAuth`.
- **External deps**: `react-i18next`, `@phosphor-icons/react`, `updateMyProfile` + `changeMyPassword` from `repositories/accounts`, `HERO_SLUGS` + `heroAvatarUrlForSlug` + `resolveAvatarUrl` from `lib/heroAvatar`, `ImageUploadField`.
- **Renders**: Returns `null` if not signed-in. Otherwise card-hero with 3 rows + status banner + active editor panel (Name / Password / Avatar). Password enforces ≥ 8 chars + matching confirm. Avatar tabs between hero gallery (`HERO_SLUGS`) and upload/URL.
- **Risks / acoplamentos**: Multiple async paths each call `auth.refresh()` after success — heavy round-trips. `account.id` used as `pathPrefix` for the avatar upload bucket.
- **Status**: ✅ Stable

---

### `PushNotificationsToggle` — settings push-notifications opt-in
- **Path**: `src/components/settings/PushNotificationsToggle.tsx`
- **Used by**: `src/pages/Settings.tsx`
- **Purpose**: Card-hero exposing the push subscription state via `usePushSubscription`. Subscribe / unsubscribe buttons; passive info row when `VITE_VAPID_PUBLIC_KEY` is missing from the build.
- **Props**: none.
- **Hooks used**: `useTranslation`, `usePushSubscription`.
- **External deps**: `react-i18next`, `@phosphor-icons/react`, `usePushSubscription` hook.
- **Renders**: card-hero header + eyebrow + title + description, then branched footer: not-configured info / loading skeleton / denied warning / subscribed (with deactivate button) / available (with activate button).
- **Risks / acoplamentos**: Depends on `import.meta.env.VITE_VAPID_PUBLIC_KEY` being inlined by Vite at build time. Side-effects fired via `void subscribe()` / `void unsubscribe()` — errors handled inside the hook.
- **Status**: ✅ Stable

---

### `PwaInstallButton` — settings PWA install entry point
- **Path**: `src/components/settings/PwaInstallButton.tsx`
- **Used by**: `src/pages/Settings.tsx`
- **Purpose**: Captures `beforeinstallprompt`, exposes an install button, and on `appinstalled` stamps `pwa_installed_at` on the signed-in account (so admins see install rates in Analytics).
- **Props**: none.
- **Hooks used**: `useState`, `useEffect`, `useTranslation`, `useAuth`.
- **External deps**: `react-i18next`, `@phosphor-icons/react`, `markPwaInstalled` from `repositories/accounts`. Local `BeforeInstallPromptEvent` interface + `isStandalone()` helper.
- **Renders**: card-hero with header + dynamic description, footer with mode label + Install button (or Installed badge).
- **Risks / acoplamentos**: `isStandalone()` uses `window.navigator.standalone` cast for iOS. `markPwaInstalled` errors are swallowed as non-fatal.
- **Status**: ✅ Stable

---

### `AllyChip` — small "ALLY" badge
- **Path**: `src/components/ui/AllyChip.tsx`
- **Used by**: `src/pages/Settings.tsx`, `src/pages/PollDetail.tsx`, `src/pages/Polls.tsx`, `src/pages/admin/AdminAccounts.tsx`
- **Purpose**: Steel-soft chip identifying diplomatic guests (not actual DAD members) anywhere their nick can appear.
- **Props**:
  ```ts
  interface AllyChipProps {
    withIcon?: boolean
    size?: 'xs' | 'sm'
    className?: string
  }
  ```
- **Hooks used**: `useTranslation`.
- **External deps**: `@phosphor-icons/react` (`Handshake`), `react-i18next`, `cn`.
- **Renders**: `<span>` with `bg-steel/15 text-steel-soft` + optional Handshake icon + "ALLY" label, with `title={t('auth.allyChip.tooltip')}`.
- **Risks / acoplamentos**: None.
- **Status**: ✅ Stable

---

### `BorderBeam` — animated gold gradient border beam (UNUSED)
- **Path**: `src/components/ui/BorderBeam.tsx`
- **Used by**: *(none — only its own file references it)*
- **Purpose**: Decorative animated beam tracing the border of its parent. Parent must be `position: relative; overflow: hidden`. Inspired by Magic UI border-beam pattern.
- **Props**:
  ```ts
  interface BorderBeamProps {
    size?: number
    duration?: number
    delay?: number
    colorFrom?: string
    colorTo?: string
    className?: string
  }
  ```
- **Hooks used**: none.
- **External deps**: `cn`.
- **Renders**: Absolute-positioned `<div>` with CSS variables (`--size`, `--duration`, `--delay`, `--color-from`, `--color-to`) driving a `@keyframes border-beam` animation (must live in `index.css`).
- **Risks / acoplamentos**: Dead code — no importers found. Animation `border-beam` must exist in CSS; if removed, this is a no-op.
- **Status**: ⚠️ Has known issues (unused)

---

### `ImageUploadField` — reusable drag-and-drop image upload
- **Path**: `src/components/ui/ImageUploadField.tsx`
- **Used by**: `src/components/admin/IconPicker.tsx`, `src/components/settings/ProfileEditor.tsx`, `src/components/admin/RichTextEditor.tsx`, `src/pages/admin/AdminPets.tsx`, `src/pages/admin/AdminNotifications.tsx`, `src/pages/admin/AdminMasters.tsx`, `src/pages/admin/AdminHeroes.tsx`, `src/pages/admin/AdminTroopTiers.tsx`
- **Purpose**: Drag-and-drop or click-to-pick image upload that returns a public Supabase URL via `onChange`. Validates type + size client-side before talking to Supabase. Bucket config (allowed types + max bytes) lives in `repositories/storage`.
- **Props**:
  ```ts
  export interface ImageUploadFieldProps {
    bucket: ImageBucket
    pathPrefix: string
    value: string | null
    onChange: (url: string | null) => void
    label?: string
    maxSizeBytes?: number
    disabled?: boolean
  }
  ```
- **Hooks used**: `useCallback`, `useRef`, `useState`, `useTranslation`.
- **External deps**: `react-i18next`, `@phosphor-icons/react`, `getBucketConfig` + `uploadImage` + `ImageBucket` type from `repositories/storage`.
- **Renders**: When `value` set: row with preview + "swap" + "remove" buttons. When empty: dashed-border dropzone with cloud icon, drop-or-click hint, type+size hint. Hidden `<input type="file">`. Error message in `text-crimson-glow` if upload fails.
- **Risks / acoplamentos**: `/* eslint-disable react-hooks/preserve-manual-memoization */` block at lines 66 + 92 around the `useCallback`. Comment explains the React 19 Compiler can't preserve the manual memoization because `busy` is read inside the callback and is its own setState target.
- **Status**: ⚠️ Has known issues (eslint-disabled memoization; the comment notes "not critical")

---

### `ImageWithFallback` — img with broken-image placeholder
- **Path**: `src/components/ui/ImageWithFallback.tsx`
- **Used by**: `src/components/MemberCard.tsx`, `src/components/EventCard.tsx`, `src/components/dashboard/KingdomTimelineCard.tsx`, `src/components/dashboard/NextEventCard.tsx`, `src/components/dashboard/UpcomingEventsSlider.tsx`, `src/pages/Pets.tsx`, `src/lib/milestoneIcon.ts`, `src/pages/MilestoneDetail.tsx`, `src/pages/Masters.tsx`, `src/pages/TroopTiers.tsx`
- **Purpose**: Drop-in `<img>` that swaps to a gold-bordered dashed placeholder on `onError`. Lazy-loaded by default.
- **Props**:
  ```ts
  interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string
    alt: string
    className?: string
    fallbackClassName?: string
  }
  ```
- **Hooks used**: `useState`.
- **External deps**: `@phosphor-icons/react` (`ImageBroken`), `cn`.
- **Renders**: Either `<img>` or a dashed `<div role="img">` with `ImageBroken` icon + alt text label.
- **Risks / acoplamentos**: Fallback `aria-label` literal English: `${alt} (image not available)`.
- **Status**: ✅ Stable

---

### `OrnamentDivider` — decorative gold horizontal divider (UNUSED)
- **Path**: `src/components/ui/OrnamentDivider.tsx`
- **Used by**: *(none — only its own file)*
- **Purpose**: Gold filigree horizontal divider: `─── ◆ [LABEL] ◆ ───`. Optional center label.
- **Props**:
  ```ts
  interface OrnamentDividerProps {
    className?: string
    label?: string
  }
  ```
- **Hooks used**: none.
- **External deps**: `cn`.
- **Renders**: flex row of: hairline + diamond + optional uppercase label + diamond + hairline.
- **Risks / acoplamentos**: Dead code — no importers found.
- **Status**: ⚠️ Has known issues (unused)

---

### `Sparkles` — drift-floating gold particles (UNUSED)
- **Path**: `src/components/ui/Sparkles.tsx`
- **Used by**: *(none — only its own file)*
- **Purpose**: Decorative absolute-positioned drift sparkles. Pure CSS animation, no JS runtime cost. Deterministic PRNG seeded by `seed` for SSR/hydration stability.
- **Props**:
  ```ts
  interface SparklesProps {
    count?: number
    className?: string
    seed?: number
  }
  ```
- **Hooks used**: `useMemo`.
- **External deps**: `cn`.
- **Renders**: Absolute container with N `<span>` particles, each styled with top/left/size/opacity/animation-delay/duration from the seeded PRNG. Uses `animate-drift` animation (must live in `index.css`).
- **Risks / acoplamentos**: Dead code — no importers found. Requires `animate-drift` keyframes in CSS.
- **Status**: ⚠️ Has known issues (unused)
