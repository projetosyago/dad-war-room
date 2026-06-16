# DAD CODEX — Design System Specification

> **One direction, locked. No more piecemeal iteration.** This is the visual
> contract for the entire DAD War Room app. Implementation only begins after
> Salles signs off on every section below.
>
> **Tagline of the aesthetic:** _"A royal codex opened on a midnight war
> table — illuminated manuscript meets premium dark web UI."_
>
> **Preview the rendered version at** `http://localhost:5173/design-preview.html`

---

## §0 · Aesthetic direction (the COMMITMENT)

We're committing to **DAD CODEX**, a medieval-codex × premium-dark direction
that:

| Pulls from | Specifically |
|---|---|
| Aceternity UI / Magic UI / Linear | premium dark surfaces, glassmorphism, border beams, spotlight cursor, mesh gradients |
| Diablo IV / Game of Thrones / Genshin wiki | dramatic typography, gold-on-deep accents, ornamental dividers, ember glow |
| Apple's premium dark mode | restraint, breathing room, materials that feel physical |
| Real medieval illuminated manuscripts | drop caps, decorative flourishes, gilded margins |

**Three feelings the user must have on first open:**
1. "This looks _expensive_." — premium materials, glass depth, gold pops
2. "This is _ours_." — DAD crest crimson + gold is the signature, not generic
3. "It's _alive_." — subtle motion everywhere; nothing is static

**What it is NOT:**
- ❌ Goth dark "tactical military" (we tried that — felt cheap)
- ❌ Warm brown tavern muddy (we tried that — felt low contrast)
- ❌ Light parchment wiki (too friendly, loses war-room edge)
- ❌ Pure black with neon colors (cyberpunk, wrong tone)
- ❌ Generic admin dashboard (Material/Bootstrap shapes)

---

## §1 · Color tokens (semantic, complete)

### 1.1 — Atmosphere — **Inkwell Vault** (revised after Salles' info-density feedback)

> Salles flagged: site has tons of data; near-pitch-black BG with similar-dark
> cards turns into a "void wall" — cards stop popping as containers, the eye
> never rests, reading is fatiguing. Inkwell Vault fixes this by lifting the
> base BG into "midnight slate" territory and pushing cards much higher in
> brightness, creating clear depth steps. **Cards are now the bright surfaces;
> BG is the dark atmosphere behind them.**

| Token | Hex | Role |
|---|---|---|
| `--ink-void` | `#13172a` | Deepest base. Midnight navy, NEVER pitch black. Background fallback. |
| `--ink-night` | `#181d36` | Top stop of body gradient. |
| `--ink-dusk` | `#1f2542` | Bottom stop / fill behind cards. |
| `--ink-charcoal` | `#2a3158` | **Most cards (surface tone). ~40% lighter than `--ink-void` — cards visibly POP.** |
| `--ink-elev` | `#363f6d` | Elevated cards, modals, popovers — visibly above regular cards. |
| `--ink-mist` | `rgba(31, 37, 66, 0.62)` | Glass surface fill (used with `backdrop-blur(24px)`). |

**Step ratios (eye-friendly hierarchy):**
- ink-void → ink-charcoal: +47% lightness (clear separation)
- ink-charcoal → ink-elev: +18% lightness (subtle but visible)

Atmospheric extras (unchanged):
- **Mesh gradient blobs** (3 layered radial gradients): gold `#f4cf73` 8%, crimson `#b13838` 5%, deep blue `#3a4a7c` 4%. Animated by 90s ease-in-out cycle.
- **Grain overlay**: SVG fractal noise, opacity 3.5%.
- **Vignette**: radial dark `rgba(0,0,0,0.45)` at corners — pulls focus inward.

**Reading rules:**
- Body text (`--ink-cream` #f0e9d6) on `--ink-charcoal` cards = contrast 11.4:1 ✓
- Body text on `--ink-void` BG = contrast 13.2:1 ✓
- Both meet WCAG AAA. Cards stay highly readable; BG never strains pupils.

### 1.2 — Gold scale (the brand metal)

| Token | Hex | Role |
|---|---|---|
| `--gold-glow` | `#ffe9a3` | Animated highlights (shimmer, glow). |
| `--gold-soft` | `#ffdb8a` | Hover state, emphasis. |
| `--gold` | `#f4cf73` | **Primary gold.** Brand. Tabs, links, accents. |
| `--gold-dim` | `#c89934` | Subtle, secondary state. |
| `--gold-deep` | `#876318` | Borders, deep accents. |
| `--gold-burn` | `#5e4413` | Very deep, almost as background. |

### 1.3 — Crimson scale (the DAD shield)

| Token | Hex | Role |
|---|---|---|
| `--crimson-glow` | `#e25656` | Animated red glow (rally start, error). |
| `--crimson` | `#b13838` | **Primary crimson.** DAD shield, danger CTAs. |
| `--crimson-deep` | `#6d1818` | Crest background, dark accent. |

### 1.4 — Ink (text)

| Token | Hex | Role |
|---|---|---|
| `--ink-cream` | `#f0e9d6` | **Primary text.** Warm cream on dark (NOT plain white). |
| `--ink-paper` | `#dcd3bd` | Slightly dimmer body text. |
| `--ink-soft` | `#a89e89` | Secondary, subtitles, labels. |
| `--ink-mute` | `#7a7464` | Hints, placeholders. |
| `--ink-dim` | `#4d4a40` | Disabled, tertiary. |

### 1.5 — Functional palette

| Token | Hex | Role |
|---|---|---|
| `--steel` | `#6c7a92` | Neutral chrome (rank badges R3, R2, etc.) |
| `--steel-soft` | `#9aa6ba` | Inactive elements |
| `--success` | `#5cb874` | Confirmed actions, "active" state |
| `--success-soft` | `#a7d8b3` | Success text |
| `--warning` | `#e6b34a` | Soft warning (uses gold scale) |
| `--danger` | `#e25656` | Errors (uses crimson glow) |
| `--info` | `#5b8fd6` | Info notes |

### 1.6 — Branch colors (game-specific)

| Token | Hex | Role |
|---|---|---|
| `--troop-inf` | `#6fa8d6` | Infantry blue (per game) |
| `--troop-cav` | `#c9883e` | Cavalry orange (per game) |
| `--troop-arc` | `#7fc08a` | Archer green (per game) |

### 1.7 — Skill type colors

| Token | Hex | Role |
|---|---|---|
| `--conquest` | `#a85cdb` | Conquest skill kind (purple-ish) |
| `--expedition` | `#5cb874` | Expedition skill kind (green) |

---

## §2 · Typography (4 fonts with character)

We add a CALLIGRAPHIC font for the third tier — gives every page a touch of
manuscript flair without sacrificing readability.

| Tier | Font | Use | Sizes |
|---|---|---|---|
| **Display** | **Cinzel Decorative** (700, 900) | Major page titles, hero h1 only. NEVER body. | 32–56px |
| **Sub-display** | **Cormorant Garamond** (500 italic, 600) | Quotes, motto, drop caps, decorative labels. | 18–28px |
| **Body** | **Outfit** (400, 500, 600) | Everything else. Numbers, paragraphs, UI labels. | 14–17px |
| **Mono** | **JetBrains Mono** (500) | Countdowns, stats, prontuários, codes. | 12–24px |

### Sizing scale (mobile-first → desktop)

```
h1   : 32px / 48px  · weight 700 · letter-spacing 0.02em
h2   : 22px / 28px  · weight 600 · letter-spacing 0.015em
h3   : 18px / 22px  · weight 600
h4   : 15px / 16px  · weight 600 · uppercase · letter-spacing 0.2em (eyebrow)
body : 15px / 16px  · weight 400 · line-height 1.55
small: 12px / 13px  · weight 400 · letter-spacing 0.02em
micro: 10px / 11px  · weight 600 · uppercase · letter-spacing 0.28em
```

### Special treatments

- **Shimmer gold text**: animated gradient sweep over the `--gold` scale, 3s
  ease infinite. Reserved for hero `h1` words only.
- **Drop caps**: first letter of a section paragraph rendered 2x size in
  Cormorant Garamond + gold gradient. Used sparingly (1 per page max).
- **Numeric ticker**: countdowns animate digit changes with vertical roll
  (200ms slide).
- **Letter reveal**: hero `h1` reveals letter-by-letter on first paint (50ms
  stagger).

---

## §3 · Icon system (replace Lucide outlines)

### Decision

**Switch to Phosphor Icons (`@phosphor-icons/react`)** with the **duotone**
weight as primary. Phosphor duotone renders much richer than Lucide line —
two-tone fills with semantic colors, instantly more premium.

For game-specific concepts (Bear icon, DAD crest, troop tiers, TG badges,
War Academy book, hero star/petal), we author **custom SVG** with the same
visual language: 24×24 viewBox, 2-tone (gold + crimson or gold + ink-soft).

### Icon set (final mapping — REVISED after Salles' feedback)

**Rule:** For UI/chrome concepts use Phosphor duotone. For **anything game-specific**,
use the **actual in-game icon** scraped from the Kingshot wikis — never recreate
in SVG when the real asset exists. The DAD crest is the exception (it's the
alliance's own mark, not a game asset, so we keep it as SVG).

| Concept | Source | Asset path / component |
|---|---|---|
| Home | Phosphor duotone `House` | `<NavIcon name="home" />` |
| Events | Phosphor duotone `Swords` | `<NavIcon name="events" />` |
| Members | Phosphor duotone `UsersThree` | `<NavIcon name="members" />` |
| Alliance | Phosphor duotone `ShieldStar` | `<NavIcon name="alliance" />` |
| Settings | Phosphor duotone `GearSix` | `<NavIcon name="settings" />` |
| Calendar | Phosphor duotone `CalendarBlank` | |
| Clock / time | Phosphor duotone `Clock` | |
| Trophy / rank | Phosphor duotone `Trophy` | |
| Crown | Phosphor duotone `Crown` | |
| Search | Phosphor duotone `MagnifyingGlass` | |
| Notification | Phosphor duotone `BellRinging` | |
| Lock / admin | Phosphor duotone `ShieldCheck` | |
| Map / globe | Phosphor duotone `GlobeHemisphereWest` | |
| **DAD Crest** | Custom SVG (alliance's own mark, refined) | `<DadCrest />` |
| **Bear (Bear Hunt event)** | **Real game icon** (already downloaded) | `/images/events/bear-hunt.png` |
| **KvK** | Real game icon | `/images/events/kvk.png` |
| **Viking Vengeance** | Real game icon | `/images/events/viking-vengeance.png` |
| **Swordland / Tri-Alliance / Cesar** | Real game icons | `/images/events/*.png` |
| **Truegold (currency)** | Real game item icon | `/images/items/truegold.png` |
| **Truegold Dust** | Real game item icon | `/images/items/truegold-dust.png` |
| **Truegold Tempered** | Real game item icon | `/images/items/truegold-tempered.png` |
| **Gold (currency)** | Real game item icon | `/images/items/gold.png` |
| **Town Center / city** | Real game building icon | `/images/buildings/town-center.png` |
| **Town Center · TG** | Real game building icon | `/images/buildings/town-center-tg.png` |
| **War Academy** | Real game building icon | `/images/buildings/war-academy.png` |
| **Barracks / Infantry** | Real game building icon | `/images/buildings/barracks.png` |
| **Stable / Cavalry** | Real game building icon | `/images/buildings/stable.png` |
| **Archer Range** | Real game building icon | `/images/buildings/range.png` |
| **Truegold Crucible** | Real game building icon | `/images/buildings/truegold-crucible.png` |
| **Hero Hall** | Real game building icon | `/images/buildings/hero-hall.png` |
| **Hero portraits (33 heroes)** | Real game hero portraits | `/images/heroes/<slug>.png` |
| **Hero Star (6 petals)** | TODO: scrape from a hero-detail page on the wiki, OR Salles screenshots one. Fallback: clean SVG matching game style. | `/images/icons/hero-star.png` |
| **Skill — Conquest (sword + shield)** | TODO: ditto — scrape from skill icon catalog when found. | `/images/icons/skill-conquest.png` |
| **Skill — Expedition (banner)** | TODO: ditto. | `/images/icons/skill-expedition.png` |
| **Troop tier badges (T1..T10, TG1..TG10)** | Salles to confirm if game exposes per-tier badge icons. If yes, scrape. If no, **typographic pill** (current solution) keeps. | `<TierPill>` typographic |

**Phosphor duotone treatment:** primary fill = current text color, secondary
opacity = 0.2. Gold accent state: primary = `--gold`, secondary opacity = 0.35.

**Already downloaded today (16 new):** 5 items (gold, truegold, truegold-dust,
truegold-tempered, hero-xp) + 11 buildings (town center + TG variant, war
academy, barracks, stable, range, TG variants of each, truegold crucible,
hero hall).

**Still missing (4 categories — TODO before Phase 7 starts):**
1. Skill type icons (Conquest sword/shield, Expedition banner) — try
   `kingshot.fandom.com` or scrape from hero detail rendered modals.
2. Hero star with petals — same. If absent, we render typographic stars in CSS.
3. Per-tier troop badges (T1..TG10) — may not exist as raster; we ship as
   styled pill if not found.
4. R5/R4/R3/R2/R1 rank ribbons (per the in-game roster screenshots Salles
   sent) — keep CSS rank chip but try to find rank graphic.

---

## §4 · Surfaces & cards (the most-felt element)

### 4.1 — The 3 card variants

| Variant | When | Anatomy |
|---|---|---|
| **`card`** | Default content blocks (list items, info tiles). | Background `rgba(255,219,138,0.04) → rgba(20,23,38,0.85)`; border `rgba(244,207,115,0.22)`; radius 18px; subtle inner top highlight 1px; shadow `0 20px 36px -20px rgba(0,0,0,0.55)`. |
| **`card-elev`** | Featured / important blocks (Next Event, Active Guide). | Same gradient idea but starting brighter `rgba(255,219,138,0.07)`; border `rgba(244,207,115,0.32)`; shadow `0 32px 56px -22px rgba(0,0,0,0.65)`; ALWAYS gets the animated `BorderBeam` on its top edge. |
| **`card-glass`** | Header, bottom nav, modals — anything that floats. | Background `rgba(15,18,32,0.55)`; backdrop blur 24px + saturate 160%; border `rgba(244,207,115,0.18)`. |

### 4.2 — Common card features

- **Always rounded** `radius-lg = 18px`. Modals `radius-xl = 24px`. Pills full.
- **Always have an internal top highlight** of 1px in `rgba(255,219,138,0.06)`
  via `box-shadow: inset 0 1px 0 0 …`. This is what makes them feel _carved_.
- **Hover (desktop)**: lift `translate(0, -2px)`, border brightens to `0.4`,
  cursor changes if clickable.
- **Press (mobile)**: `scale(0.97)` 100ms. Tactile.
- **Active/featured**: top-edge gold gradient line (the new "border beam" —
  static 1px wide line at the top, fading toward the edges, NOT the bugged
  rotating wedge from before).

### 4.3 — Corner ornament

Optional decorative SVG ornaments at the 4 corners of important cards — like
illuminated manuscripts. Small, gold, ~12×12px. Used on:
- Hero callouts
- Featured event card
- Admin panel cards (subtle distinction)

Not used on every card (overuse → kitsch).

---

## §5 · Background system (animated, never static)

Two layers + optional spotlight effect:

### 5.1 — Animated mesh gradient (base layer)

3 radial blobs floating slowly:

```css
@keyframes mesh-1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,-30px); } }
@keyframes mesh-2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-50px,20px); } }
@keyframes mesh-3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,40px); } }

body::before {
  content: '';
  position: fixed; inset: -10%; z-index: -2;
  background:
    radial-gradient(600px 400px at 20% 20%, rgba(244,207,115,0.10), transparent 60%),
    radial-gradient(700px 500px at 80% 30%, rgba(177,56,56,0.07), transparent 60%),
    radial-gradient(800px 500px at 50% 80%, rgba(58,74,124,0.06), transparent 65%);
  filter: blur(60px);
  animation: mesh-1 90s ease-in-out infinite;
}
```

3 layered backgrounds, each animated at different speeds. Very slow (60-90s).
Almost imperceptible unless you stare. Adds life without distraction.

### 5.2 — Grain texture (overlay layer)

SVG fractal noise, 3% opacity, fixed. Already in place — keeps texture honest.

### 5.3 — Spotlight cursor effect (desktop only)

A soft gold radial gradient that follows the mouse on hero areas:

```js
// On mousemove inside hero, update CSS variables --x, --y
// The hero has ::after with:
// background: radial-gradient(400px circle at var(--x) var(--y), rgba(244,207,115,0.1), transparent 40%);
```

Disabled on touch devices (no cursor). Disabled if user prefers reduced motion.

### 5.4 — Vignette (top + bottom)

Subtle dark vignette at top and bottom of the viewport so content doesn't bleed
into the edges. `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4))`.

---

## §6 · Motion language

| Pattern | Where | Spec |
|---|---|---|
| **Page transition** | Route changes | Fade out 200ms → fade in + translate-y 12px 300ms cubic-bezier(0.22,1,0.36,1) |
| **Card entrance** | First paint of a section | Stagger 60ms; fade + translate-y 16px; spring stiffness 280 damping 24 |
| **Number ticker** | Power values, countdown digits | Vertical roll 220ms ease-out per digit change |
| **Letter reveal** | Hero h1 first paint | Stagger 35ms per letter; opacity 0 → 1, translate-y 16px → 0; ease-out 600ms |
| **Hover lift** | Cards, buttons | translate-y -2px, border-color brighten, 200ms |
| **Press** | Touch buttons | scale(0.97), 100ms |
| **Border beam** | Featured cards top edge | 1px static gradient line (not animated rotating). Used at top edge only. |
| **Shimmer text** | Hero h1 gold word | Linear gradient sweep, 3s ease infinite |
| **Ripple/pulse** | Live status dot | Concentric circle ripple, 1.6s ease-out infinite |
| **Float** | DAD crest in Alliance hero | translate-y ±6px, 4s ease-in-out infinite |
| **Glow pulse** | Active bottom-nav icon | Box-shadow scale ±20%, 2.6s ease infinite |
| **Section reveal** | Scroll-triggered | IntersectionObserver: fade + translate-y 24px when 20% visible |

### Motion principles

1. **Everything has a reason.** No animation just to fill silence.
2. **Slow over fast.** Default duration 300–600ms, not 100ms.
3. **Spring physics for interactive things.** CSS bezier for state changes.
4. **Respect `prefers-reduced-motion`.** All ambience animations stop. Page
   transitions become instant fade.

---

## §7 · Components (the production set)

### Buttons

| Variant | When | Spec |
|---|---|---|
| `btn-primary` | Main CTAs (Open guide, Sign in) | Gold gradient bg, ink-void text, gold border, subtle gold glow on hover. |
| `btn-ghost` | Secondary | Transparent bg, gold border 0.16, hover bg `gold/8`. |
| `btn-danger` | Destructive | Crimson gradient bg, ink-void text. |
| `btn-icon` | Header / nav | 40×40, transparent, hover bg `white/4`. |

All buttons: min-height 44px (touch), radius 12px, font-weight 600, uppercase
letter-spacing 0.12em, transition all 200ms.

### Badges & pills

| Variant | When |
|---|---|
| `badge-active` | "Active" (Bear Hunt 1). Gold gradient solid. |
| `badge-gold` | Gold accents (tier TG3, etc.). |
| `badge-mute` | "Coming soon", neutral. |
| `badge-danger` | "Out", error. |
| `badge-success` | "Confirmed", "Online". |
| `pill-filter` | Filter chips. Active gets gold gradient, inactive stays muted. |

### Inputs

- Text inputs: bg `--ink-charcoal`, border `gold/16`, focus border `gold/45`, radius 12px, padding 10px 14px, font-size 15px.
- Selects: same shell + chevron-down icon (Phosphor duotone, gold tint).
- Datetime: native `datetime-local`, restyled shell.
- Search: leading icon, clear button, full-width on mobile.

### Modals & sheets

- Modal: `glass-strong` surface, max-w 480px on desktop, full-bleed sheet on mobile.
- Sheet (mobile): slides from bottom, drag-handle, respects safe-area.

### Avatar / portrait

- Square 40, 48, 64, 88, 120, 240 size scale.
- Frame: gold border 1.5px, rounded 12px.
- Mythic heroes: gold gradient frame (premium), with corner glow.
- Members: square 48px in roster, 88px in detail.

### Member roster card — final spec (after 3 rounds of Salles' feedback)

Each member is a **full-bleed card** with portrait, nick, power, tier badge.
NO online status / last-seen (the site has no real-time game telemetry — it
can't know who's logged in). Only "Out" status is shown when admin manually
flags it.

```
┌───────────────────────────────────────────────────────────┐
│ ▮ [R5][PORTRAIT]    JoDee                                  │
│ ▮                                                          │
│ ▮  • 56×56 frame    158.7M   [💎TG3]                      │
└───────────────────────────────────────────────────────────┘
```

#### Anatomy

| Part | Spec |
|---|---|
| **Left rank stripe** (3px × full height) | R5 gold gradient · R4 amber · R3 steel · R2 silver-mute · R1 bronze |
| **Portrait area** 56×56px | Border 1.5px in rank color · 10px corner radius · subtle gold glow if R4/R5 |
| **Rank tag** (top-left of portrait) | Small ribbon "R5"/"R4"/... in display font, color matches rank |
| **Nick** | Outfit weight 600, 16px, ink-cream. Append `ᴰᴬᴰ` superscript in gold uppercase tracking IF member has dad_tag. |
| **Out badge** (inline after nick, ONLY when status=temporary_out) | Crimson pill "⏸ OUT" — manually managed by admin |
| **Power** | JetBrains Mono 15px weight 600, gold color. NO leading icon (the in-game gold-coin icon is a currency, wrong semantic). "M" suffix in 11px muted. |
| **Tier badge** | See below |
| **Chevron** (right edge) | Phosphor duotone caret — suggests tap-to-expand to detail page |

#### Tier badge — TWO variants

**TG players (TG1..TG8):**
- Background `rgba(244,207,115,0.14)` + gold border
- Real game icon `/images/tiers/tg{N}.png` (scraped from
  `kingshot.net/database/truegold-requirements` — 8 ornate gem-shaped gold
  badges, one per TG level)
- Subtle drop-shadow gold glow on the icon
- Label "TG{N}" in Cinzel display font, gold-soft color

**Pre-TG players (T1..T10):**
- Background `rgba(108,122,146,0.18)` + steel border (NOT gold)
- **Custom inline SVG: steel "troop gem"** — 8-pointed gem badge (same visual
  mass as the TG gold gems) with a **steel gradient body**, **crossed swords**
  silhouette inside, and a tiny gold center jewel. NOT the town-center building
  icon (Salles called that out — it's a city building, wrong semantic for
  troops). Lives at `/public/images/tiers/troop-pre-tg.svg`.
- Label "Nv.{X} · T{Y}" — kingdom town center level + the resulting troop
  tier (e.g. "Nv.30 · T10", "Nv.22 · T8") — using Salles' lookup table from
  PLANNING.md §1

This visually signals at a glance: gold gem badge = TG player (high-tier
threat); steel castle = pre-TG (still climbing).

#### What's INTENTIONALLY missing

- **No online indicator** — site has no link to the game's presence API.
- **No "last seen X hours ago"** — same reason.
- **No `/images/items/gold.png` icon next to power** — that's currency, not
  strength. The big mono gold number is enough.

#### Hover / tap

- Hover: lift 2px, border brightens, chevron slides right.
- Tap: scale 0.97.

#### Dense desktop variant (Phase 8)

For lists > 30 items on desktop, an optional toggle to "compact mode" that
hides the portrait, halves padding, and tucks tier into a single line. Default
on mobile stays the rich card.

### Avatars — assignment system (Salles' question)

Members don't have profile pictures in-game that we can scrape. So we let
**the admin assign which hero portrait represents each member**.

#### How it works

1. On the admin page `/admin/members`, each member row has a portrait
   picker.
2. Clicking it opens a **modal with the 33 hero portraits**
   (`/images/heroes/*.png`) in a grid — same library we already have.
3. Admin picks one — saved to `members.avatar_hero_slug` (FK to heroes.slug).
4. On the public `/members` page, that hero portrait shows in the card.
5. **Default** (no pick yet): a generic silhouette SVG in steel color.
6. **Future option** (Phase 8.5): allow the member to upload a custom image
   to Supabase Storage and override the hero pick. Stored at
   `member_avatars/{member_id}.webp`.

#### Schema addition

```sql
ALTER TABLE members ADD COLUMN avatar_hero_slug TEXT REFERENCES heroes(slug);
ALTER TABLE members ADD COLUMN avatar_image_url TEXT;
-- Render order: avatar_image_url (custom) > avatar_hero_slug (hero pick) > default silhouette
```

#### Why this works for the alliance

- Salles can quickly assign portraits to all 88 members in one sitting.
- Members keep their identity even when they don't have a custom upload.
- Hero portraits already match the game aesthetic, so the roster looks native.
- Zero new asset hunting required — we already downloaded all 33.

### Page sections (anatomical)

```
PageHero        (sticky-or-static; brand + tagline)
PageHeader      (small title + breadcrumb)
SectionTitle    (h2 with eyebrow tag, ornament divider, count badge)
ContentRow      (card list or grid)
CTABar          (sticky bottom CTA on mobile guides)
```

---

## §8 · Page layouts (every route)

### Sticky Header — the "plano babilônico"

Glass-blur sticky bar, **same on every route**. Mobile stays compact (no nav
links — the bottom nav handles that). Desktop shows 5 nav links inline.

**Mobile layout (≤ md):**
```
┌──────────────────────────────────────────────────────┐
│ ▮ [crest 34] DAD WAR ROOM      [🔍] [🔔]           │
│              👑 Kingdom 1652                          │
└──────────────────────────────────────────────────────┘
```

**Desktop layout (≥ md):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [crest 34] DAD WAR ROOM  [Home][Events][Members][Alliance][Settings]  [🔍][🔔] │
└─────────────────────────────────────────────────────────────────────┘
```

Specs:
- **Background:** `var(--ink-mist)` (rgba(31,37,66,0.78)) + `backdrop-filter: blur(20px) saturate(160%)`.
- **Border-bottom:** `1px solid rgba(244,207,115,0.22)`.
- **Hairline gold beam** under the border: linear gradient fading at the ends.
- **Height:** 64px at top of page, **shrinks to 56px when scrolled > 24px**. Background opacity bumps 0.62 → 0.85 at the same time. 240ms transition.
- **Crest:** 34×40px DadCrest SVG (refined gold gradient). Hover on desktop = subtle 6° rotation + brightness.
- **Title:** "DAD WAR ROOM" — "DAD" with shimmer gold gradient (continuous loop), "War Room" in ink-cream. Cinzel Decorative 700, 16-17px, letter-spacing 0.18em, uppercase.
- **Kingdom tag (mobile only):** small line below title with Phosphor `ph-duotone ph-crown` + "Kingdom 1652" in 10px tracking 0.28em ink-mute. Hidden on desktop (saves space; the title carries identity).
- **Right side action buttons:**
  - **Search button** (Phosphor `ph-magnifying-glass`): desktop only. Tap → opens global search overlay (Phase 7+, finds heroes/events/members).
  - **Notification bell** (Phosphor `ph-bell-ringing`): both mobile + desktop. Crimson dot top-right if there are unread announcements. Tap → opens last-5 announcements panel (Phase 6). Only renders if user has push enabled.
  - Each is 38×38px, rounded 10px, gold/16 border, ink-soft icon.
- **Admin link never appears here.** Lives in `/settings → Advanced`.

### Home — `/`

Mobile order:
1. (Header sticky)
2. Hero strip: small motto in italic Cormorant (12px tall, just text)
3. **NextEventCard** (card-elev, dominant, BorderBeam top, countdown ticker)
4. **WeekCalendarCard** (card with 7-day strip)
5. **KingdomTimelineCard** (card with list of milestones)
6. **Active guide CTA** (card-elev to Bear 1)
7. "See all events →" link (centered, gold)
8. (BottomNav sticky)

NO stats grid. NO crest. Those live in Alliance.

### Events — `/events`

1. (Header)
2. Page title: eyebrow CATALOGUE + h1 "Events of the Realm" + description
3. Filter pills row: All / Active / Coming Soon / Archived + count
4. Grid of EventCards (2 cols mobile, 3-4 desktop)

### Members — `/members`

1. (Header)
2. Page title: eyebrow ROSTER + h1 "Alliance Members" + count + total power
3. Search + Sort row (sticky on scroll)
4. Grid of MemberCards (1 col mobile, 2 col tablet, 3 col desktop)

### Alliance — `/alliance`

1. (Header)
2. **Hero (clean — no redundant chip):**
   - DAD crest, big (~88px), with float animation + glowing red halo behind
   - h1 with shimmer gold on "DAD" + ink-cream on " BIGDADDYS" (Cinzel Decorative 700, 44–56px)
   - Sub-h: motto in Cormorant Garamond italic 18–20px (gold-soft color)
   - **REMOVED:** the live status ribbon `[DAD] BIGDADDYS · Kingdom 1652` that
     previously sat between badge area and title — it was duplicating the
     header info and breaking the typography. The header already carries
     `Kingdom 1652`; the page title carries the alliance name. Don't repeat.
3. Ornament divider with gold diamonds
4. KPI grid (2x2 mobile, 1x4 desktop): Rank · Members · Power · Languages
5. Composition card (TG count, TG5+ ready, avg power, min tier)
6. Latest announcements (placeholder until Phase 6)
7. Event history (placeholder until Phase 5/8)
8. About paragraph
9. Data freshness footnote

### Settings — `/settings`

1. (Header)
2. Page title
3. Settings rows (Language, Notifications) with icon + title + subtitle + chevron
4. "Advanced" divider
5. Admin sign-in card

### Bear 1 Guide — `/bear-1` (and similar)

1. (Header)
2. Eyebrow "GUIDE" + h1 "Bear Hunt 1" with shimmer + subtitle in PT/EN
3. Hero callout: "The main idea" card with drop cap
4. "Setup for each rally" cards row
5. "Troop rule" callout-warn
6. **Wave timeline visual** (3 waves, color-coded by ember/steel/green)
7. "The Golden Rule" hero-callout-gold with ornament corners
8. R4 coordination block
9. "Your 7 formations" — biggest section, showcases prints + hero portraits + skill thresholds
10. Chat commands list with copy buttons (Bloco 8 from original spec)
11. Footer + BottomNav

### War Academy — `/war-academy`

Similar template, with calculator embedded section.

### Admin pages — `/admin/*`

Distinct sub-style: same palette but slightly cooler (steel notes more present)
to differentiate from public pages. Otherwise consistent.

---

## §9 · Premium effects to ship

These are the "uau" details. All ship in v1 — they're not gold-plating, they
ARE the brand.

1. **Animated mesh gradient bg** (§5.1) — global
2. **Spotlight cursor** (§5.3) — desktop only, hero areas
3. **BorderBeam (top-edge, static)** — featured cards only (NOT the buggy rotating wedge)
4. **Shimmer text** — hero h1 gold word(s)
5. **Letter reveal** — hero h1 on first paint
6. **Number ticker** — countdown digits + power values on Members
7. **Float on DAD crest** — Alliance hero
8. **Ripple ring on status dot** — kingdom badge
9. **Card stagger entrance** — section content
10. **Page transitions** — fade + slide
11. **Custom SVG ornaments at corners** of featured cards
12. **Drop caps** in 1 paragraph per major section
13. **Sticky glass header** with backdrop-blur + saturate

---

## §10 · Mobile-first guarantees

- **All cards at ≥ 320px wide remain legible.**
- **Bottom nav** with 5 tabs, safe-area-inset for iPhone.
- **Tap targets** min 44px height.
- **No horizontal scroll** anywhere except intentional overflow rails.
- **All animations** GPU-accelerated (`transform`, `opacity` only).
- **Lazy-load** hero portraits, formation screenshots.
- **Reduced motion**: respect `prefers-reduced-motion: reduce` — ambience stops.

---

## §11 · Favicons · PWA · Notifications (iOS vs Android)

We ship for **5 platforms** in one pass:

1. Browser tab (Chrome/Firefox/Edge/Safari desktop)
2. iOS Home Screen install (PWA)
3. Android Home Screen install (PWA)
4. iOS lock-screen + banner notifications (16.4+)
5. Android push notifications

Each one reads **different files**. Single source of truth: one master crest
PNG at 1024×1024. Every other asset is derived from it via the `pwa-assets-generator`
CLI shipped with vite-plugin-pwa.

### 11.1 — Asset matrix

| File | Size | Format | Used by |
|---|---|---|---|
| `favicon.svg` | scalable | SVG | All modern browsers (tab) |
| `favicon-32.png` | 32×32 | PNG | Legacy fallback |
| `favicon-16.png` | 16×16 | PNG | Legacy small-tab fallback |
| `apple-touch-icon.png` | 180×180 | PNG (no rounded corners — iOS rounds) | **iOS Home Screen install** |
| `icon-192.png` | 192×192 | PNG | **Android PWA install** (manifest icons) |
| `icon-512.png` | 512×512 | PNG | Android high-DPI + splash |
| `icon-maskable-192.png` | 192×192 | PNG with 20% safe-zone padding | **Android adaptive icons** (One UI, Pixel) — system crops to shape |
| `icon-maskable-512.png` | 512×512 | PNG with 20% safe-zone padding | Android adaptive HD |
| `notification-badge.png` | 96×96 | PNG, **monochrome white-on-transparent** | **Android push** small icon in status bar (Android tints it to system color) |
| `notification-large.png` | 192×192 | PNG, full color | Push notification thumbnail (Android), iOS rich preview |
| `splash-iphone-{model}.png` | varies per device | PNG | **iOS PWA** launch splash. Generated for iPhone SE, 14, 14 Pro, 14 Plus, 14 Pro Max, 15, 15 Pro, 15 Pro Max, iPad mini, iPad Pro. |

Total: **~14 files** (1 SVG + 2 favicons + 1 apple-touch + 4 PWA icons inc. maskable variants + 2 notification + 4 iOS splashes).

### 11.2 — iOS PWA specifics

- **Apple ignores manifest.json icons.** It reads:
  ```html
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  ```
- **No rounded corners on the asset** — iOS rounds them automatically (and you can't override).
- **Theme color** matches our `--ink-void`:
  ```html
  <meta name="theme-color" content="#13172a">
  ```
- **Status bar style** — let our dark UI bleed under the iOS notch:
  ```html
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  ```
- **App title** on Home Screen:
  ```html
  <meta name="apple-mobile-web-app-title" content="War Room">
  ```
- **Standalone mode** flag:
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes">
  ```
- **Launch splash screens** must be authored per device class. We generate
  them from one 2048×2048 master via `pwa-assets-generator`.
- **Web Push** only works **on iOS 16.4+ when the user has installed the PWA**
  (Add to Home Screen). Requires explicit user permission. Notification icon
  shape uses the apple-touch-icon.
- **No auto-install banner.** We need a custom in-app "Install" hint that
  appears once per session on iOS Safari for non-installed users (small
  bottom sheet: "Add War Room to your Home Screen → step-by-step").

### 11.3 — Android PWA specifics

- **Reads manifest.json fully.** Required icons:
  ```json
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
  ```
- **Auto-install banner:** Chrome shows the install prompt automatically when criteria met (HTTPS, manifest, service worker, valid icons). We can also trigger it manually with `window.deferredPrompt.prompt()` bound to a button in /settings.
- **Maskable icons:** Android crops adaptive icons into circle/squircle/teardrop depending on launcher. Our maskable PNG must keep the DAD crest **inside the central 80% safe zone** — anything in the outer 20% can be cropped off.
- **Theme color** sets the toolbar color in Android Chrome AND the install-banner accent.
- **Web Push:** full Web Push API supported. Background sync for notifications when app is closed. Notification badge icon **must be monochrome** white-on-transparent — Android tints it to system color.
- **Splash screen** auto-generated by Android from manifest `theme_color` + the 512 icon. No separate splash images needed (unlike iOS).

### 11.4 — Notification design spec

| | Android | iOS (16.4+, PWA installed) |
|---|---|---|
| Small icon | 96×96 monochrome — DAD crest trinity silhouette in white | Uses apple-touch-icon |
| Large icon | 192×192 full color crest | (iOS PWA can't include image: yet) |
| Title | "Bear Hunt 1 starts in 15 min" | Same |
| Body | "Save your formations now. Wave 1 opens at 11:00 UTC." | Same |
| Badge count on home icon | Yes, via `setAppBadge(n)` | Limited — iOS PWA doesn't expose it yet |
| Tap action | Opens `/bear-1` in the PWA (deep link via `URL` field in payload) | Same |
| Sound | System default | System default |
| Vibration | `[200, 100, 200]` pattern | iOS-controlled |

Notifications get translated to the subscriber's chosen language (per
PLANNING.md push policy) before being sent.

### 11.5 — Implementation TODO

(Maps to Phases 6 push + 10 deploy in the roadmap.)

1. Author **1 master crest PNG at 1024×1024** — refined version of `DadCrest` SVG with proper gold gradient baked in and crimson background depth.
2. Run `npx @vite-pwa/assets-generator` to produce: favicon SVG/PNGs, icon-192/512, maskable variants, apple-touch-icon, iOS splashes. One command.
3. Author the **monochrome notification badge** by hand (96×96 white silhouette of the crest trinity — keep only the 3-petal mark, drop the shield outline).
4. Update `vite.config.ts` PWA manifest with the full icon array (icons + maskable + apple-touch).
5. Add iOS meta tags + Android theme-color to `index.html`.
6. Build the in-app "Install" hint component (mobile-only, dismissable, shows once per session for non-installed iOS Safari users).
7. Build the Settings page "Push notifications" row that:
   - Detects current subscription state
   - Asks for permission on enable
   - Saves the subscription to Supabase (`push_subscriptions` table)
   - Stores the user's i18n language code with the subscription

---

## §12 · Accessibility

- Min contrast 4.5:1 for body text (cream `#f0e9d6` on `#0f1220` = 14.8:1 ✓).
- Min 3:1 for non-text (icons against bg).
- All interactives have `aria-label` if icon-only.
- Focus rings: 2px gold outline + offset 2px, never removed.
- All animations respect `prefers-reduced-motion`.

---

## §13 · What WON'T be in v1 (intentional exclusions)

To avoid scope creep:
- ❌ Audio feedback / sound effects
- ❌ Voice-over / narration
- ❌ 3D / WebGL / Three.js
- ❌ Video backgrounds
- ❌ Per-hero custom illustrations beyond what's already on wikis
- ❌ Light mode (dark mode only — alliance war room)
- ❌ Customizable themes per user

---

## §14 · Approval checklist (Salles signs each)

Before any code change goes out:

- [ ] §1 Color palette approved
- [ ] §2 Typography & fonts approved
- [ ] §3 Icon system (Phosphor duotone + custom SVG) approved
- [ ] §4 Card variants approved
- [ ] §5 Background system (mesh + grain + spotlight) approved
- [ ] §6 Motion language approved
- [ ] §7 Component spec approved
- [ ] §8 Per-page layouts approved
- [ ] §9 Premium effects approved
- [ ] §10 Mobile-first guarantees approved
- [ ] §11 Favicon & PWA icon approved

**Once approved → I rebuild the whole UI in one pass against this spec.
Estimated implementation: 3–4 hours of focused work.**
