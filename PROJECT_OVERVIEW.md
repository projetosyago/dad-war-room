# DAD War Room — Project Overview

> **Generated**: 2026-06-18 from session knowledge + code reading.
> **Audience**: any developer (human or AI) picking up this project cold.
> **Companion docs**: see ARCHITECTURE.md, COMPONENTS.md, SCREENS.md, DATABASE.md, API_INTEGRATIONS.md, BUSINESS_RULES.md, TECH_DEBT.md, LESSONS_LEARNED.md, ROADMAP.md, HANDOFF_GUIDE.md.

---

## 1 · What is this project

**DAD War Room** is a private Progressive Web App (PWA) — an internal command-center for the alliance **[DAD] BIGDADDYS** of the mobile strategy game **Kingshot** (Kingdom 1652).

It is not a public product. It is a focused tool for a single alliance to:

- See and track its 60-100 members (roster, ranks, power, TG level, status)
- Schedule and announce alliance events (KvK, Bear Hunt, Tri-Alliance Clash, etc.)
- Push announcements to members' phones (Web Push notifications)
- Run lightweight votes ("Council motions") between voting members
- Maintain a Kingdom Timeline of upcoming game milestones (hero generations, TG tier unlocks, new buildings)
- Reference the game catalogue: heroes, pets, masters, troop tiers, upgrade costs

It substitutes a mix of Discord chats, Google Sheets, and personal memory the alliance leadership previously juggled.

**Live production**: <https://dad-war-room.vercel.app>
**GitHub**: <https://github.com/projetosyago/dad-war-room>
**Owner / R5**: Salles (Yago Vinicius de Sales Alves).
**Tone**: institutional alliance command-center but with game-flavoured visual polish — not a casual social app, not a corporate SaaS dashboard either.

---

## 2 · Problem it solves

Before this app, the alliance's coordination lived in three places:

1. **Discord chat** — ephemeral, unsearchable for new members, no structure for upcoming events.
2. **Google Sheets** — for the member power roster; nobody updated them on time.
3. **The R5's head** — for who unlocked what, when the next gen-X hero drops, where to find a hero's gear costs.

Pain points the app fixes:

| Pain | Before | Now |
|---|---|---|
| New member onboarding | "Read pinned messages in Discord" | Land in `/` Hub, see name + power + TG tier in their UserHero card |
| "When's the next event?" | Search Discord pins | "Next event" card on Hub with countdown |
| "How many shards to ★5 Petra?" | "Ask in chat" | `/heroes/petra` → Upgrade Costs tab → table |
| Alliance announcements | Ping `@everyone` in Discord (low signal) | Bell icon in app + Web Push notification |
| Voting on alliance decisions | "Thumbs up in chat" | `/alliance/polls` (Council motions) with audit-grade record |
| Tracking who's on/off | Chat | Members page with status flags + temporary-out |

---

## 3 · Target audience

| Role | Game rank | App role | What they see |
|---|---|---|---|
| Allied outsider | — | `ally` | Read-only access to public info, no roster, no votes |
| Standard member | R2/R3 | `member` | Hub, events, alliance, voting on Council motions |
| Voting member | R3 | `voting_member` flag | Above + vote in polls |
| Alliance officer | R4 | `r4` | Above + admin nav, but limited to specific sections |
| Alliance leader | R5 | `r5` | Full admin access — create accounts, manage everything |

Currently ~60-80 members in production. **No PII** beyond username + game data + (optional) hero portrait avatar.

---

## 4 · Primary user flow

```
Login (username + password)
  │
  ▼
Hub (/)
  ├─ UserHero card — your name, power, TG, R-rank
  ├─ Pending Council motions card (voting members only)
  ├─ Next Event card
  ├─ Game Catalogue (Heroes / Pets / Masters / Troop Tiers)
  └─ Kingdom Timeline (next 6 milestones)
  │
  ├─ BottomNav: Home · Events · Chat · Alliance · Settings
  │
  ▼
Specific pages
  ├─ /events     — full calendar of upcoming events
  ├─ /alliance   — members roster + announcements + Council motions
  ├─ /heroes     — catalogue grouped by rarity → mythic by gen
  ├─ /heroes/:slug — full hero detail (skills, gear, costs)
  ├─ /pets, /masters, /troop-tiers — other catalogues
  ├─ /timeline/:slug — kingdom milestone detail
  ├─ /settings   — profile editor, language picker, PWA install
  └─ /admin/*    — admin-only (R4/R5): accounts, milestones, polls, notifications, analytics
```

Push notifications fire from `pg_cron` → Supabase Edge Function `send-push` → Web Push providers → user's service worker → device notification.

---

## 5 · Stack at a glance

| Layer | Tech | Why |
|---|---|---|
| Frontend | React 19 + Vite 8 + TypeScript 6 | Modern stable SPA |
| Styles | Tailwind CSS 3 + custom `card-hero` design tokens | Utility CSS + game-grade design system |
| Animations | framer-motion | Smooth transitions |
| Icons | @phosphor-icons/react | Game-grade outline + duotone icons |
| Forms | react-hook-form + zod | Type-safe validation |
| Editor | Tiptap | Admin rich-text (milestones, notifications) |
| PWA | vite-plugin-pwa + Workbox | Service worker + Web Push |
| State | React useState/useContext + Supabase realtime | No Redux/Zustand needed |
| i18n | i18next + react-i18next | 11 locales, 1208+ keys, parity-checked in CI |
| Backend | Supabase (Postgres + Auth + Edge Functions + Storage + Realtime) | Single managed BaaS |
| Push | Web Push + VAPID | Native browser push |
| Deploy | Vercel (frontend) + Supabase (backend) | Git-push deploys |
| CI | GitHub Actions | lint + tsc + test + build + i18n parity |
| Tests | Vitest + jsdom + Testing Library | 13 smoke tests as floor |

Full details in **ARCHITECTURE.md**.

---

## 6 · Project status snapshot (2026-06-18)

| Dimension | State |
|---|---|
| Production URL | <https://dad-war-room.vercel.app> ✅ live |
| Push notifications | ✅ operational via `pg_cron → send-push v6 (verify_jwt=false)` |
| Database migrations | 34 applied — all in git (Wave 10 backfill) |
| i18n parity | 11 locales × 1208 leaf keys, CI-enforced |
| Tests | 13 Vitest smoke tests, CI green |
| TypeScript | `tsc --noEmit` clean |
| Lint | 0 errors, 7 pre-existing warnings (non-blocking) |
| Build size | 1080+ PWA precache entries (~26 MB) including 459 scraped game icons |
| Last commit | `e4340f1` — Wave 22 hero banner matches UserHero card visual |

**Known unfinished**: hero detail visual redesign — rejected by user in current iteration, slated for Claude.ai/design tool (`design-sync`). See **ROADMAP.md** for full pending list and **TECH_DEBT.md** for tracked debt.

---

## 7 · How everything connects

```
                        Browser PWA
                            │
                            │ HTTPS
                            ▼
                  Vercel CDN (static SPA)
                            │
            ┌───────────────┼──────────────────────┐
            │               │                      │
            ▼               ▼                      ▼
       Supabase Auth    Supabase REST       Supabase Storage
       (JWT session)    (PostgREST + RLS)   (avatars, milestone images)
                            │
                            │ SECURITY DEFINER fns
                            ▼
                   PostgreSQL (public + private schemas)
                            │
                            │ pg_cron every minute
                            ▼
                  Supabase Edge Function send-push
                            │
                            │ Web Push protocol (VAPID)
                            ▼
                  Browser Service Worker
                            │
                            ▼
                    Device notification

Other services:
  • DeepL / LibreTranslate — i18n MT pipeline (offline, dev-time only)
  • kingshotdata.com REST API — scraped for game catalogue (offline, build-time)
  • kingshotwiki.com S3 — scraped for item icons (offline, build-time)
```

**There is no separate backend server.** Every server-side rule is enforced by one of: PostgreSQL RLS policies, SECURITY DEFINER functions, or Supabase Edge Functions. Frontend talks to Supabase via the official `@supabase/supabase-js` client; no custom API layer.

---

## 8 · Glossary (Kingshot-specific terms)

| Term | Meaning |
|---|---|
| **Alliance** | Group of up to ~100 players who coordinate in-game. Ours: `[DAD] BIGDADDYS`. |
| **R1-R5** | Alliance ranks. R5 = leader (one per alliance), R4 = officers, R3 = trusted, R2/R1 = standard members. |
| **TG / Truegold** | Tier system for building upgrades, TG1 (lowest) to TG8 (highest). Player progression is tracked by max TG level reached. |
| **Power** | Cumulative numeric strength of a player's account, displayed in millions ("155.4M"). |
| **Hero** | Playable character. 34 canonical: 4 Rare + 8 Epic + 22 Mythic (Gen 1-7). |
| **Conquest / Expedition** | Two game modes. Each hero has skills for both. |
| **Skill book** | Item used to upgrade a hero's skill. Rarity (Rare/Epic/Mythic) × Mode (Conquest/Expedition) = 6 distinct items. |
| **Hero Shards** | Item used to advance a hero's star tier (★1 → ★5). |
| **Widget** | Item used to level a Mythic hero's exclusive gear. |
| **Gen** | Hero generation (1-7). Generation = release wave. Mythic only. |
| **KvK / Bear Hunt / Tri-Alliance Clash / Cesar's Fury / etc.** | Named alliance events with their own mechanics. |
| **Council motion** | App's term for an alliance-internal poll. Renamed from "Polls" in Wave 15 (labels only, code identifiers stay). |
| **Hall of Governors** | In-game hero pulling mechanic. Some heroes are listed as "Hall of Governors (Generation N)" unlocks. |
| **NUEN** | (Wrong project context — this term belongs to the *Ler Liberta* sibling project, not DAD War Room. If you see it referenced anywhere in DAD docs, it's a leak from the prior session and should be removed.) |

---

## 9 · What this app is NOT

- **Not a game client.** It doesn't connect to the Kingshot game server. All Kingshot data displayed is either:
  - Manually entered by admins (members, events, milestones, Council motions, hero power values)
  - Scraped at build-time from kingshotdata.com / kingshotwiki.com (hero catalogue, skill data, item icons)
- **Not multi-tenant.** Single alliance. To support multiple alliances would require a tenancy refactor.
- **Not a desktop-first product.** Designed mobile-first for iPhone PWA standalone mode. Desktop works but is not the design target.
- **Not for unauthenticated public visitors.** Every member-facing route is behind `<RequireAuth>`. Only `/login` is public.

---

## 10 · How to start working on it

1. Clone the repo
2. `npm install --legacy-peer-deps` (React 19 peer-dep conflicts require this flag)
3. Copy `.env.example` → `.env.local`, fill in the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (production values from project lead; or set up your own Supabase project for local dev)
4. `npm run dev` — opens at <http://localhost:5173>
5. Log in with a dev account
6. Read **HANDOFF_GUIDE.md** before making any changes — it has the conventions and gotchas that took 22 development waves to learn

For the canonical engineering workflow, see **HANDOFF_GUIDE.md**.
For "what should I work on next", see **ROADMAP.md**.
For "what broke and how I fixed it", see **LESSONS_LEARNED.md**.
