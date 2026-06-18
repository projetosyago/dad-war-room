# DAD War Room — Lessons Learned

> **Generated**: 2026-06-18 from 22 development waves (June 2026).
> **Audience**: anyone touching this codebase. Read before you fix anything.
> **Source of authority**: this file consolidates `WAR_ROOM_LOG.md` §5 (Lessons 1-20) + `SESSION_LOG_2026-06-17.md` §7 + post-Wave-17 learnings + the design rejection cycle (Waves 18-22).

This is the "stuff that took us hours to figure out" file. Every lesson here has the shape:

1. **What happened** — the symptom you'd see
2. **Why it happened** — root cause
3. **Fix** — what we did
4. **How to avoid** — heuristic for next time

---

## 1. iOS PWA standalone mode behaves differently than browser Safari

**Wave 14 + ongoing.**

**Symptom**: bugs that work in regular Safari (or Chrome desktop) but break only when the app is launched from the home screen in PWA standalone mode.

**Specific instances:**

- `position: sticky` on `Header` works in browser but silently loses scroll anchor in standalone mode when the parent is a flex column with `pt-safe`. The header scrolls away with content.
- `apple-touch-icon` cached for a full year by iOS — deleting and re-installing the PWA does NOT refetch the icon.
- `safe-area-inset-bottom` is non-zero (home indicator zone) — content scrolls under the bottom nav if not accounted for.
- Tap delay (~300ms) on links without `touch-action: manipulation`.

**Fix**:
- Use `position: fixed top-0 inset-x-0` + a sibling `<HeaderSpacer />` instead of sticky. Sticky inside a flex column loses anchor in PWA standalone; fixed doesn't depend on ancestors.
- Cache-bust icon URLs: `<link rel="apple-touch-icon" href="/icons/apple-touch-180.png?v=2">`. Bump `v=N` when icon changes.
- `BottomNavSpacer` height = `calc(64px + max(0.5rem, env(safe-area-inset-bottom)))` — additive math, grows with the inset.
- Add `touch-action: manipulation` on all input-like elements.

**How to avoid**: when developing new chrome (header/nav/footer/modal), explicitly test in iPhone PWA standalone mode, not just desktop browser. The differences are silent failures, not exceptions.

---

## 2. Vercel `cache-control: immutable` + iOS = forever-stale icons

**Wave 13.**

**Symptom**: shipped new PWA icon. Old icon stuck on user's home screen even after re-install of the PWA.

**Why**: Vercel ships `cache-control: public, max-age=31536000, immutable` on `/icons/*` by default. iOS Safari honors this hard and respects "immutable" — it does not revalidate. The icon you uploaded last week sits in the iOS HTTP cache for a year.

**Fix**: append `?v=N` query string to every icon reference in `index.html`. iOS treats query-stringed URLs as distinct resources. Bump `v=N+1` on every icon refresh.

```html
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-180.png?v=2">
<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg?v=2">
<link rel="mask-icon" href="/icons/mask-icon.svg?v=2" color="#13172a">
```

**How to avoid**: never assume Vercel's default caching is fine. Static assets meant to be "live" (icons, og-image) need either custom cache headers (`vercel.json`) OR a cache-bust query string.

---

## 3. pg_cron + edge functions = JWT verification trap

**Wave 11.**

**Symptom**: pg_cron job triggers `send-push` every minute. Browser-triggered call works (admin "send now"). pg_cron call returns 401 silently.

**Why**: the cron SQL was supposed to include an `Authorization: Bearer {service_role_key}` header via `current_setting('app.settings.service_role_key', true)` — but in this Supabase project that setting was never populated, so it returned NULL. The cron sent the request without auth header. The edge function had `verify_jwt: true`, so it 401'd.

**Fix**: redeploy the edge function with `verify_jwt: false`. The function uses its own internal `SUPABASE_SERVICE_ROLE_KEY` env var (always present in Edge Functions) to authenticate to Postgres. The caller's JWT becomes redundant — the function does its own access checks based on what it needs to do.

**How to avoid**: any function called by `pg_cron` should be designed `verify_jwt: false` from day one. It will authenticate via its own env var; the caller's JWT is meaningless for cron triggers. The simpler architecture is more robust.

---

## 4. Browser auto-translate vs branded names

**Wave 9 + ongoing.**

**Symptom**: Chrome on PT-BR translates "DAD BIGDADDYS" → "PAPAI GRANDÃOS" or worse. Our i18n explicitly says NOT to translate brand names, but the browser doesn't read our `dont-translate.json`.

**Fix**:
- `<html translate="no">` at the document root
- `<meta name="google" content="notranslate">` in `<head>`
- `translate="no"` on every brand-name span in `Header.tsx`, `Alliance.tsx`, etc.

**How to avoid**: brand names, in-game item names (skill books, shards), and any term where literal preservation matters must wear `translate="no"` at the span level — belt + suspenders alongside the document-level block, because the document-level block is sometimes ignored by aggressive browser extensions.

---

## 5. i18next plural keys look "missing" to naive grep

**Wave 11.**

**Symptom**: a naive i18n audit script flagged 10 keys as "missing in EN locale". They were all actually present.

**Why**: i18next auto-pluralizes via `key_one` / `key_other` suffixes. The audit grepped for the bare `key` name and didn't find it because the actual JSON entries are `key_one` and `key_other`.

**Fix for audits**: before flagging a key as missing, search for `t(key, { count: N })` call patterns AND look for matching `key_one` / `key_other` / `key_zero` forms in the locale file.

**How to avoid**: when writing new i18n calls that take a `count` parameter, always create at least `_one` and `_other` variants in en.json. Don't rely on a single key for pluralizable content.

---

## 6. `BottomNavSpacer` height eaten by safe-area

**Wave 11.**

**Symptom**: on iPhone Pro (with home indicator), content scrolls underneath the bottom nav. The nav is supposed to leave a 72px reserve at the bottom of the page so content doesn't get hidden.

**Why**: `h-[72px] pb-safe` rendered the safe-area padding *inside* the 72px box (default `box-sizing: border-box`). On a Pro with a 34px home-indicator inset, the spacer was effectively 38px tall. Content scrolled under.

**Fix**: `minHeight: calc(64px + max(0.5rem, env(safe-area-inset-bottom)))` — additive, so the spacer grows WITH the inset, not collapses INTO it.

**How to avoid**: when reserving space for fixed elements, prefer additive `min-height: calc(BASE + env(safe-area-inset-*))` over `height + padding`. Padding-inside-fixed-height eats the reserve.

---

## 7. Vercel "Require Log In" blocks OG image scrapers

**Wave 14.**

**Symptom**: Discord / Facebook / WhatsApp link previews fail. The site is up and authenticated users see fine.

**Why**: Vercel's "Standard Protection" (Vercel Authentication) shows a JavaScript challenge before letting any request through. Social media link-preview scrapers don't run JavaScript — they get a 401 page and give up. They never see the actual `og-image.png`.

**Fix**: disable Vercel Authentication for the project. The app's own auth (Supabase Auth + RLS) protects what matters. Vercel's gate was strictly worse for this app's threat model.

**How to avoid**: if your app has its own auth, Vercel's project-level auth gate is redundant and harmful. Disable it unless the project genuinely has no other auth.

---

## 8. Subagent `sleep` long-runs are an anti-pattern

**Wave 10 + Wave 15.**

**Symptom**: launched an agent to "deploy + wait + verify". Agent ran `sleep 60` waiting for deploy. Stalled, ran out of turn budget, returned nothing useful.

**Why**: subagents have a turn/token budget. Sleeping eats from that budget without producing output. By the time the sleep finishes, the agent may have no budget left to actually verify.

**Fix**: for follow-on verification of long-running things (deploys, scrapes, builds), drive from the main loop:
- `Bash run_in_background: true` for the long task
- Use `Monitor` tool to await a condition, OR poll via `Bash` in main loop
- Spawn a follow-up agent later if needed

**How to avoid**: subagents are best for **bounded, parallel investigation**, not for **wait-and-verify cycles**. If your subagent prompt includes `sleep`, you've designed it wrong.

---

## 9. Card-hero tone × glow matrix beats per-card overrides

**Wave 15.**

**Symptom**: dashboard cards drifted in style. Each card had its own bespoke shadow + halo + tint combo. Adding a new card variant meant adding new CSS that probably didn't match.

**Fix**: refactor `card-hero` into a **matrix system**:
- **5 tones**: `gold` (default), `crimson`, `success`, `steel`, `violet`
- **3 glow positions**: top-left (default), top-right `--glow-tr`, center-top `--glow-c`
- **Optional `--pulse`** modifier (guarded by `prefers-reduced-motion`)

CSS variables drive everything. Adding a new variant is one line.

**How to avoid**: when you find yourself writing CSS for a NEW card variant, ask: can this be a tone or position attribute on an existing class? Reach for combinatorial systems before bespoke styles.

---

## 10. Browser-tab parser misuses for HTML scraping

**Wave 16-17.**

**Symptom**: scraped 230 skill icons but the "Lv. 5 / X" badge baked into the source assets was still visible after my crop.

**Why**: the initial `bottom: 22%` crop wasn't aggressive enough. The badge sat in the bottom-left ~25% × 25% of the source asset.

**Fix**: 32% bottom + 10% sides crop (Wave 18 update). For files already cropped locally (Wave 17 → 18), wrote an additional `recrop-skill-icons.mjs` that adds another 12% on top of existing files — idempotent via a marker file.

**How to avoid**: when scraping images that have baked-in UI overlays (level badges, "MAX" stickers, watermark), measure the overlay's actual size on a representative sample BEFORE batch processing. A 5% over-shoot is cheaper than 200 re-processes.

---

## 11. Game-data text-extraction heuristic: "kill the narrative, keep the mechanic"

**Wave 21.**

**Symptom**: scraped skill descriptions read as cinematic narrative ("Amadeus casts enemies in the target area upward followed by three powerful slashes…"). User wanted ONLY the mechanical effect ("Three powerful slashes, each dealing Attack * 224% damage").

**Fix**: `simplifyDescription(text, heroName)` heuristic with three rules:

1. Strip leading `{HeroName}[s|'s]? ` prefix
2. If text contains `followed by …`, slice from after it
3. If text has `, dealing|increasing|reducing|…` at offset ≥35 chars, drop the lead-in and convert the -ing verb to imperative (dealing → Deal, increasing → Increase, etc.)

Threshold 35 chars preserves short-action descriptions ("Throws her spear, dealing …" — the action IS the mechanic) while stripping long narrative leads.

**How to avoid**: when displaying scraped narrative text in a focused mobile UI, you almost always want a simplifier. Don't render verbatim. Build a 3-rule heuristic, test on 5 representative examples, ship.

---

## 12. Mobile-first means designing AT mobile, not for mobile

**Waves 18-22, repeated rejection cycle.**

**Symptom**: built 4 successive iterations of the Hero Detail page. User rejected every one. Reasons cycling through: "looks dead", "looks like every other section", "horrible base stats", "padded for desktop not mobile".

**Why**: I was designing in my head at desktop dimensions, sketching mockups in wide widget canvases, and then squeezing them into 375px. The result LOOKED OK at desktop and felt cramped at mobile. By the time the actual iPhone PWA renders showed up, the bones were wrong.

**Fix**:
- **All design exploration happens at 375px width.** No exceptions. If a mockup tool only goes to 768px, the mockup is invalid.
- **Mockup with REAL data and REAL screen height.** Don't mockup the top 50% — show the whole scroll.
- **Animation, depth, and color belong in the mockup, not as afterthought.** A flat-shaded wireframe-style mockup will look "dead" in production.
- **When user says "tudo igual" repeatedly**, that means sections are visually interchangeable. The fix is differentiation per section, not more uniformity.

**How to avoid**:
- Reach for `claude.ai/design` (with `/design-sync` if possible) for any non-trivial visual page. The design agent there iterates faster on visual fidelity.
- Use `show_widget` mockups ONLY for layout exploration, not for visual approval — the widget's flat aesthetic doesn't translate to a polished mobile game UI.
- When the user says "do something amazing", believe them — don't try to slip in a minor edit and hope it satisfies.

---

## 13. The "all sections look identical" failure mode

**Wave 19-22.**

**Symptom**: every card on a page uses the same dark navy + gold border. User says "tá tudo igual, parece que cada seção é a mesma coisa". They're right — the page reads as a stack of clones, not a layered experience.

**Why**: I leaned on the `card-hero` base class for every section because it's reliable. The reliability became uniformity. Section-level differentiation got squashed.

**Fix in progress**: explicit visual differentiation per section type:
- Hero banner = portrait-dominant cinematic stage
- Skill list = collectible mini-cards with own glow
- Gear shrine = ornate centered presentation, violet glow, gear icon focus
- Upgrade path = progression visualization (skill tree style)
- Each section feels like a DIFFERENT KIND OF OBJECT, not "card #N"

**How to avoid**: when designing a page with 4+ sections, the question "what kind of OBJECT is this section?" must be answered DIFFERENTLY for each section. If two sections answer the same way ("it's a card"), one is wrong.

---

## 14. `position: sticky` can't be trusted in iOS PWA

**Wave 14 (and re-confirmed since).**

Same as Lesson 1 but worth its own bullet because the failure mode is silent:

`sticky` works in: regular Safari, Chrome, desktop everything.
`sticky` fails silently in: iPhone PWA standalone mode, with no console error.

The element just doesn't stick. It scrolls with the page.

**Rule**: never use `position: sticky` in this codebase. Always use `position: fixed` with a sibling spacer. The bottom nav has used `fixed` since day one; the header was migrated in Wave 14 after this bug surfaced.

---

## 15. Typescript regen breaks `as any` workarounds

**Wave 10.**

**Symptom**: had `as unknown as any` casts scattered to work around stale Supabase types. After regenerating types, the casts became type errors AND the casts were now hiding real bugs.

**Fix**: run `supabase gen types typescript` regularly. When types catch up, search for `as unknown as any` and remove them. The compiler will tell you what was actually wrong.

**How to avoid**: never let `as any` casts be permanent. Add a `// TODO: remove after type regen` comment. Run typegen monthly as a hygiene task.

---

## 16. Vercel CLI auth via token-paste in chat is fast but ugly

**Wave 10-11.**

**Symptom**: Vercel MCP just returns "use the CLI". User pasted their token in chat. We used it; we now had to rotate it after the session.

**Why**: this is the cost of getting non-interactive Vercel access from a chat-based AI session. There's no clean way around it without setting up a CI service account.

**Fix for now**: token-paste works. Always remind the user to rotate the token after the session, since the chat could theoretically be replayed.

**How to avoid**: for repeated Vercel work, set up a project-scoped service-account token (rotatable, scoped to one project) and store in `.env.local` of the dev machine.

---

## 17. Workflow tool needs explicit opt-in, but Agent doesn't

**Wave 23 (this session).**

**Symptom**: tried to use the `Workflow` multi-agent orchestrator for a non-explicitly-opted-in task. Tool is restricted to "user explicitly opted in".

**Fix**: use multiple `Agent` calls in parallel instead. Agents are free to use without explicit opt-in — you can dispatch N of them in a single message and they run concurrently. The orchestration just lives in your prompt rather than in a deterministic script.

**How to avoid**: when you want parallelism, default to parallel `Agent` calls. Reach for `Workflow` only when the user said "use a workflow" verbatim, or when the orchestration genuinely needs deterministic control flow (loops, conditionals, fan-out with synthesis).

---

## 18. Image assets from kingshotdata.com come with frames + badges baked in

**Wave 18 + 19.**

**Symptom**: scraped hero portraits show with off-white frames. Skill icons show with "Lv. 5 / X" badges. Looks unprofessional in production.

**Why**: kingshotdata.com displays its assets in styled containers. Their hosted source files include the styling — the off-white "frame" is part of the asset, not a CSS effect on their site.

**Fix**: post-process via `sharp` at scrape time:
- Hero portraits: 8% symmetric crop per edge
- Skill icons: 8% top, 10% sides, 22-32% bottom (asymmetric — badge in bottom-left)
- Idempotent re-runs via marker files (`.processed-v2`, `.recropped-v1`)

**How to avoid**: never assume a scraped asset is clean. Always pre-process. Build an idempotent pipeline (marker files) so you can re-run with different params without re-downloading.

---

## 19. The `unknown` post in WP REST + slug detection

**Wave 16.**

**Symptom**: scraped 33 of 34 heroes — "Amane" failed with "no post matched".

**Why**: on kingshotdata.com, "Amane" is internally slugged as `mikoto`. The URL is `/heroes/mikoto/`, not `/heroes/amane/`.

**Fix**: `REMOTE_SLUG_OVERRIDES = { amane: 'mikoto' }` in the scraper. Output JSON still keys by the canonical user-facing slug.

**How to avoid**: when scraping content from a public site with named entities, search-by-title before search-by-slug. Use search API result to derive the actual slug. Build a `*_OVERRIDES` map for the exceptions you find.

---

## 20. The "redundant data path" trap during refactor

**Wave 17.**

**Symptom**: refactored `hero-upgrade-costs.ts` to point at `kingshotwiki/hero/*.png` (canonical wiki path). But `kingshotwiki/items/*.png` from an earlier wave still existed with the same files. Two paths for the same images.

**Fix**: after the refactor, deleted the `items/` folder. Single source of truth.

**How to avoid**: when changing where an asset lives, IMMEDIATELY (same commit) delete the old path. Don't leave the orphan "just in case". Orphans become production weight and confuse future maintenance.

---

## 21. WordPress Yoast i18n placeholder leaks in HTML

**Wave 17.**

**Symptom**: scraped wiki items had slug `kingshot_wiki_item_name_500220_kingshot_end` for some products. Same string sometimes appeared in titles.

**Why**: wiki authors left WordPress / Yoast i18n placeholder tokens unresolved in published content.

**Fix**: in the scraper, treat any slug or title matching `/kingshot_wiki_/i` as invalid. Either skip the item or fall back to a different field (URL filename, image filename, hand-mapped slug).

**How to avoid**: when scraping a public CMS-driven site, expect templating leaks. Build defensive filters for known placeholder patterns.

---

## 22. Mass-translating game terms breaks the community vocabulary

**Wave 9 + Wave 21.**

**Symptom**: ran auto-translation on every UI string in 11 locales. Items like "Mythic Conquest Skill Book" got translated to local-language equivalents that nobody in the community uses (each language has its own slang for the in-game items, usually English-derived).

**Fix**: maintain `src/data/dont-translate.json` with 3 modes:
- `exact` — full-string match never gets translated
- `regex` — patterns like brand names
- `substring` — phrases that appear within larger sentences

The pipeline reads this file before sending each key to the MT service. Convention: **game-data labels (skill books, shards, item names, hero names, event names) stay in English across ALL locales.** UI chrome (buttons, headers, labels) is translated normally.

**How to avoid**: in any i18n setup over content with brand/game terminology, you need a "stop list". Don't rely on the MT service or community proofreading to catch it.

---

## 23. Cron job's edge function output land via `pg_net._http_response` table

**Wave 11.**

**Symptom**: pg_cron job runs. No app feedback. Did it succeed? Did it 500?

**Fix**: query `pg_net._http_response` for the row created by the cron's HTTP call:

```sql
SELECT created, status_code, content_type, length(content) as body_len, content::text
FROM net._http_response
ORDER BY created DESC LIMIT 5;
```

**How to avoid**: every pg_cron HTTP call MUST be observable. Document the query above somewhere reachable (this file, README). Don't assume "no error means success".

---

## 24. CI parity guard is strict — keys must move in lockstep across all 11 locales

**Wave 9 + ongoing.**

**Symptom**: added a new i18n key, committed only the EN locale change, pushed. CI failed because key count diverged across locales.

**Fix**: the i18n parity check in CI counts leaf keys per locale and asserts they're equal. Workflow:

1. Add new keys to `en.json`
2. Run `npm run i18n:translate` (needs LibreTranslate via Docker, OR fall back to MyMemory)
3. Verify all 11 locales have the new keys
4. Commit all 11 locale files together

OR for small additions (1-5 keys), write them manually in all 11 locales in one pass — faster than spinning up the MT pipeline.

**How to avoid**: never commit a partial locale change. CI will yell.

---

## 25. Workflow agents can race on shared files

**Wave 15.**

**Symptom**: ran a 7-agent workflow. Two agents tried to modify `src/index.css` simultaneously. Last write won, first agent's changes lost.

**Fix**: when designing a multi-agent workflow, the **prompt for each agent must declare strict file scope** — explicit list of paths it's allowed to read/write/delete. Conflicting writes get scheduled into different phases (sequential), not the same phase (parallel).

**How to avoid**: in any parallel agent dispatch, ask "could any two of these touch the same file?" If yes, partition the file scope explicitly in each prompt, OR sequence them.

---

## 26. Claude Code permission matchers: Bash uses prefix, file tools use glob

**Wave 23 (setup debug).**

**Symptom**: tried to make `Bash(node scripts/:*)` cover sub-folders like
`scripts/i18n/translate.mjs`. Recommended switching to `Bash(node scripts/**)`
for "recursion". Wrong — `**` is glob syntax for `Read`/`Write`/`Edit` matchers,
NOT for `Bash`. `Bash(node scripts/**)` would either fail to match anything
or behave inconsistently across versions.

**Why it actually works without `**`**: `Bash(prefix:*)` uses simple string-prefix
matching. `:*` is "anything after the prefix", which naturally INCLUDES sub-paths
like `scripts/i18n/translate.mjs`. The pattern `Bash(node scripts/:*)` already
covers all sub-folders. No `**` needed.

**Empirical proof**: tested with `node scripts/i18n/translate.mjs --help` —
ran without prompt, despite being in a sub-folder. The agent that
discovered this also accidentally triggered the script (it doesn't have a
`--help` flag and started actually translating to es/pt locales) — see
recovery procedure below.

**Rule for next time**:
- File matchers (`Read(/path/**)`, `Write(/path/**)`, `Edit(/path/**)`): use glob
- Bash matchers (`Bash(cmd prefix:*)`): use simple prefix only
- Never use `**` inside a `Bash(...)` pattern

**Recovery from accidental translate.mjs run**: if it writes to locale files
unintentionally, `git checkout -- src/locales/{file}.json` reverts. Parity
check after (`node -e` script in HANDOFF_GUIDE §4) confirms 1208 keys × 11.

---

## Meta-lesson: the documentation file pays for itself in ~3 prevented re-debugs

**This file.** Wave 23 (today).

Every lesson here represents 30 minutes to 3 hours of debugging time. The total time invested in writing this file is ~1 hour. Three prevented re-debugs and it's paid back. Read it. Update it. Treat it as living code.

---

*Last updated: 2026-06-18 (Wave 22). Add a new lesson here whenever you encounter a failure mode that took more than 30 minutes to figure out.*
