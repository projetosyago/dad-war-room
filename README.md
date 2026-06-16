# DAD War Room

Alliance command center for **[DAD] BIGDADDYS** in Kingshot, Kingdom 1652.

A mobile-first PWA that replaces ad-hoc Discord threads and screenshot dumps
with a single place for the 87 alliance members to log in, see what's
happening this week, vote on polls, track the kingdom timeline, and receive
push notifications in their own language when something important is about
to start.

---

## What it is

- **Per-member accounts** with role-based admin upgrades (ally, voting
  member, r2/r3, r4/r5 admins). Each member gets a `UserHero` card on the
  Hub with their hero portrait, R-rank, power and TG tier.
- **Events catalogue** with countdowns, polls, kingdom timeline (rich-text
  admin-authored milestone pages), members roster with power-evolution chart,
  and a game catalogue (heroes, pets, masters, troop tiers).
- **Web Push notifications** with audience targeting (all / voting / admins
  / allies / custom), language-aware payloads, recurring schedules, and an
  in-app bell panel for the last 20 deliveries.
- **Admin mode** as a chrome toggle (not a separate app): one shared toolbar
  flip exposes CRUD pages for events, polls, timeline, members, roster
  accounts, alliance metadata, the game catalogue, push notifications,
  chat settings and analytics.

Built mobile-first; designed to be installed as a PWA on members' phones.

---

## Stack

- **React 19** + **Vite 8** + **TypeScript 6** + **Tailwind 3**
- **Supabase** — Postgres (with private-schema SECURITY DEFINER helpers),
  Auth, Storage (3 public-read buckets with per-bucket RLS), Edge Functions
  (`send-push` deployed) and pg_cron for scheduled push delivery
- **Tiptap 3** for rich-text milestone bodies (headings, lists, alignment,
  inline images via Supabase Storage)
- **framer-motion** for the swipe interactions on the upcoming-events slider
  and panel transitions
- **Phosphor Icons (duotone)** for chrome — real game assets from
  `/public/images/{tiers,items,buildings,events,heroes}` are preferred
  whenever a sprite exists
- **Web Push (VAPID)** with a dependency-free service worker handler
  (`public/sw-push.js`)
- **react-router-dom 7**, **i18next 26** (11 languages), **date-fns 4**,
  **clsx** / **tailwind-merge**

Full dependency list lives in [`package.json`](package.json).

---

## Quick start (dev)

```bash
npm install
cp .env.example .env.local      # then fill in your Supabase URL + anon key
npm run dev
```

The dev server runs on `http://localhost:5173`. Sign in with any account
seeded in your Supabase project, or create one via the admin
`/admin/members/accounts` page once an admin is bootstrapped.

Other scripts:

```bash
npm run build       # tsc -b && vite build (use this — see Lesson 13 in WAR_ROOM_LOG.md §3)
npm run preview     # serve the production build locally
npm run lint        # eslint
```

> Do **not** rely on bare `npx tsc --noEmit` for type-checking — the root
> `tsconfig.json` is a references shim and exits 0 trivially. Run
> `npx tsc -b --noEmit` or `npm run build`.

---

## Environment variables

See [`.env.example`](.env.example) for the complete list with inline
comments explaining where each value lives in the Supabase dashboard.

The short version:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Project URL (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | anon public key (Settings → API) — safe to ship to browsers |
| `VITE_VAPID_PUBLIC_KEY` | Web Push public key — paired with `VAPID_PRIVATE_KEY` set as a Supabase secret on the `send-push` Edge Function (never in `.env.local`) |

---

## Project structure

```
src/
├── App.tsx                 # router + React.lazy admin pages
├── main.tsx                # i18n + service worker + Supabase client init
├── pages/                  # public pages (Hub, Events, Alliance, Members, Settings…)
│   └── admin/              # all /admin/* pages (lazy-loaded)
├── components/             # UI primitives + cards (UserHero, NextEvent, etc.)
├── hooks/                  # useAuth, useAllianceSettings, usePushSubscription…
├── repositories/           # all Supabase reads/writes (typed)
├── lib/                    # helpers (push, heroAvatar, milestoneIcon, markdown…)
├── types/database/         # generated Supabase types (do not hand-edit)
├── types/domain.ts         # hand-written domain types
├── locales/                # 11 i18n JSON bundles
└── index.css               # design tokens + card primitives

supabase/
├── migrations/             # numbered SQL migrations (see WAR_ROOM_LOG.md §2.10)
└── functions/
    ├── send-push/          # Web Push delivery + delivery accounting
    ├── create-account/     # admin RPC to provision a new member account
    └── reset-password/     # admin RPC to reset a member's password
```

Architecture notes (decisions in force, palette rotation rules, card
anatomy, RLS pattern, iconography, etc.) live in
[`WAR_ROOM_LOG.md`](WAR_ROOM_LOG.md) §1. Don't re-derive them — read that
section first.

---

## Database

- **Schema and feature semantics** are specified in
  [`PLANNING.md`](PLANNING.md):
  - §3.1 — game catalogue (heroes, pets, masters, troop tiers)
  - §3.2 — members roster, power snapshots, event participants
  - §3.3 — push notifications (subscriptions, messages, deliveries)
- **Applied migrations** (in order) are listed in
  [`WAR_ROOM_LOG.md`](WAR_ROOM_LOG.md) §2.10. Append new migrations there
  as they land so the migration log stays traceable.
- All security-gating helpers (`is_admin`, `is_voting_member`, `is_ally`,
  `account_role`) live in the **`private` schema** as SECURITY DEFINER
  functions. The `authenticated` and `anon` roles **must** have `USAGE` on
  schema `private` — see Lesson 1 in `WAR_ROOM_LOG.md` §3.

After any DDL migration, regenerate the typed client:

```bash
# Supabase MCP: generate_typescript_types — overwrite src/types/database/supabase.ts
# Keep the helper exports (Tables / TablesInsert / TablesUpdate / Enums) at the bottom
# because the generator doesn't always re-emit them (Lesson 6).
```

---

## Deployment

See [`DEPLOY.md`](DEPLOY.md) for the step-by-step go-live guide:
Supabase secrets, Edge Function deployment, pg_cron scheduling, Vercel
setup, and the first-deploy smoke test.

---

## Conventions

Quick-reference cheat-sheet in [`WAR_ROOM_LOG.md`](WAR_ROOM_LOG.md) §6.
Highlights:

- Files > 300 lines → split.
- Color tokens are CSS variables first (`var(--gold)`, `var(--ink-cream)`);
  Tailwind classes are sugar on top.
- All times are **UTC** in storage and in the UI label. Convert only at the
  display layer.
- Slugs are NFD-normalized, lowercase, hyphen-separated, max 80 chars.
- No `any`. No `console.log` in committed code.
- Real game assets beat Phosphor icons when one exists in `/public/images/`.
- Hero titles are **cream**, never gold. Gold is reserved for numerals,
  eyebrows and CTAs.

---

## Lessons learned

[`WAR_ROOM_LOG.md`](WAR_ROOM_LOG.md) §3 is the running list of bugs that
took >30 min to diagnose, with root cause and fix. Read it before adding
features — most of these have re-occurrence traps.

Highlights worth knowing up front:

- **Lesson 1** — SECURITY DEFINER wrappers need schema `USAGE`, not just
  function `EXECUTE`.
- **Lesson 2** — Vite `optimizeDeps.include` must list freshly-installed
  packages; clear `node_modules/.vite/` after install.
- **Lesson 6** — Regenerate Supabase types after every DDL migration.
- **Lesson 13** — `tsc --noEmit` on the root config is not authoritative;
  always run `tsc -b` or `npm run build`.

---

## Credits

Built by **Salles** for **[DAD] BIGDADDYS**, Kingdom 1652.

"Não precisa morrer pra deixar seguro" — basic auth and clean RLS is enough.
