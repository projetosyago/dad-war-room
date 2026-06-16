# DAD War Room — Planning & Roadmap

> Source of truth for the architecture, instructions from Salles, and the
> phased roadmap. This file is read at the start of every session — never
> implement against the spec alone. Always cross-check here first.

> **Visual system locked** in `design-system.md` (DAD CODEX · Inkwell Vault).
> Browse the rendered showcase at `/design-preview.html`. All UI code in
> `src/` is implemented against that spec — no piecemeal iteration allowed.
> Phosphor duotone is the **only** icon source for chrome; game-specific
> visuals come from `/public/images/` (events, items, buildings, heroes,
> tiers/tg1..tg8.png from the wikis).
>
> **VISION SHIFT — 2026-06-14 (login-first architecture).** Salles redefined
> the project from "static-ish strategy hub" to **full alliance command center**.
> The new foundation is **per-member accounts** (shared with admin role
> upgrades), enabling polls, event participation, personal pages, push
> opt-in, and eventually a private chat. See §X below for the full plan.

---

## 0 · Vision

A mobile-first PWA war room for the Kingshot alliance **[DAD] BIGDADDYS**
(Kingdom 1652). Public read for all 87 members; one shared admin login for
Salles (and anyone he trusts) to manage content. Real-time countdowns for
events. Translated push notifications when an event is about to start.

**Time policy:** every date in the database and UI is **UTC**. Game is global;
locals convert mentally. The UI always shows the `UTC` suffix on times. We
may show a secondary "(your local time)" line later, but UTC is authoritative.

**Language policy:**
- Default is **English** (universal). Never auto-pick browser language.
- User pick is cached in `localStorage` (key `dad-war-room.lang`) and survives
  closing/reopening, including PWA installs.
- Adding a new language later = drop a JSON in `src/locales/<code>.json` +
  one line in `src/i18n.ts` + one entry in `LANGUAGES`. Zero refactor.
- Push notifications (Phase 6) must use the recipient's cached language.
- **Nicknames NEVER translate.** Only UI strings around them.

**Languages to ship in Phase 4** (was 10, now **11**):
en, pt, es, fr, de, ru, tr, ar, zh, ko, **ja** (Japanese — added after
roster analysis revealed members 穗道忠悟 and Show剣惑 using Japanese kanji
剣 (Chinese-simplified would be 剑)).
- `zh` covers both Simplified and Traditional members for now; if Traditional
  speakers complain we can later add `zh-TW` separately.
- Hungarian (Ancsika) and Indian (Revanth) members likely play in English —
  not adding `hu` / `hi` until requested.

**Admin policy:**
- One shared admin account (Supabase Auth: 1 email + 1 password).
- `/admin` link is **discreet** — never in the header. Hidden in the footer
  as a low-contrast text link ("Steward" → /admin/login, "War Room" when
  signed in → /admin).
- "Não precisa morrer pra deixar seguro" — basic auth is enough.

---

## 1 · Game terminology cheat sheet

Salles educated me on this; locking it in so we never get confused.

### Troop tiers — exact mapping (per Salles)

Town Center level dictates the highest troop tier you can train. Salles' table:

| Town Center level | Highest troop tier |
|---|---|
| 1–3 | **T1** |
| 4–6 | **T2** |
| 7–10 | **T3** |
| 11–12 | **T4** |
| 13–15 | **T5** |
| 16–18 | **T6** |
| 19–21 | **T7** |
| 22–25 | **T8** |
| 26–29 | **T9** |
| 30 | **T10** |
| TG1 | **TG1** |
| TG2 | **TG2** |
| TG3 | **TG3** |
| TG4 | **TG4** |
| TG5 | **TG5** (current K1652 cap) |
| TG6 | **TG6** |
| TG7 | **TG7** |
| TG8 | **TG8** (current game cap; more coming) |

Notes:
- DAD members are all level **25+** → minimum **T8**.
- TG levels REPLACE Town Center level — when a player is "TG1" they no
  longer show "Nv. 30", they show the TG badge.
- The game caps at TG8 today; reserve room in the schema for TG9, TG10.
- The same level scheme applies to the **training buildings** (barracks,
  stable, range) — that's what gates the troop tier itself.

### Trooper branches
- Infantry (azul #6fa8d6) · Cavalry (laranja #c9883e) · Archer (verde #7fc08a).
- Each branch has the full tier ladder (T1 inf, T1 cav, T1 arc, ..., TG8 inf,
  TG8 cav, TG8 arc).

### War Academy — T11 path (researched 2026-06-14)

Sources scraped:
- https://kingshotguide.org/guide/kingshot-war-academy-guide
- https://kingshotguides.com/guide/t10-tg8-vs-t11-which-one-should-you-go-for/
- https://kingshot.net/war-academy-calculator
- DAD timeline: War Academy unlocks in **~52 days** for Kingdom 1652.

**What it unlocks**
- A new **War Academy** building with a research tree of 30+ technologies (10
  per troop branch).
- A NEW troop tier **T11** for Infantry / Cavalry / Archer — a parallel ladder
  *separate from the TG path*, not "T10 with TG upgrades".
- A new currency: **Truegold Dust** (different from Truegold itself — obtained
  via daily exchange or packs).
- Building also provides cumulative **+2.5% Research Speed** per upgrade.

**Unlock requirements**
- Kingdom (server) age ≥ **220 days**.
- Town Center level **30+**.
- First Internal Castle Battle completed — Academy appears the **Monday after**.
- Player must reach **Truegold Level 5** to unlock T11 troops.
- Total cost to fully unlock all 3 T11 types: **1,135 Truegold**.

**T10-TG8 vs T11-TG5 head-to-head (the wikis' key insight)**

| Match-up | Result |
|---|---|
| T10-TG8 vs T11-TG5 | T10-TG8 wins ~**95%** |
| T10-TG8 vs T11-TG6 | T10-TG8 wins ~**70%** |
| T11-TG7 vs T10-TG8 | T11-TG7 wins ~**82%** |

So T11 only catches up once you push it to **TG7+**. Until then,
keep pushing the TG path on T10 — the wiki notes "that extra skill makes a
huge difference".

**Resource cost — single T11 type vs single T10-TG8 type**

| Path | Cost |
|---|---|
| T11 per type | 13,421 Truegold Dust · 3,974,000 Gold · ~271 days base |
| 3× T11 (all types) | ~**813 days** of training time |
| T10-TG8 per type | 7,686 Truegold · 653 Tempered Truegold · 493+ days (can halve with bonuses) |

**Recommendation matrix (wikis)**

| Player profile | Strategy |
|---|---|
| F2P | **Skip T11**. Push T10-TG8 + universal stat buffs. |
| Mid-spender | Unlock **one** T11 type; needs a farm account for resources. |
| Whale | Unlock all 3 T11 types; still benefits from a farm account. |

**Where this affects our schema**

1. `troop_tiers` table (Phase 7): tier ladder is not strictly linear anymore.
   T11 is parallel to TG-progression, not after T10. New column:
   `path: 'standard' | 'truegold' | 'war_academy'` to separate the three.
2. `members` table (Phase 8): `highest_troop_tier_id` is OK but we now need a
   way to express "T10 troops with TG8 building" — likely an extra optional
   `truegold_upgrade_level INTEGER` column, OR a composite tier label like
   `T10·TG8`. Decide with Salles when Phase 8 starts.
3. `kingdom_milestones`: keep `war-academy` milestone as one row;
   reach-TG7 / reach-TG8 / unlock-T11 could each become rows so members can
   tick them off.
4. New page **`/war-academy`** (a sibling of Bear 1 guide):
   - F2P vs spender flowchart
   - Cost table & timeline projection from Salles' inputs
   - Link / iframe to kingshot.net calculator (or embed our own using the
     scraped costs)
5. Push notification (Phase 6): "War Academy unlocks in 7 days" when DAD K1652
   timeline crosses that threshold.

### Heroes — quick overview (full spec lives in §2 Hero System below)
- Released in **generations** (Gen 1 … Gen 8 currently planned, Gen 7 is the
  current cap).
- Pre-generation tiers: **Rare** (4 heroes), **Epic** (8 heroes).
- Each generation typically releases **3 heroes together** (one Infantry, one
  Cavalry, one Archer). Gen 1 had 4 heroes as exception.
- **Mythic** heroes (every Gen 1+ hero) have **Exclusive Equipment** that
  goes 0–10 with bound skills.
- The 4 key joiners on Bear Hunt 1 are Chenko, Amane, Yeonwoo, Amadeus.
- The "defense" heroes to **NEVER use as bear joiners**: Saul, Howard, Gordon,
  Jabel — their abilities buff defenders, useless on offense.

### Pets
- Same generation system as heroes (Gen 1 … Gen 7 currently).
- Unlike heroes, pets don't (yet) have a known star/exclusive-equipment system
  documented here — to be expanded later.

### Masters
- A class of late-game characters unlocked in sequence (Valora, Pan, Roman,
  Cassia so far). Each `master_unlock` is a kingdom milestone.

### Events
- **Bear Hunt 1/2** — recurring, ~every 48h. Rally-wave strategy.
- **King's Castle Battle** — server-wide siege.
- **KvK · Kingdom of Power** — multi-phase: Prep → Castle → Brawl → Final.
- **Viking Vengeance** — raid score event.
- **Swordland Showdown** — PvP bracket.
- **Tri-Alliance Clash** — 3-alliance tournament.
- **Cesar's Fury** — daily damage rush.
- **Seasonal/one-off** — anything Salles adds with `is_seasonal=true`; can be
  archived after it ends.

---

## 1bis · Hero & Equipment system — complete spec

> Captured 2026-06-14 from Salles' in-game screenshots + kingshotguide.com +
> kingshotwiki.com. This section is the source of truth for everything related
> to heroes, skills and equipment when implementing Phase 7 (game catalogue)
> and any guide page (Phase 5/9) that references heroes.

### Rarities (low → high)

| Rarity | In-game label | Count today | Has exclusive equipment? |
|---|---|---|---|
| Rare | R | 4 | ❌ |
| Epic | SR | 8 | ❌ |
| Legendary | SSR | 0–few | ❌ (uncommon in Kingshot, mostly skipped) |
| **Mythic** | **SSR (orange frame)** | 22+ (Gen 1–7) | ✅ Has exclusive equipment |

> Visual cue: the **orange frame** around a hero portrait = mythic. That's
> what makes them eligible for exclusive equipment.

### Generations

Heroes release in **generations** — usually 3 heroes per generation, one per
troop branch:

| Generation | Heroes | Status K1652 |
|---|---|---|
| Pre-gen Rare | Olive, Edwin, Seth, Forrest | available |
| Pre-gen Epic | Mikoto, Yeonwoo, Fahd, Chenko, Gordon, Diana, Howard, Quinn | available |
| Gen 1 | Jabel, Amadeus, Helga, Saul *(4 heroes — exception)* | available |
| Gen 2 | Hilde · Zoe · Marlin | available |
| **Gen 3** | **Jaeger · Eric · Petra** | **current cap K1652** |
| Gen 4 | Rosa · Alcar · Margot | 38 days away |
| Gen 5 | Vivian · Long Fei · Thrud | not arrived |
| Gen 6 | Yang · Triton · Sophia | not arrived |
| Gen 7 | Ava · Charles · Wee & Woo | 64 days away (endgame for K1652) |
| Gen 8 | TBD | future |

> **DAD K1652 is currently on Gen 3** — Gen 4 arrives in 38 days.

### Branches (troop type the hero buffs)

| Branch | Color | Front-line role |
|---|---|---|
| Infantry | azul #6fa8d6 | Tanky front-line |
| Cavalry | laranja #c9883e | Burst damage / charge |
| Archer | verde #7fc08a | Ranged / sniper |

### Star system (gates max skill level)

- Each hero has up to **5 stars**.
- Each star fills with **6 petals** (so 30 petal-units of progression total).
- **Star count gates the maximum level a skill can reach:**

| Hero star count | Max skill level unlockable |
|---|---|
| 1 star | Lv 1 |
| 2 stars | Lv 2–3 (approx) |
| 3 stars | Lv 3–4 |
| 4 stars | **Lv 5** (full skill) |
| 5 stars | Lv 5 + max equipment-bound skills |

> Real example from Salles: "My Jaeger has 3 stars + 4 petals → can only push
> his skills to Lv 4. He needs to hit 4 stars before they can reach Lv 5."

### Hero level (separate from stars)

- Heroes level from **1 to 80** (independent of stars).
- Level scales raw stats (hero attack/defense/health from base figure to max).
- Hero level does NOT unlock skill levels — stars do.
- Hero level CAN'T go up if hero is currently assigned to a Training Camp.

### Skills — every hero has TWO sets

| Set | Slots | What it affects | Battles it applies to |
|---|---|---|---|
| **Conquest** | 3 skills (slots 1–3) | The hero's stats *inside* the city (Conquest mode, base defense) | Only base-level combat. NOT used in events outside the city. |
| **Expedition** | 3 skills (slots 1–3) | The hero's stats when sent outside the city (rallies, KvK marches, bear hunt, garrisons abroad, etc.) | **99% of events** — Bear Hunt, KvK, Tri-Alliance, Castle Battle, anything we plan guides for. |

**Each skill levels 1–5**, capped by hero star count (see star table).

> When writing guide recommendations like *"use Chenko in slot 1"*, we need
> to surface the **expedition skill** that motivates the call — and the level
> threshold for it to actually be impactful (e.g. "only if Chenko's expedition
> Skill #1 is ≥ Lv 4 = +20% lethality").

### Exclusive equipment — MYTHIC HEROES ONLY

Every mythic hero has a single **Exclusive Equipment** that goes from
**level 0 to 10**.

#### Level → unlock pattern (per Salles)

| Equipment level | What it unlocks |
|---|---|
| 1, 3, 5, 7, 9 (odd)  | New rank of the **Conquest** bound skill |
| 2, 4, 6, 8, 10 (even) | New rank of the **Expedition** bound skill |

So the equipment carries TWO bound skills (1 conquest, 1 expedition), each
also levelling 1–5, where each rank requires the equipment to be at the
matching unlock level.

#### Stats unlocked from the equipment (max level)

At level 10, the equipment grants:
- A pool of **Conquest stats** (hero attack/defense/HP + escolta numbers)
- A pool of **Expedition stats** (% buff to the hero's branch — e.g. infantry
  lethality + infantry HP for an infantry hero)
- Both bound skills at Lv 5

#### Concrete example — Zoe's "The Unrighteous" (Gen 2 Infantry Mythic)

```
Equipment power at max:  270,000
Conquest stats (+):  Hero ATK 414 · Hero DEF 540 · Hero HP 8,100
                     Escolta ATK 138 · Escolta DEF 180 · Escolta HP 2,700
Expedition stats (+): Infantry Lethality +60% · Infantry HP +60%

Bound skill (Conquest): "Death or Glory"
  Lv 1 (eq 1) : +8% Attack
  Lv 2 (eq 3) : +12%
  Lv 3 (eq 5) : +16%
  Lv 4 (eq 7) : +20%
  Lv 5 (eq 9) : +24% (full)

Bound skill (Expedition): "Dark Lady"
  Lv 1 (eq 2)  : +5% defender attack
  Lv 2 (eq 4)  : +7.5%
  Lv 3 (eq 6)  : +10%
  Lv 4 (eq 8)  : +12.5%
  Lv 5 (eq 10) : +15% (full)
```

(Full Zoe spec lives in `data/sample-hero-zoe.json` — copy that template when
building Phase 7 import for the rest of the heroes.)

### Schema — heroes & related tables

Replaces and expands the earlier draft in §3.1. Lives in a future migration
(Phase 7).

```sql
CREATE TYPE hero_rarity AS ENUM ('rare', 'epic', 'legendary', 'mythic');
CREATE TYPE skill_kind  AS ENUM ('conquest', 'expedition');
-- troop_branch already declared earlier
-- 'infantry' | 'cavalry' | 'archer'

CREATE TABLE heroes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,          -- 'zoe', 'chenko', 'wee-woo'
  name            TEXT NOT NULL,                  -- 'Zoe'
  name_pt         TEXT,                           -- 'Zoe' (i18n editable later)
  generation      INTEGER NOT NULL,               -- 0 = pre-gen Rare/Epic, 1..8
  rarity          hero_rarity NOT NULL,
  branch          troop_branch,                   -- nullable for non-aligned
  portrait_url    TEXT,
  full_art_url    TEXT,
  description     TEXT,
  bear_joiner_slot TEXT,                          -- 'B1'..'B6' if a key Bear joiner
  is_defense_hero BOOLEAN NOT NULL DEFAULT false, -- Saul/Howard/Gordon/Jabel
  max_star_level  INTEGER NOT NULL DEFAULT 5,
  max_hero_level  INTEGER NOT NULL DEFAULT 80,
  released_at     TIMESTAMPTZ,
  display_order   INTEGER NOT NULL DEFAULT 100,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX heroes_generation_idx ON heroes (generation);
CREATE INDEX heroes_rarity_idx     ON heroes (rarity);

-- One row per (hero × kind × slot 1..3)
CREATE TABLE hero_skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id     UUID NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  kind        skill_kind NOT NULL,
  slot        INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 3),
  name        TEXT NOT NULL,
  name_pt     TEXT,
  description TEXT,
  icon_url    TEXT,
  UNIQUE (hero_id, kind, slot)
);

-- 5 rows per skill — Lv 1..5
CREATE TABLE hero_skill_levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id        UUID NOT NULL REFERENCES hero_skills(id) ON DELETE CASCADE,
  level           INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  primary_pct     NUMERIC,                  -- the main % effect, e.g. 84.0 for +84%
  secondary_pct   NUMERIC,                  -- optional second value (e.g. enemy damage taken)
  trigger_pct     NUMERIC,                  -- optional trigger chance %
  stars_required  INTEGER,                  -- min star count on hero to unlock this level
  effect_text     TEXT NOT NULL,            -- the human-readable phrase
  UNIQUE (skill_id, level)
);

-- One row per mythic hero
CREATE TABLE hero_exclusive_equipment (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id      UUID UNIQUE NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,                -- 'The Unrighteous'
  name_pt      TEXT,                          -- 'Os Injustos'
  icon_url     TEXT,
  description  TEXT,
  max_level    INTEGER NOT NULL DEFAULT 10,
  max_power    INTEGER                        -- 270000 for Zoe
);

-- One row per equipment per level 1..10
CREATE TABLE hero_equipment_levels (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id       UUID NOT NULL REFERENCES hero_exclusive_equipment(id) ON DELETE CASCADE,
  level              INTEGER NOT NULL CHECK (level BETWEEN 1 AND 10),
  conquest_stats     JSONB,                   -- {"hero_attack": 414, ...}
  expedition_stats   JSONB,                   -- {"infantry_lethality_pct": 60, ...}
  UNIQUE (equipment_id, level)
);

-- Each equipment carries TWO bound skills (1 conquest, 1 expedition)
CREATE TABLE hero_equipment_bound_skills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id        UUID NOT NULL REFERENCES hero_exclusive_equipment(id) ON DELETE CASCADE,
  kind                skill_kind NOT NULL,
  name                TEXT NOT NULL,
  name_pt             TEXT,
  description         TEXT,
  icon_url            TEXT,
  UNIQUE (equipment_id, kind)
);

-- 5 rows per bound skill — Lv 1..5
CREATE TABLE hero_equipment_bound_skill_levels (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bound_skill_id            UUID NOT NULL REFERENCES hero_equipment_bound_skills(id) ON DELETE CASCADE,
  level                     INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  primary_pct               NUMERIC,
  unlocks_at_equipment_level INTEGER NOT NULL CHECK (unlocks_at_equipment_level BETWEEN 1 AND 10),
  effect_text               TEXT NOT NULL,
  UNIQUE (bound_skill_id, level)
);

-- Reference: which heroes a guide recommends — surface skill thresholds in UI
CREATE TABLE guide_hero_recommendations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  hero_id            UUID NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  role               TEXT NOT NULL,         -- 'leader' / 'joiner B1' / 'garrison'
  priority           INTEGER NOT NULL,      -- ordering inside a guide
  required_skill_id  UUID REFERENCES hero_skills(id),
  required_skill_min_level INTEGER,
  notes_md           TEXT,                   -- "Only if Skill X is Lv 4+"
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### UI plan (Phase 7+)

1. **New route `/heroes`** (could live as sub-tab inside `/alliance` or its own
   nav item — decide with Salles). Lists all heroes:
   - Filter by generation / rarity / branch
   - Search by name
   - Cards show portrait + name + rarity badge + branch tint
2. **Hero detail page `/heroes/:slug`**: portrait, all 3 conquest skills, all
   3 expedition skills (with Lv 1–5 tables), exclusive equipment with bound
   skills if mythic. Visual style matches the in-game ring of skill icons.
3. **Admin CRUD** in `/admin/catalogue/heroes`: import from JSON, edit name,
   add/remove skills, set level effects, manage equipment.
4. **Guide pages** that mention a hero use a `<HeroRefBadge>` mini-component
   that pulls portrait + name + the minimum-required-skill-level annotation
   from the recommendations table.
5. **Push notification (Phase 6)**: "Gen 4 heroes unlock in 7 days — Rosa
   (Infantry), Alcar (Cavalry), Margot (Archer)" — translated.

### Data sources captured today

| URL | Use |
|---|---|
| https://www.kingshotguide.com/heroes | Master list, generations, hero pages |
| https://kingshotwiki.com/heroes | Higher-fidelity skill data (has both conquest AND expedition skills, unlike kingshotguide which only shows conquest for some heroes) |
| `data/heroes-catalogue.json` (this repo) | 34 heroes mapped today — slug/gen/rarity/portrait/branch where known |
| `data/sample-hero-zoe.json` (this repo) | Full schema-ready sample for a Mythic. **Copy this shape** when seeding other heroes. |

### Open data gaps (TODO before Phase 7 implementation)

- **Branch unknown** for most pre-gen and Gen 1–3 heroes — need to fetch each
  hero page and parse the troop-stat block. Easy script.
- **All other heroes' full skill specs** — need to scrape kingshotwiki for
  each of the 34. Plan: write a Node/Python script that hits each `/heroes/<slug>`
  page on kingshotwiki, parses the same shape as the Zoe sample, writes one
  JSON file per hero into `data/heroes/<slug>.json`. Then bulk-import to
  Supabase on first deploy.
- **Hero portraits in higher resolution** — kingshotguide hosts up to
  3840w webp; current `/public/images/heroes/*.png` are 320px crops from the
  earlier kingshotwiki run. For the hero detail page we'll want higher-res.

---

## 1ter · Login-first architecture (Salles 2026-06-14)

Salles redefined the project shape. The site is no longer "guides + admin",
it's a **per-member command center** with the alliance leadership as
super-admins. Every other feature (polls, event participation, push
notifications, kingdom timeline detail pages, eventually chat) hangs off
this foundation.

### Why login first

| Without per-member login | With per-member login |
|---|---|
| Polls can't authenticate voters; you need a dropdown "who is this?" — fragile, fakeable | Each member votes as themselves — secure, auditable |
| Event participation is admin-only | Members self-signup ("I'll be in Legion 1"); admin only finalizes effective/substitute |
| Notifications are broadcast-only | Per-member opt-in + targeted notifications |
| Member-specific UI not possible | Personal pages (my events, my profile) |
| Admin login is a separate route everyone sees | Admin is just R4/R5 with extra Settings sections |
| Chat impossible | Chat works (Phase Y, far future) |

### The login flow Salles wants

1. **First visit** → landing/login page (not dashboard).
2. **Login page** is "the most beautiful in the world" — animated background
   ("almost a video"), glassmorphism form, language selector top-right, PWA
   install hint bottom, "Forgot password? → Ask an R4" message.
3. Form is **username + password only** (no email — basic auth via Supabase).
4. **Session persists for a very long time** (refresh tokens 30+ days).
5. After login → /home (Hub).
6. **Settings** shows: profile (nick, avatar, language), session info,
   notification opt-in, and — only for R4/R5 — the **Admin section** with all
   management capabilities (create members, create polls, edit events,
   timeline rich content, etc.).
7. **No `/admin` route** anymore — admin lives inside Settings, gated by
   account role.

### Member roles & permissions

| Role | Permissions |
|---|---|
| **ally** | View-only guest from another alliance (diplomatic access). Sees everything; writes nothing. **Not counted as a DAD member** in any stat/total/leaderboard, and **not eligible** for event/squad auto-assignment. See "Ally accounts" subsection below. |
| **member** | Vote in polls · sign up for events · edit own profile · change own password · install PWA · receive notifications · view all read-only content |
| **r2 / r3** | All of member · (no admin extras for now) |
| **r4** | All of r3 · Admin section visible in Settings: create polls, schedule events, set timeline dates, manage member roster, **create/manage ally accounts**, send notifications |
| **r5** | All of r4 · Manage other accounts (create/delete/role-change, including allies) |

### Schema additions (login system)

```sql
CREATE TYPE account_role AS ENUM ('ally', 'member', 'r2', 'r3', 'r4', 'r5');
-- 'ally' = read-only guest from another alliance; never counted as a DAD member.

-- Member accounts — extends Supabase auth.users; one per person.
-- Linked optionally to a roster member (members table) so the same person
-- shows up consistently in polls/events with their nick + tier.
CREATE TABLE member_accounts (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,         -- what they type to log in
  display_name    TEXT NOT NULL,                -- shown in UI
  member_id       UUID REFERENCES members(id) ON DELETE SET NULL,
  role            account_role NOT NULL DEFAULT 'member',
  language_code   TEXT NOT NULL DEFAULT 'en',
  avatar_hero_slug TEXT,
  avatar_image_url TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  password_temporary BOOLEAN NOT NULL DEFAULT true, -- forces password change on first login
  first_login_at  TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  pwa_installed_at TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX member_accounts_role_idx     ON member_accounts (role);
CREATE INDEX member_accounts_active_idx   ON member_accounts (active);
CREATE INDEX member_accounts_username_idx ON member_accounts (lower(username));

-- Login activity log (for admin's "who logged in / who hasn't" panel)
CREATE TYPE login_event_type AS ENUM (
  'signin', 'signout', 'pwa_install', 'pwa_uninstall', 'password_change', 'failed_signin'
);

CREATE TABLE login_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
  event_type  login_event_type NOT NULL,
  user_agent  TEXT,
  ip_hash     TEXT,                              -- SHA256 of IP for privacy
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX login_events_account_idx  ON login_events (account_id, occurred_at DESC);
CREATE INDEX login_events_recent_idx   ON login_events (occurred_at DESC) WHERE event_type = 'signin';

-- Replace the `is_admin()` helper from §1bis with a role-aware one.
CREATE OR REPLACE FUNCTION public.account_role()
RETURNS account_role
LANGUAGE sql SECURITY INVOKER STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.member_accounts WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY INVOKER STABLE
SET search_path = ''
AS $$
  SELECT (SELECT role FROM public.member_accounts WHERE id = (SELECT auth.uid())) IN ('r4', 'r5')
$$;

-- True if the current account is a DAD member (any rank, NOT an ally).
-- Single source of truth for "is this an internal DAD action?". Use in RLS
-- WITH CHECK clauses for inserts/updates that allies must be blocked from
-- (poll votes, event signups, profile mutations, chat messages, etc).
CREATE OR REPLACE FUNCTION public.is_voting_member()
RETURNS BOOLEAN
LANGUAGE sql SECURITY INVOKER STABLE
SET search_path = ''
AS $$
  SELECT (
    SELECT role FROM public.member_accounts WHERE id = (SELECT auth.uid())
  ) IN ('member', 'r2', 'r3', 'r4', 'r5')
$$;

-- Convenience inverse — used when listing DAD members and excluding allies.
CREATE OR REPLACE FUNCTION public.is_ally()
RETURNS BOOLEAN
LANGUAGE sql SECURITY INVOKER STABLE
SET search_path = ''
AS $$
  SELECT (
    SELECT role FROM public.member_accounts WHERE id = (SELECT auth.uid())
  ) = 'ally'
$$;
```

### Login UX — username → fake email

Supabase Auth needs an email under the hood. We append a synthetic domain
(same trick already used for the shared admin account):

- User types `salles` + password
- Frontend submits `salles@dad-war-room.local`
- User never sees the email plumbing

### Account creation flow

1. R5 (or R4) opens **Settings → Admin → Members → Add account**.
2. Enters username, links to a roster member, sets a temporary password.
3. System creates `auth.users` + `member_accounts` rows.
4. R5 shares username/temp password with the member (in-game chat or DM).
5. Member logs in → forced password change → lands on Hub.

### "Forgot password?" path

UI message: **"Procure um R4 ou R5 da aliança."** Admin opens Settings →
Admin → Members → row → Reset password → sets a new temp password. The
member tries again with that.

No email recovery (no real emails). Acceptable per Salles ("não precisa morrer
pra deixar seguro").

### Ally accounts — diplomatic guests from other alliances

Salles added (2026-06-14) a separate **ally** role for trusted players from
**other Kingshot alliances** who need read access to DAD coordination — typical
cross-alliance KvK or Swordland diplomacy scenarios where you let an allied
R4 see your timeline and squads but they're not part of [DAD] itself.

**What an ally CAN do**

- **See everything** a member sees: events, polls (with live results),
  kingdom timeline, member roster + KPIs, kingdom map, chat history.
- **Post in alliance chat** — chat is the one cross-cutting social space
  allies write to. Their messages appear with the **"ALLY"** chip beside
  the nick so members instantly read context: "this is a guest from another
  alliance speaking". Cross-alliance KvK/Swordland coordination relies on it.
- **React to chat messages** — same reasoning as posting.
- **Install PWA + receive push notifications** — needed so allied diplomats
  know the exact UTC time of joint events without leaving their own app.
- **Change their own password** — basic hygiene.

**What an ally CANNOT do** — enforced server-side via RLS, not just hidden in UI:

- Vote in polls (`poll_votes` insert blocked)
- Sign up for events / pick a legion (`event_signups` insert blocked)
- Be auto-assigned to a squad (admin's assignment UI filters allies out)
- Comment on polls or event details (those are DAD decision spaces — chat
  is the social space; decisions stay internal)
- Edit their profile beyond password (no display_name change, no avatar,
  no language pref after first login)
- Create any kind of entity (poll, event, timeline milestone — admin-only anyway)

**What allies are excluded from**

- Member roster page default view (they live in a separate **"Allies"** tab/section)
- All alliance-wide counts and KPIs:
  - "X members" totals
  - Average power, troop tier distribution, generation coverage
  - Event participation rate, attendance leaderboards
  - "All members ready" gates
- Event auto-assignment pools (Swordland legions, Bear Hunt waves, etc)
- Notification broadcasts marked "members only" (admin chooses per-send)

**Visual treatment**

- Anywhere an ally name appears (chat, settings, members page), show a small
  **"ALLY"** chip next to their nick — `steel-soft` background, `ink-paper`
  text, 9px Cinzel tracked. Makes the diplomatic context obvious at a glance.
- Their avatar gets a subtle steel-blue border ring instead of the gold one
  members get — different family, not lesser.

**Creation flow** (R4/R5 only, separate from member creation)

1. Settings → Admin → Allies → **Add ally**
2. **Two fields only**: `Username` (becomes login + display name) and `Password`.
   No roster link, no display_name separate from username, no language, no
   avatar selection — admin keeps it dead simple per Salles' spec.
3. System inserts `member_accounts` row with `role = 'ally'`, `member_id = NULL`,
   `password_temporary = true`, `language_code` defaults to `'en'` (ally edits
   on first login if they want).
4. R5 shares username + temp password via in-game DM. Ally signs in, forced
   to change password, lands on Hub like everyone else.

**RLS pattern** (use throughout Fases D, E, Y, and any future write surface)

```sql
-- Polls vote — members only, never allies
CREATE POLICY poll_votes_insert ON poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (account_id = (SELECT auth.uid()) AND is_voting_member());

-- Event signups — members only
CREATE POLICY event_signups_insert ON event_signups
  FOR INSERT TO authenticated
  WITH CHECK (account_id = (SELECT auth.uid()) AND is_voting_member());

-- Chat messages — both members AND allies can post. Chat is the one
-- writable social space allies have, by design (cross-alliance coordination).
-- Frontend tags ally messages with the "ALLY" chip for visual context.
CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

-- Comments on polls or event posts — members only, never allies
-- (those are internal DAD decision spaces; chat handles cross-alliance talk).
CREATE POLICY poll_comments_insert ON poll_comments
  FOR INSERT TO authenticated
  WITH CHECK (account_id = (SELECT auth.uid()) AND is_voting_member());

-- Member roster reads — everyone (including allies) sees DAD members,
-- but the API filters allies into a separate response section.
CREATE POLICY members_select ON members
  FOR SELECT TO authenticated USING (true);
```

**Stats queries** — every alliance-wide aggregate must filter `role <> 'ally'`:

```sql
-- WRONG (counts allies as members)
SELECT COUNT(*) FROM member_accounts WHERE active;
-- RIGHT
SELECT COUNT(*) FROM member_accounts WHERE active AND role <> 'ally';
```

This is the single most common rule to forget — every KPI, every leaderboard,
every "X of Y members did Z" calculation. **Lock it into the repository layer
in Fase B** by exporting two helpers: `listDadMembers()` (excludes allies) and
`listAllAccounts()` (includes them, admin-only).

---

## 1quater · Polls system (Salles 2026-06-14)

Polls are the alliance's tool to coordinate event timing, legion preferences,
and any decision needing member input. Rich enough to handle the two example
flows Salles described:

- **Example 1 — Viking time poll:** multi-select time slots, deadline,
  results visible during voting, shareable link.
- **Example 2 — Swordland legion preference:** single-select (Legion 1 /
  Legion 2 / can't participate), feeds into the squad assignment of the
  associated event occurrence.

### Schema

```sql
CREATE TYPE poll_type   AS ENUM ('single', 'multi');
CREATE TYPE poll_status AS ENUM ('draft', 'open', 'closed', 'archived');
CREATE TYPE results_visibility AS ENUM ('during', 'after_close', 'admin_only');

CREATE TABLE polls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  description_md    TEXT,
  poll_type         poll_type NOT NULL,
  status            poll_status NOT NULL DEFAULT 'draft',
  -- Optional links to events / occurrences (Viking time poll → Viking event)
  related_event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  related_occurrence_id   UUID REFERENCES event_occurrences(id) ON DELETE SET NULL,
  results_visibility      results_visibility NOT NULL DEFAULT 'during',
  -- Schedule
  opens_at_utc            TIMESTAMPTZ,
  closes_at_utc           TIMESTAMPTZ,
  closed_at               TIMESTAMPTZ,
  -- Cascade — when this poll closes, the winning option(s) become an
  -- input for another action (e.g. Viking time → schedule occurrence).
  on_close_action         TEXT,  -- 'schedule_occurrence' / 'assign_to_squad' / null
  on_close_metadata       JSONB,
  -- Misc
  share_token             TEXT UNIQUE,  -- short URL token for in-game-chat sharing
  created_by              UUID REFERENCES member_accounts(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE poll_options (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id   UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  label     TEXT NOT NULL,
  metadata  JSONB,   -- e.g. { "time_utc": "2026-06-22T20:00:00Z" } for time polls
  UNIQUE (poll_id, position)
);

CREATE TABLE poll_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id    UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  voter_account_id UUID NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
  voted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, option_id, voter_account_id)
);
CREATE INDEX poll_votes_poll_idx ON poll_votes (poll_id);

-- Real-time tally via materialized view (refresh on vote insert/delete via trigger)
CREATE VIEW poll_tally AS
  SELECT
    o.id AS option_id, o.poll_id, o.label, o.position,
    COUNT(v.id) AS vote_count
  FROM poll_options o
  LEFT JOIN poll_votes v ON v.option_id = o.id
  GROUP BY o.id;
```

### Vote editing (Salles' specific concern)

Salles described: "If cache cleared and the member tries to vote again, warn
them that they've already voted — ask if they want to change. Don't double-count."

With per-member logins this is trivial: the UNIQUE constraint on
(poll_id, option_id, voter_account_id) prevents duplicates. On a re-vote
attempt:
1. UI detects existing votes → shows existing selection highlighted.
2. Member changes selection → on save, we `DELETE` previous votes from this
   account on this poll and `INSERT` the new selection.
3. Banner: "Your vote was updated."

### Share link

`closes_at_utc` triggers auto-close. Open polls expose a public-readable
shareable link: `https://dad-1652.vercel.app/p/<share_token>` (short token,
not the slug). Anyone with the link sees the poll; only logged-in members can
vote.

### UI surfaces

- **`/alliance/polls`** — list of open polls + closed/recent
- **`/p/<share_token>`** — direct poll page (shareable in-game)
- **Dashboard widget** — "1 poll waiting for your vote" callout when applicable
- **Push notification** — "New poll: Viking time. Vote by 18:00 UTC."
- **Admin (Settings → Admin → Polls)** — create / edit / close / cascade

---

## 1quinquies · Event participation & squads (Salles 2026-06-14)

The Bear-1-or-Bear-2 example and the Swordland legions are the same problem
generalized: members sign up for an occurrence (optionally inside a squad),
admin finalizes effective/substitute.

### Schema

```sql
CREATE TYPE participation_status AS ENUM (
  'pending',       -- member hasn't responded
  'available',     -- "I'll be there"
  'maybe',
  'declined',
  'effective',     -- admin-finalized as active participant
  'substitute',    -- admin-finalized as substitute
  'no_show'        -- after the fact
);

-- A "squad" is any subset of participants for one occurrence — e.g. Legion 1
-- inside a Swordland occurrence, or "Bear 1 morning rally" inside Bear Hunt.
CREATE TABLE event_squads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_occurrence_id UUID NOT NULL REFERENCES event_occurrences(id) ON DELETE CASCADE,
  squad_key           TEXT NOT NULL,            -- 'legion-1', 'bear-rally-morning'
  name                TEXT NOT NULL,            -- 'Legion 1'
  max_effective       INTEGER,                  -- 30 for Swordland; NULL = no cap
  max_substitute      INTEGER,                  -- 10 for Swordland
  scheduled_at_utc    TIMESTAMPTZ,              -- if this squad has its own time
  metadata            JSONB,
  position            INTEGER NOT NULL DEFAULT 0,
  UNIQUE (event_occurrence_id, squad_key)
);

-- One row per (occurrence, member) participation declaration
CREATE TABLE event_participations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_occurrence_id      UUID NOT NULL REFERENCES event_occurrences(id) ON DELETE CASCADE,
  squad_id                 UUID REFERENCES event_squads(id) ON DELETE SET NULL,
  member_id                UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  account_id               UUID REFERENCES member_accounts(id),  -- who self-signed-up
  status                   participation_status NOT NULL DEFAULT 'pending',
  preference_notes         TEXT,                                  -- "prefer morning"
  assigned_by_account_id   UUID REFERENCES member_accounts(id),   -- admin who set effective/substitute
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_occurrence_id, member_id)
);
```

### UX

- On the event detail page (`/events/<slug>` for Phase 5), members see:
  - The occurrence
  - "I'm in" / "Can't make it" buttons
  - If the event has squads (Legion 1 / Legion 2): pick the squad
  - Notes field
- Admin (Settings → Admin → Events → occurrence → Roster) sees:
  - Drag-and-drop or table to assign effective/substitute per squad
  - Visual count: 27/30 effective in Legion 1; 4/10 substitute
  - Export to in-game chat formatted text
- On the Member page (`/members/<nick>`): "Next events for {nick}" list
- On the Hub (logged-in user): "You're signed up for: Bear 1 @ 11:00 UTC"

### Bear 1 vs Bear 2 case

The "members pick which bear they participate in" is just a poll OR a
self-signup with squads named `bear-1` and `bear-2` (no caps). Admin can
materialize from poll → participations in one click.

---

## 1sexies · Kingdom timeline rich detail pages (Salles 2026-06-14)

Each row on the Kingdom Timeline card becomes tappable → opens an inline
detail "page" (mobile = bottom sheet; desktop = side drawer). Content is
created/edited by admin via a **rich editor** (TipTap) and stored as HTML +
structured embeds.

### Schema additions to `kingdom_milestones`

```sql
ALTER TABLE kingdom_milestones ADD COLUMN content_html TEXT;
ALTER TABLE kingdom_milestones ADD COLUMN hero_refs    TEXT[];   -- linked hero slugs
ALTER TABLE kingdom_milestones ADD COLUMN building_refs TEXT[];  -- linked building slugs
ALTER TABLE kingdom_milestones ADD COLUMN cover_image_url TEXT;
```

### Editor capabilities

Same TipTap kit we already used in the ler-liberta project, plus custom
extensions:

- Headings, lists, blockquotes, code
- Colors, fonts, text alignment
- Image upload (Supabase Storage `milestone_images/`)
- Tables
- Custom embed `<hero-card slug="chenko">` — renders the hero portrait + name
  + branch tint, pulling from `heroes-catalogue.json`
- Custom embed `<building-card slug="war-academy">` — pulls from our buildings
  asset set
- Custom embed `<countdown to="2026-08-05T20:00:00Z">` — auto-updating

### UI

- Card row: chevron at the right → tap → bottom sheet (mobile) / drawer (desktop)
- Sheet shows: cover image (if any) → countdown → title → category badge →
  rich content
- Admin "Edit" button (if R4+) opens the editor in-place

---

## 1septies · This-week calendar redesign (Salles 2026-06-14)

The current 7-column grid is illegible on mobile. Replace with **vertical
day-list**:

- One card per day, stacked
- Each card: weekday + date + events for that day (compact list)
- Today gets gold accent; weekends slightly darker
- Empty days collapse to one-liner "—"
- Horizontal scroll fallback remains an option as "compact view" toggle

On desktop, restore the 7-column grid since it works there.

---

## 1octies · Alliance chat (last, far future — architecture only now)

Salles flagged this as "very useful but absolute last priority". We don't
build it now; we just keep the schema ready so it slots in later.

### Schema (stub)

```sql
CREATE TABLE chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
  body         TEXT,
  image_url    TEXT,
  reply_to     UUID REFERENCES chat_messages(id),
  language_code TEXT,                              -- detected source language
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at    TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ
);

-- On-demand translation cache so we don't translate the same message N times
CREATE TABLE chat_message_translations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  target_lang   TEXT NOT NULL,
  translated_body TEXT NOT NULL,
  provider      TEXT NOT NULL,                     -- 'deepl' / 'openai' / 'manual'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, target_lang)
);
```

### Translation strategy (when we get there)

Per-message on-demand: each member sees the original text. Beside each
message a "Translate to PT" button (their selected language). Click →
translates once via DeepL or OpenAI → caches → all subsequent viewers in
that language get the cached translation free.

---

## 1octies-bis · Navigation & page structure (Salles 2026-06-14, second round)

After locking the login-first vision, Salles redefined the **page structure
and bottom navigation** for both member mode and admin mode.

### Permission resolution (locked answers)

| R-level | Permissions |
|---|---|
| **R1, R2, R3** | Treated identically as `member` — vote in polls, signup for events, edit own profile, install PWA. No admin access. |
| **R4** | All of member + Admin access · can create accounts, polls, events, edit timeline content, manage members. **Cannot** change another account's role. |
| **R5** | All of R4 + can change roles (promote/demote between r1–r5) and delete accounts. |

Event participation editable by the member **until admin finalises** the
effective/substitute roster. After finalisation, the participation row is
locked (only admin can override).

### Member bottom navigation (5 tabs — final structure)

```
┌────────────────────────────────────────────────┐
│  🏠 Home  ·  ⚔ Events  ·  💬 Chat  ·  🛡 Alliance  ·  ⚙ Settings  │
└────────────────────────────────────────────────┘
```

| Tab | Route | Phosphor icon | Notes |
|---|---|---|---|
| Home | `/` | `House` | Personal dashboard |
| Events | `/events` | `Sword` | Events page (active + coming-soon only) |
| Chat | `/chat` | `ChatCircle` | "Coming soon" placeholder until Phase Y |
| Alliance | `/alliance` | `ShieldStar` | Alliance hub with subroutes |
| Settings | `/settings` | `GearSix` | Personal preferences + Admin gate |

**Members tab is REMOVED** as a top-level destination. The members list
becomes a subroute under Alliance (`/alliance/members`) — accessed via a CTA
card on the Alliance page.

### Admin bottom navigation (8 tabs · scroll-horizontal)

When an R4+ taps **Settings → Advanced → Open admin settings**, the whole
chrome switches to "admin mode":

- The member bottom nav disappears
- A new admin bottom nav appears, **horizontally scrollable** (8 items don't
  fit a 320px-wide phone)
- Top edge of admin chrome gets a subtle crimson hairline to signal "you're
  in admin mode"
- A persistent "Exit admin" hits the first tab so it's reachable in one tap

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ ⬅ Sair · 📅 Eventos · 📋 Enquetes · 👥 Membros · 💬 Chat · 🛡 Aliança · 🔔 Notif. · 📊 Dados │
└────────────────────────────────────────────────────────────────────────────────────┘
       ←──── horizontal scroll ────→
```

| Tab | Route | Phosphor | Purpose |
|---|---|---|---|
| Sair | (exits admin mode → back to `/settings`) | `SignOut` | Reverts to member chrome |
| Eventos | `/admin/events` | `CalendarPlus` | CRUD events + occurrences + squads |
| Enquetes | `/admin/polls` | `ListChecks` | CRUD polls, cascade settings |
| Membros | `/admin/members` | `UsersThree` | CRUD member roster + accounts + roles |
| Chat | `/admin/chat` | `ChatCircle` | Coming-soon page + chat settings (rate limit, max file size, manual purge) |
| Aliança | `/admin/alliance` | `ShieldStar` | Edit alliance public info (rank, composition labels) |
| Notif. | `/admin/notifications` | `BellRinging` | Compose/schedule notifications with rich editor + target audience picker |
| Dados | `/admin/analytics` | `ChartBar` | Logged-in count, sessions, who hasn't logged in, PWA install status |

### Page-by-page spec (member mode)

#### Home — `/`
1. **Hero**: "Hi, {nick}" greeting · avatar · current TG/T tier · power · DAD tag
2. **Carousel slider — Next 5 events** (swipeable mobile, arrow buttons desktop)
   - Each card: event icon + name + countdown + tap-to-detail
3. **Open polls card**:
   - "You have N polls waiting" with quick-vote inline
   - Empty state: "No pending polls" subtle copy
4. **Kingdom timeline** (next 5 milestones)
5. Quick-actions row (optional): "Sign up for events", "Update profile"

#### Events — `/events`
1. **Hero "This week"** — redesigned mobile (vertical day-list with timeline items + events merged, see §1septies)
2. **Event grid below** — small cards per event:
   - Active = clickable, gold accent
   - Coming soon = darkened, opacity 50%, not clickable
   - Archived = **not shown here** (visible only in Admin)

#### Chat — `/chat`
Coming-soon placeholder until Phase Y. Hero + "We're working on this" + maybe a notify-me button.

#### Alliance — `/alliance`
1. **Hero**: alliance crest + name + motto (no kingdom chip — header has it)
2. **CTA row** (2-3 buttons): "Polls", "Members" (and later "Chat" too)
3. **Pretty colorful stats cards** (NO Languages KPI — removed by Salles):
   - **Rank** (#2 in K1652)
   - **Members** (88 total)
   - **Power** (combined from roster)
4. **Composition card — reformulated**: colourful, aesthetic, no fence-post. TG distribution chart, TG5+ ready, avg power, min troop tier.
5. ❌ NO "About" card (removed by Salles)
6. ❌ NO event history card (removed by Salles)
7. ❌ NO data freshness footer (removed by Salles)

Subroutes:
- `/alliance/polls`
- `/alliance/members`

#### Settings — `/settings`
1. **Profile** card: avatar picker (hero portrait grid or upload), nick, password change
2. **Language**: 11-language picker
3. **Push notifications**: opt-in toggle + subscription status
4. **Install / reinstall PWA**: button only shown if not installed (uses `beforeinstallprompt` event)
5. **Session**: last login, device, "Log out everywhere" button
6. **Logout** button
7. **Advanced section** (R4+ only):
   - Single CTA: "Open admin settings" → toggles admin mode

### Page-by-page spec (admin mode)

When admin mode is on (state preserved across routes via context):

- Member bottom nav → hidden
- Admin bottom nav → shown (scrollable)
- Header gets subtle crimson accent strip below to indicate context
- Each admin route renders inside the same shell

The 8 admin sections in detail:

1. **Sair** — toggles admin mode off, lands on `/settings`.
2. **Eventos** — list events, create/edit/archive, manage occurrences (with squads), see participations.
3. **Enquetes** — list polls, create with rich form (single/multi, options, schedule, share token, related event), edit, close, cascade settings.
4. **Membros** — list roster + accounts paired, create account, set role, reset password, upload avatar, edit power/tier/nick.
5. **Chat** — coming-soon notice + settings panel:
   - Messages per hour limit
   - Min wait between messages
   - Max file size (MB)
   - **Manual purge button**: "Clear ALL chat messages and stored images" — confirmation modal + DELETE from chat_messages + DELETE from Supabase Storage `chat_images/`.
6. **Aliança** — edit alliance public-facing info: rank, composition labels, motto override, hero of the week, etc.
7. **Notificações** — compose new notification:
   - Rich editor (title, body, emoji, image)
   - **Target audience picker**: "All members" / specific R-level / individual member multi-select / by-tag
   - **Tap target picker**: optional deep-link to specific event/poll/route
   - **Schedule**: send now / schedule for later / recurring
   - List of past notifications with delivery stats
8. **Dados** — analytics dashboard:
   - Currently online count
   - Active sessions (account list with last-seen timestamp)
   - "Never logged in" list (members with account created but no first_login_at)
   - "Logged in today/week/month" buckets
   - PWA install split (X installed vs Y browser-only)
   - Notification delivery rates

---

## 1nonies · Updated permission matrix (RLS reference)

| Table | Read | Insert | Update | Delete |
|---|---|---|---|---|
| `events` | public | r4+ | r4+ | r4+ |
| `event_occurrences` | public | r4+ | r4+ | r4+ |
| `event_squads` | public | r4+ | r4+ | r4+ |
| `event_participations` | public | self (own member_id) OR r4+ | self OR r4+ | self OR r4+ |
| `kingdom_milestones` | public | r4+ | r4+ | r4+ |
| `members` | public | r4+ | r4+ | r4+ |
| `polls` | public | r4+ | r4+ | r4+ |
| `poll_options` | public | r4+ | r4+ | r4+ |
| `poll_votes` | own only (or admin) | self | self (re-vote) | self OR r4+ |
| `member_accounts` | own row OR r5 | r5 | self (own non-role fields) OR r5 | r5 |
| `login_events` | own OR r4+ | system | none | none |
| `chat_messages` | logged-in | logged-in | self (edit own) OR r5 | self (soft) OR r5 |

---

## 2 · Phased roadmap (current state in 【】)

| # | Phase | Status |
|---|---|---|
| 0 | Project setup, tooling, theme | 【done】 |
| 0.5 | Premium visual overhaul (framer-motion, real assets, sparkles, border-beam) | 【done】 |
| 1 | Palette B (Old Tavern Wood) + Salles credit | 【done】 |
| 2 | Supabase backend (schema, RLS, repos, types, admin login + CRUD) | 【done】 |
| 3 | Real dashboard (Next event / Week / Kingdom timeline / All events) | 【in progress】 |
| 4 | i18n complete (10 langs + selector). EN default. | pending |
| 5 | Bear 1 page — full visual guide (9 blocks from original spec) | pending |
| 6 | **PWA push notifications** (admin sends; translated; subscriber language honored) | pending |
| 7 | **Game catalogue admin** — heroes / pets / masters / troop tiers CRUD | pending |
| 8 | **Members roster** — nick / highest troop tier / power, power-history snapshots, dashboard card | pending |
| 9 | Other 7 event pages — elegant placeholders, then content | pending |
| 10 | Polish + Vercel deploy (`dad-1652.vercel.app`) + README | pending |

Phases 6/7/8 are the major new requirements from Salles' Jun 14 message
("PWA notifications", "novos heróis/mestres/pets/tropas", "lista de membros
com nick / nível de tropa / poder + evolução").

---

## 3 · Database additions (FUTURE migrations, not applied yet)

### 3.1 Game catalogue (Phase 7)

```sql
CREATE TYPE troop_branch AS ENUM ('infantry','cavalry','archer');

CREATE TABLE heroes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'chenko'
  name TEXT NOT NULL,
  generation INTEGER NOT NULL CHECK (generation BETWEEN 1 AND 12),
  role TEXT,                            -- leader / joiner / utility
  preferred_branch troop_branch,        -- if biased toward one branch
  portrait_url TEXT,
  description TEXT,
  released_at TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  generation INTEGER NOT NULL CHECK (generation BETWEEN 1 AND 12),
  portrait_url TEXT,
  description TEXT,
  released_at TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unlock_order INTEGER NOT NULL UNIQUE, -- 1=Valora, 2=Pan, 3=Roman, 4=Cassia...
  portrait_url TEXT,
  description TEXT,
  released_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE troop_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_label TEXT UNIQUE NOT NULL,       -- 'T1' .. 'T9', 'TG1' .. 'TG10'
  is_truegold BOOLEAN NOT NULL,           -- true for TG*
  display_order INTEGER NOT NULL,         -- ascending power
  training_building_level INTEGER,        -- 30 for T9, 35 for TG1, ...
  icon_url TEXT,
  description TEXT
);

-- Each troop tier × branch combination has its own icon (T9 infantry, T9
-- cavalry, T9 archer all look different). Allow per-branch icons.
CREATE TABLE troop_tier_branch_icons (
  tier_id UUID REFERENCES troop_tiers(id) ON DELETE CASCADE,
  branch troop_branch NOT NULL,
  icon_url TEXT NOT NULL,
  PRIMARY KEY (tier_id, branch)
);
```

**Seed strategy:** I already have hero portraits in `/public/images/heroes/`.
Pre-populate `heroes` with the 33 already-downloaded entries on first run.

### 3.2 Members roster (Phase 8)

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nick TEXT NOT NULL,                    -- in-game nickname (e.g. 'Salles')
  alliance_role TEXT,                    -- R1/R2/R3/R4/R5
  highest_troop_tier_id UUID REFERENCES troop_tiers(id),
  current_power BIGINT NOT NULL DEFAULT 0,
  avatar_url TEXT,                       -- optional player frame screenshot
  active BOOLEAN NOT NULL DEFAULT true,
  joined_at DATE,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX members_power_idx ON members (current_power DESC);

CREATE TABLE member_power_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  power BIGINT NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id)
);

CREATE INDEX member_power_snapshots_member_idx
  ON member_power_snapshots (member_id, snapshot_at DESC);

-- Optional: per-occurrence participation
CREATE TABLE event_participants (
  event_occurrence_id UUID NOT NULL REFERENCES event_occurrences(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  participation_role TEXT,               -- leader / joiner / standby
  notes TEXT,
  PRIMARY KEY (event_occurrence_id, member_id)
);
```

**Trigger:** auto-record a power snapshot whenever `members.current_power`
changes. Lets us draw the evolution chart without manual snapshotting.

```sql
CREATE OR REPLACE FUNCTION public.tg_member_power_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_power IS DISTINCT FROM OLD.current_power THEN
    INSERT INTO public.member_power_snapshots (member_id, power)
    VALUES (NEW.id, NEW.current_power);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER members_power_snapshot
  AFTER UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.tg_member_power_snapshot();
```

### 3.3 PWA push notifications (Phase 6)

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'en',
  user_agent TEXT,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE push_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_i18n_key TEXT NOT NULL,                 -- 'push.eventStartingSoon.title'
  body_i18n_key TEXT NOT NULL,                  -- 'push.eventStartingSoon.body'
  i18n_params JSONB,                            -- { "eventName": "Bear Hunt 1", "minutes": 15 }
  scheduled_for TIMESTAMPTZ,                    -- null = send-now
  related_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  related_occurrence_id UUID REFERENCES event_occurrences(id) ON DELETE SET NULL,
  url TEXT,                                     -- '/bear-1'
  sent_at TIMESTAMPTZ,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE push_message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES push_messages(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  error TEXT
);
```

**Architecture:**
- Subscriber stores `language_code` from the user's current i18n choice at
  subscription time. Updated whenever the user changes language.
- A **Supabase Edge Function** (`send-push`) runs on cron every minute. It
  picks all `push_messages` where `scheduled_for <= NOW() AND sent_at IS
  NULL`, expands them for each active subscription, translates the
  title/body using the subscription's language + the keyed strings + params,
  and POSTs to the Web Push endpoint.
- Admin UI in `/admin/notifications`:
  - "Compose one-off" (immediate or scheduled)
  - "Schedule auto-reminders": for each upcoming occurrence, queue a
    notification N minutes before (default 15 min, configurable per event).
- Translations live in `src/locales/*/push.json` so they can be edited
  separately from UI strings.

**Choice of web-push library:** the Edge Function uses `web-push` from npm
via Deno's `npm:` import (`deno-web-push` works). VAPID keys generated once
via `npx web-push generate-vapid-keys` and stored in Supabase secrets.

---

## 4 · UI conventions (locked in)

| Rule | Where |
|---|---|
| All times in UTC + `UTC` suffix visible. | NextEventCard, WeekCalendar, Kingdom timeline, admin forms |
| `datetime-local` inputs in admin forms — convert to UTC before insert | `new Date(value).toISOString()` |
| Default language = EN (never auto-detect browser) | `src/i18n.ts` |
| Admin entry hidden in footer, never in header | `Footer.tsx` |
| Mobile-first; everything must look right at 360px wide | every component |
| Premium feel: framer-motion + sparkles + border-beam + glassmorphism | already established |
| Image fallbacks via `<ImageWithFallback>` — never broken `<img>` | UI components |
| Sentence case in body; UPPER CASE only for the Cinzel display titles | content |

---

## 5 · Open questions / decisions to revisit

- **Push notification VAPID key generation** — needs admin action: `npx
  web-push generate-vapid-keys`, then save as Supabase Vault secrets
  `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`. Public key also ships to the
  frontend as `VITE_VAPID_PUBLIC_KEY`.
- **Member roster import** — Salles said he'll send the 87-member list. When
  it arrives, write a one-shot SQL upsert. Each row: `nick, alliance_role,
  highest_troop_tier_id, current_power`.
- **Troop/TG icons** — I have hero portraits but not troop/TG icons yet. They
  exist in the game files but aren't hosted by kingshotwiki in the same
  bucket I scraped. Try kingshotdata.com / kingshot.fandom.com next time;
  otherwise build a clean SVG fallback per branch+tier.
- **Power snapshot cadence** — keep every change for now. We can compact
  later (down-sample to daily) if the table grows huge.

---

## 6 · Salles' verbatim instructions (preserved)

> "o horário 'padronizado' do jogo é UTC" — UTC tudo.
>
> "o idioma 'padrão' é o ingles, porque é universal" — EN default sempre.
>
> "Provavelmente, vamos ter que adicionar outros idiomas posteriormente" —
> arch deve permitir adicionar novos JSONs sem refactor (já permite).
>
> "A rota de /admin nao deve ficar exposta logo de cara" — escondido no
> rodapé. Aplicado.
>
> "O login de admin deve ser padronizado, um usuário de acesso e uma senha
> unica de acesso" — 1 conta compartilhada. Aplicado via Supabase Auth.
>
> "na rota de admin deve ter a opção de adicionar novos heróis (quando a
> geração 4 chegar, por exemplo), novos ursos, novos mestres, etc." —
> Phase 7 catalogue admin.
>
> "ele pode editar/excluir/adicionar os mestres, os heróis, os pets, a
> geração de construção/tropas (T8, T9, T10, TG1..TG8)" — schema 3.1.
>
> "Criar/cadastrar lista de membros. Ou seja, temos 87 membros atualmente
> [...] campos de adicionar Nick, nível de tropa: T1..TG8, e o poder" —
> schema 3.2 + Phase 8.
>
> "periodicamente o /admin tem que atualizar o poder dos jogadores/membros
> da aliança e ir, inclusive, controlando a evolução, vendo o aumento" —
> snapshot trigger in 3.2.
>
> "podia ter um card no dashboard que liste os membros e estes detalhes" —
> MembersCard component in Phase 8.
>
> "busque na base da dados dos outros sites o simbolo/icone/imagem que
> representa o nível das tropas e níveis do TG, no jogo isso fica bem
> explícito!" — Phase 7 asset hunt.
>
> "Não necessariamente aplique tudo o que eu disse aqui agora, se não for o
> momento, guarde para a fase que for aplicar [...] o que nao pode
> acontecer é esquecer estas instruções" — ESTE ARQUIVO é a memória.

---

End of PLANNING.md. When you read this file at the start of a session, you
have the full picture. Anything else is in the migrations under
`/supabase/migrations/` and the code under `/src/`.
