# DAD War Room — Handoff Guide for Future Sessions

> **Generated**: 2026-06-18.
> **Audience**: any Claude session (or human developer) picking up this codebase cold.
> **Goal**: get from "I just opened this repo" to "I can ship working changes" without reading the entire chat history.
>
> **Companion docs** (read in this order if you have time):
> 1. `PROJECT_OVERVIEW.md` — what + why
> 2. **THIS FILE** — how to work
> 3. `ARCHITECTURE.md` — system shape
> 4. `LESSONS_LEARNED.md` — pain to avoid
> 5. `TECH_DEBT.md` + `ROADMAP.md` — what to work on
> 6. `SCREENS.md` / `COMPONENTS.md` / `DATABASE.md` / `BUSINESS_RULES.md` / `API_INTEGRATIONS.md` — reference

---

## 1 · Setup checklist (run in order, never skip)

```bash
# 1. Verify cwd
pwd
# MUST output: /Users/yagosales/Documents/Kingshot/DADkingshot/dad-guides

# If you're in /Users/yagosales/Documents/Dev/ler-liberta, you're in the WRONG project.
# That's a sibling project (Ler Liberta) — different stack, different domain.

# 2. Install (MANDATORY flag)
npm install --legacy-peer-deps
# React 19 has peer-dep conflicts with several deps. Without --legacy-peer-deps
# the install fails. This is documented; not a bug.

# 3. Env vars
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (ask user for production values
# or set up your own Supabase project for local dev)

# 4. Run dev
npm run dev
# Opens at http://localhost:5173

# 5. Verify build works
npm run build
# Must succeed before any new commit.
```

---

## 2 · Project context, in one paragraph

DAD War Room is a private PWA for the Kingshot alliance `[DAD] BIGDADDYS`. Single tenant. ~60-100 members. React 19 + Vite + TypeScript + Tailwind 3 frontend. Supabase (Postgres + Auth + Edge Functions + Storage) backend. Web Push for notifications via `pg_cron`. Mobile-first iPhone PWA standalone is the primary target — desktop is secondary. Live at <https://dad-war-room.vercel.app>. Owner is Salles (R5 admin), Brazilian, speaks Portuguese, prefers direct feedback.

---

## 3 · Mandatory conventions

Violating any of these breaks established patterns. Don't.

### 3.1 · TypeScript

- **No `any`** — use `unknown` and narrow, or define proper types
- Supabase types come from `src/types/database/supabase.ts` (codegen'd)
- Run `npx tsc -b` before committing — it must be clean
- Avoid `as unknown as any` casts. If you need them, leave a `// TODO: remove after typegen` comment

### 3.2 · Code structure

- **Files ≤ 300 lines** is the project rule. Currently 5 files violate (see TECH_DEBT P2.3) — don't add a 6th.
- Page components in `src/pages/`
- Reusable components in `src/components/`
- Repository (data access) layer in `src/repositories/` — pages should call `useFoo()` hooks, hooks should call repositories, repositories call Supabase. Don't shortcut.
- Custom hooks in `src/hooks/`
- Cross-cutting utilities in `src/lib/`
- Static catalogues (hero roster, costs, icons) in `src/data/`

### 3.3 · Imports

- Absolute imports use `src/` prefix
- No barrel files (`index.ts` re-exporting many things) — they hurt tree-shaking
- Group imports: react first, then libs, then internal, then types

### 3.4 · Styling

- Tailwind utility-first. Avoid custom CSS files unless making a tokenized design-system primitive (`card-hero`, `eyebrow`, etc — see `src/index.css`)
- Game-grade aesthetic: dark navy (`#07091a`-`#0d1124`), gold accents (`#ffe9a3`-`#c89934`), rarity tints (crimson/violet/green/steel)
- Display serifs (Cinzel Decorative / Cormorant Garamond) for headings, Outfit for body, JetBrains Mono for numbers
- All-caps tracked-out labels: `text-[10px] tracking-[0.28em] uppercase font-semibold`

### 3.5 · i18n (CRITICAL — CI enforces this)

- **All 11 locales MUST have identical key sets.** CI fails on drift.
- Add new key → add to `en.json` first → then either:
  - Run `npm run i18n:translate` (needs Docker LibreTranslate or MyMemory) to fill all locales
  - OR write all 11 manually (faster for 1-5 keys)
- **Never commit a partial locale change.**
- Game-data labels (skill book names, hero shards, item names, hero names, event names) **stay in English across all locales** — community convention.
- Use `dont-translate.json` for terms that must not auto-translate (3 modes: exact / regex / substring).

### 3.6 · Mobile-first

- Design at 375px iPhone viewport. Test in iPhone PWA standalone mode.
- Tap targets ≥ 44×44px.
- Safe-area-aware: use `env(safe-area-inset-bottom)` for fixed elements at the bottom.
- **Never use `position: sticky`** — broken in iOS PWA standalone (see LESSONS §1, §14). Always use `position: fixed` + spacer.

### 3.7 · Animations

- framer-motion for page-level transitions, CSS keyframes for micro-interactions
- Duration: 150-300ms for micro, ≤400ms for complex transitions
- Respect `prefers-reduced-motion` — animations guard via `@media (prefers-reduced-motion: reduce)`
- Don't animate `width`/`height`/`top`/`left` — use `transform`/`opacity`

### 3.8 · Icons

- **No emoji as functional icons.** Use Phosphor (`@phosphor-icons/react`) at sizes 14/16/18/24px with `weight="duotone"` or `weight="fill"`.
- For game asset icons (heroes, items), use the scraped libraries:
  - `/images/icons/kingshot/heroes/{slug}.webp` (kingshotdata.com source)
  - `/images/icons/kingshotwiki/{bucket}/{slug}.png` (kingshotwiki.com source)
  - See `src/data/icon-library.ts` for the master inventory

### 3.9 · Authentication & permissions

- Use `useAuth()` for current account state
- Wrap member-only routes in `<RequireAuth>`
- Wrap admin-only routes in `<ProtectedAdminRoute>`
- Use `auth.isAdmin`, `auth.isVotingMember` flags — don't re-derive from role string
- For DB-level enforcement, define RLS policies — never trust frontend gates alone

### 3.10 · Git workflow

- Commit messages: lowercase, imperative, format `wave NN: short summary` for substantial work, `fix(scope): description` for small fixes, `chore(...)` for housekeeping
- **Always include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`** at the end of commit messages for AI-authored work
- Never `--no-verify` or `--no-gpg-sign` without user's explicit permission
- Never force-push to `main`
- Production deploys on push to `main` via GitHub Actions + Vercel

---

## 4 · How to create a new feature

### Step 0 · Understand before building

Read:
- `BUSINESS_RULES.md` — what rules govern this domain
- `SCREENS.md` — which page is most similar to what I'm building
- `COMPONENTS.md` — what components I can reuse
- `DATABASE.md` — do I need a migration

### Step 1 · Migrate the DB (if needed)

```bash
# New migration
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_short_description.sql
# Write the migration. Apply via Supabase MCP `apply_migration` or local CLI.
# Then regenerate types:
supabase gen types typescript --project-id ilogsrlbenhdzkfgexvt > src/types/database/supabase.ts
```

For schema changes: ALWAYS define RLS policies in the same migration. Never `CREATE TABLE` without `ENABLE ROW LEVEL SECURITY` + at least one policy.

### Step 2 · Build the repository layer

`src/repositories/myDomain.ts`:

```typescript
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database/supabase'

export async function listMyDomain() { /* ... */ }
export async function createMyDomain(args: ...) { /* ... */ }
```

### Step 3 · Build the hook

`src/hooks/useMyDomain.ts`:

```typescript
export function useMyDomain() {
  const [data, setData] = useState<...>([])
  const [loading, setLoading] = useState(true)
  // standard pattern: alive flag, try/finally
  useEffect(() => {
    let alive = true
    ;(async () => { /* fetch */ })()
    return () => { alive = false }
  }, [])
  return { data, loading, /* mutations */ }
}
```

### Step 4 · Build the page component

`src/pages/MyDomain.tsx` — keep under 300 lines. Split into sub-components if it grows.

### Step 5 · Wire the route

`src/main.tsx` — add to the Routes inside `<RequireAuth>` or `<ProtectedAdminRoute>` as appropriate.

### Step 6 · i18n

Add all new strings to `src/locales/en.json` + all 10 other locales. Run parity check:

```bash
node -e "
const ls = require('fs').readdirSync('src/locales').filter(f => f.endsWith('.json'))
const counts = ls.map(f => [f, (() => { const o = JSON.parse(require('fs').readFileSync('src/locales/'+f,'utf-8')); let n=0; function c(x){for(const v of Object.values(x))n+=(v&&typeof v==='object'&&!Array.isArray(v))?c(v):1; return n} return c(o)})()])
counts.forEach(([f,n]) => console.log(f, n))
const set = new Set(counts.map(([,n])=>n))
console.log(set.size === 1 ? 'PARITY OK' : 'DRIFT')
"
```

### Step 7 · Verify

```bash
npx tsc -b              # type check
npm run lint            # lint
npm test                # smoke tests
npm run build           # build (catches some things tsc misses)
```

All four green → commit.

### Step 8 · Deploy

```bash
git push origin main
# GitHub Actions runs CI → Vercel auto-deploys
# Wait ~1-2 min for deploy. Verify with:
curl -sI https://dad-war-room.vercel.app/ | head -5
```

---

## 5 · How to fix a bug

### Step 1 · Reproduce

In dev (`npm run dev`) OR production. Don't fix what you can't reproduce.

### Step 2 · Search for prior occurrences

```bash
grep -rn "<error keyword>" src/ supabase/ scripts/
```

Read `LESSONS_LEARNED.md` for related lessons. The bug you're fixing might be a documented gotcha.

### Step 3 · Identify the layer

| Symptom | Layer to check |
|---|---|
| Visual glitch | Component CSS, design tokens (`index.css`), Tailwind class |
| Wrong data | Repository, hook fetch logic, RLS policy |
| Permission denied | RLS policy, edge function `verify_jwt`, role check |
| Push notification not arriving | `send-push` edge function, pg_cron, VAPID keys |
| iOS PWA-only bug | `position: sticky`, safe-area, cache-bust (see LESSONS §1, §2, §14) |
| Build / type error | `tsc -b`, recent typegen, missing types |
| CI fails on i18n parity | Locale key sets diverged — fix by adding missing keys |

### Step 4 · Write the fix

Smallest change that fixes the symptom. Don't refactor while fixing — separate PR.

### Step 5 · Add a test (if the bug surface is critical)

Vitest in `src/__tests__/`. Smoke level (1-3 assertions per test) is fine for non-critical paths.

### Step 6 · Document the lesson (if non-obvious)

If the bug took > 30 minutes to figure out and the cause was non-obvious, ADD A LESSON to `LESSONS_LEARNED.md`.

### Step 7 · Verify + commit + push

Same as feature workflow.

---

## 6 · The 6 systems to know

### 6.1 · Authentication

- Supabase Auth handles JWT issuance
- `useAuth()` is the single source of truth for current account
- `onAuthStateChange` listener in `src/lib/supabase.ts` re-hydrates store
- `RequireAuth` / `ProtectedAdminRoute` gate routes
- Roles: `ally | member | r2 | r3 | r4 | r5` (from `member_accounts.role`)
- See **BUSINESS_RULES.md** for full permission matrix

### 6.2 · Push notifications

- VAPID keys: public in `VITE_VAPID_PUBLIC_KEY`, private in Supabase Edge Function secrets
- Subscription flow: user enables → service worker subscribes → token stored in `push_subscriptions` table
- Send flow: admin creates notification → `notifications` table → `pg_cron` triggers `send-push` every minute → web push fan-out
- Edge function `send-push` uses `verify_jwt: false` and its own service-role auth internally (see LESSONS §3)
- Service worker: `public/sw-push.js` injected into Workbox SW via `importScripts`

### 6.3 · i18n

- 11 locales: en, pt, es, fr, de, ru, tr, ar, zh, ko, ja
- Source of truth: `src/locales/*.json`
- Loaded via i18next + react-i18next in `src/lib/i18n.ts`
- Translation pipeline: `scripts/i18n/translate.mjs` uses LibreTranslate (Docker) or MyMemory (free tier)
- Stop list: `src/data/dont-translate.json` (3 modes)
- Browser auto-translate: blocked via `<html translate="no">` + `<meta name="google" content="notranslate">`
- Parity is CI-enforced

### 6.4 · Scraping pipelines

- `scripts/scrape-kingshotdata-icons.mjs` — heroes, pets, masters, events, items
- `scripts/scrape-hero-details.mjs` — per-hero skill data via WordPress REST API
- `scripts/scrape-kingshotwiki-items.mjs` — wiki items (skill books, shards, widgets)
- `scripts/scrape-mythic-gear-icons.mjs` — gear widget icons per mythic hero
- `scripts/process-hero-images.mjs` — sharp post-processing (crop frames, badges)
- `scripts/recrop-skill-icons.mjs` — secondary crop pass
- All run with `npm install --legacy-peer-deps` already done. All output to `public/images/icons/`. All idempotent via marker files.

### 6.5 · Design system

- Design tokens: `src/index.css` (CSS variables)
- Component design: `src/components/dashboard/` (card-hero variants), `src/components/ui/` (primitives)
- Master inventory of icons: `src/data/icon-library.ts`
- For NEW page designs: use Claude.ai/design tool (currently blocked on auth — see ROADMAP P0.3)
- For card variants: `card-hero` base + `--crimson` / `--violet` / `--success` / `--steel` / `--portrait` modifier + `--glow-tr` / `--glow-c` / `--pulse` modifiers

### 6.6 · Deployment

- Frontend: Vercel auto-deploys on push to `main`. Logs at vercel.com/remicaos-projects/dad-war-room
- Edge functions: deploy via Supabase Dashboard OR `supabase functions deploy <name> --project-ref ilogsrlbenhdzkfgexvt`
- Migrations: apply via Supabase MCP `apply_migration` or local CLI
- Build: `npm run build` locally is the canary — if it passes, Vercel will too

---

## 7 · What to NEVER do

| Don't | Why | What to do instead |
|---|---|---|
| `position: sticky` on any chrome element | Breaks in iOS PWA standalone (LESSONS §1, §14) | `position: fixed` + sibling spacer |
| Commit a single locale's i18n change | CI fails parity check | Add to all 11 locales |
| Use `any` in TypeScript | Hides type errors that bite later | `unknown` + narrow, or define types |
| Add a file > 300 lines | Project rule, blast-radius increase | Split into sub-components |
| Hardcode the Supabase service-role key in frontend | CRITICAL security violation | Use anon key only in frontend; service role only in edge functions |
| Translate game-data labels (skill books, hero names) | Community uses EN | Add to `dont-translate.json` |
| Use emoji as functional icons | Brand consistency, accessibility | Phosphor / Tabler icons |
| Force-push to `main` | Loses other contributors' work | Always `git push` regular |
| `git commit --no-verify` | Skips hooks that catch real issues | Fix what's failing |
| Modify `vercel.json` without testing | Cache headers, redirects affect production | Test with `vercel --prod` preview first |
| Delete migrations from `supabase/migrations/` | Even if applied. They're the schema-as-code source. | Add a new migration to undo, never delete |
| Build a new feature directly in a page component | Breaks the hook/repository pattern | Hook in `src/hooks/`, repository in `src/repositories/`, then page consumes |
| Skip running `npm run build` before commit | tsc passes ≠ vite build passes | Run both |
| Use `--no-legacy-peer-deps` | React 19 install fails | Always include `--legacy-peer-deps` |

---

## 8 · When to ask the user vs decide alone

### Decide alone (just do it)

- Bug fixes that don't change UX or business rules
- Refactoring that doesn't change behavior
- Adding test coverage
- Adding logging / observability
- Updating docs
- Quick-win debt items from TECH_DEBT (≤ 10 minutes each)
- Cosmetic CSS tweaks within the existing design system
- Performance optimizations
- Lint / format fixes
- Dependency updates that don't break the build

### Ask the user first

- New UX patterns or screens not on ROADMAP
- Changes to user-visible terminology
- Changes to permission boundaries
- Schema changes that could affect existing data
- Hero detail page UX (heavily contested — wait for design tool deliverable)
- Removing features (even unused)
- Adding new top-level routes
- Changing the deploy or CI pipeline
- Adding new third-party services or paid SaaS
- Bumping major dependency versions (React, Supabase, Vite)

### Ask in plain Portuguese (user is Brazilian)

When in doubt, ask. The user prefers a 30-second clarification over a 30-minute redo.

---

## 9 · Emergency procedures

### Production is down

1. Check Vercel deployment status: `gh api repos/projetosyago/dad-war-room/deployments | jq '.[0]'`
2. Check Supabase status: <https://status.supabase.com>
3. Roll back: `gh api repos/projetosyago/dad-war-room/deployments` find last good SHA → `git revert <bad-sha>` → push
4. Notify user

### Build is failing

1. `npm install --legacy-peer-deps` (in case of fresh install)
2. `npx tsc -b 2>&1 | head -20` — type errors first
3. `npm run lint 2>&1 | grep error` — lint errors next
4. `npm run build 2>&1 | tail -30` — see what actually fails
5. If a Supabase typegen mismatch: `supabase gen types typescript --project-id ilogsrlbenhdzkfgexvt > src/types/database/supabase.ts`

### Push notifications stop arriving

1. Check `net._http_response` for cron's recent HTTP calls:
   ```sql
   SELECT created, status_code, content::text FROM net._http_response
   ORDER BY created DESC LIMIT 5;
   ```
2. Check `send-push` edge function logs in Supabase Dashboard
3. Verify VAPID keys are set in Supabase Edge Function Secrets
4. Verify cron job is still scheduled: `SELECT * FROM cron.job;`

### Migration applied with wrong schema

1. Don't panic
2. Create a new "undo" migration in `supabase/migrations/`
3. Apply via Supabase MCP `apply_migration`
4. Regenerate types
5. Document the incident in LESSONS_LEARNED.md

---

## 10 · Conversation style with the user

- The user (Salles) is Brazilian, prefers PT but understands EN technical terms
- Direct feedback: when something works, say so briefly. When something doesn't, say so briefly. Avoid endless apologies.
- The user values speed AND quality — don't be sloppy to be fast
- When facing repeated rejection of an attempt, **stop iterating** and ask "show me the gap you see" rather than guessing
- The user is comfortable with technical depth — don't dumb down explanations
- "FAÇA, NÃO ME ENROLE" energy — bias toward action, document after

---

## 11 · Files I should re-read every session before starting work

In priority order:

1. **THIS FILE** (`HANDOFF_GUIDE.md`) — conventions and gotchas
2. **`LESSONS_LEARNED.md`** — pain to avoid
3. **`ROADMAP.md` P0/P1** — what's urgent
4. **`TECH_DEBT.md` P1** — what's load-bearing
5. (Then go do work)

---

## 12 · How this doc was created

This file (and its 10 siblings) was generated in **Wave 23** (2026-06-18) by:

1. Recon pass to map the project (file counts, structure)
2. 6 parallel general-purpose Agents reading code for: COMPONENTS, SCREENS, DATABASE, API_INTEGRATIONS, BUSINESS_RULES, ARCHITECTURE
3. Main loop (this assistant) writing: PROJECT_OVERVIEW, LESSONS_LEARNED, ROADMAP, TECH_DEBT, HANDOFF_GUIDE
4. Final cross-audit pass to reconcile inconsistencies

The pattern is **reproducible**. To regenerate (e.g., 6 months from now after substantial changes), use the same orchestration. Don't try to update these docs by hand — re-run the audit and let the docs reflect reality.

---

## 13 · One-line summaries (cheat sheet)

| If you need… | Read… |
|---|---|
| The big picture | `PROJECT_OVERVIEW.md` |
| System architecture | `ARCHITECTURE.md` |
| What component does what | `COMPONENTS.md` |
| What page handles what route | `SCREENS.md` |
| Database schema | `DATABASE.md` |
| External integrations / edge functions | `API_INTEGRATIONS.md` |
| Permissions, validations, game rules | `BUSINESS_RULES.md` |
| Historical pain to avoid | `LESSONS_LEARNED.md` |
| Known bugs and debt | `TECH_DEBT.md` |
| What to work on next | `ROADMAP.md` |
| How to work | **THIS FILE** |
| Wave-by-wave history | `WAR_ROOM_LOG.md` (older) + `SESSION_LOG_2026-06-17.md` (recent) |

When ready: pick a P0 / P1 item from `ROADMAP.md`, follow the workflow in §4 above, ship it.
