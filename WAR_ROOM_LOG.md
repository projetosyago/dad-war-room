# DAD War Room — Living Project Log

> **Owner:** Salles ([DAD] BIGDADDYS, Kingdom 1652)
> **Updated:** 2026-06-17 (Waves 10-15 added — see `SESSION_LOG_2026-06-17.md` for the comprehensive narrative of those waves; this file keeps Waves 1-9 as historical record + a brief Waves 10-15 pointer in §2.19)
> **Source of truth.** Always read this before adding features or merging changes. Update it whenever something non-obvious lands.

---

## 0 · Recent session shortcuts

- **2026-06-17 session log** — `SESSION_LOG_2026-06-17.md` is the comprehensive narrative of Waves 10-15 (audit remediation, push notifications shipped, Vercel deploy, full icon system, RequireAuth gate, Council redesign, card variation system, kingshotdata.com icon scrape). Read it before diving into older sections if you need context on what was just shipped.
- **2026-06-17 session handoff** — `HANDOFF.md` §0 has the TL;DR for the next chat.
- **Production live** at https://dad-war-room.vercel.app since 2026-06-16.

---

## 1 · Architecture decisions in force

### 1.1 Schemas & RLS pattern
- All security-gating helpers (`is_admin`, `is_voting_member`, `is_ally`, `account_role`) live in **`private` schema** as `SECURITY DEFINER` functions. `public.*` wrappers re-export them as `SECURITY INVOKER` so RLS policies can call `public.is_admin()` while keeping the heavy logic out of the public introspection surface (Supabase advisor 0017).
- **`authenticated` and `anon` roles MUST have `USAGE` on schema `private`** (granted in `grant_private_schema_usage_to_authenticated`). Without that grant, RLS calling `public.is_admin()` silently resolves to false → every admin write returns 403 (see Lesson 1).
- `ALTER DEFAULT PRIVILEGES IN SCHEMA private GRANT EXECUTE ... TO authenticated/anon` is set so new functions inherit the right grants.

### 1.2 Auth model
- One account per person (no shared "admin" login). Synthetic email `username@dad-war-room.local`.
- Roles: `ally` (read-only outsider), `member`/`r2`/`r3` (voting members), `r4`/`r5` (admins). Flags derived in `useAuth.deriveFlags()`.
- Admin mode is a **chrome toggle** via `AdminModeContext` (localStorage-persisted). Direct URL to `/admin/*` auto-enters admin mode for `isAdmin` users.
- Login redirects: `?redirect=<path>` preserved so admin links work after re-auth.

### 1.3 Card design system
- Three card primitives in `src/index.css`:
  - `.card` (base) — used sparingly
  - `.card-elev` (legacy, slightly milky — being phased out)
  - **`.card-hero`** — the canonical hero anatomy: solid navy fill (`#0d1124`), single corner gold radial (no cream wash), gold border, gold top beam (`::before`), deep shadow
- Variants: `.card-hero--crimson` (war/battle), `.card-hero--success` (resting/all-clear), `.card-hero--steel` (institutional/info)
- Sub-primitives: `.icon-frame` / `.icon-frame--sm` (the framed icon container with glow), `.eyebrow` / `.eyebrow-mute` (tracked-out small caps), `.hero-title` (display, cream by default), `.card-foot` (darker footer band)
- **Rule:** new cards reach for `card-hero`, NOT `card-elev`. Pick a variant when the card has a semantic flavor.

### 1.4 Palette rotation on the Hub
Each card has a different accent so the dashboard doesn't read as one monochrome gold block:
1. UserHero → **gold** (default)
2. NextEvent → **crimson** (call to arms)
3. Polls all-clear → **success-green**, with pending votes back to gold
4. Kingdom Timeline → **steel-blue**

Hero titles are **cream**, never gold. Gold is reserved for: eyebrows, key numerals (countdown, power, days-to-go), CTA links. Tinted icon-frames per variant.

### 1.5 Iconography
- **Prefer real game assets** under `/public/images/{tiers,items,buildings,events,heroes}` over Phosphor when one exists.
- Phosphor used only when no asset fits (`pets`, `pvp`, `fog`, `feature`, `other`).
- Smart resolver: [`src/lib/milestoneIcon.ts`](src/lib/milestoneIcon.ts) parses milestone names ("Truegold 5" → `tg5.png`, "Generation 4 Heroes (Alcar)" → `alcar.png`, "War Academy" → building) before falling back to per-category default.
- **Admin override wins outright** via `kingdom_milestones.icon_url`. [`IconPicker`](src/components/admin/IconPicker.tsx) shows the full asset library + custom URL paste.
- Avatars: deterministic hero portrait via djb2 hash of username when no upload, see [`src/lib/heroAvatar.ts`](src/lib/heroAvatar.ts). `member_accounts.avatar_image_url` (uploaded) > `avatar_hero_slug` (admin-picked) > hashed fallback.

### 1.6 Rich text
- Tiptap stack (`@tiptap/react@^2`, starter-kit, underline, text-align, text-style, color, image, placeholder) pre-bundled via Vite `optimizeDeps.include` (see Lesson 2).
- One reusable editor: [`RichTextEditor.tsx`](src/components/admin/RichTextEditor.tsx) — headings, B/I/U, lists, blockquote, alignment, image insert by URL, undo/redo. Prose-invert gold-themed.
- Storage: `kingdom_milestones.body_html` (and future entities) — Tiptap output. **Rendered with `dangerouslySetInnerHTML`** because authors are trusted (r4/r5 admins only via RLS). Not for member-authored content.

### 1.7 Public ↔ admin routes consolidation
- `/admin/{events,members,alliance}` are HUBS with subroutes:
  - `/admin/members/accounts` (Membros hub)
  - `/admin/events/occurrences` (Eventos hub)
  - `/admin/alliance/timeline` (Aliança hub)
- Legacy `/admin/accounts`, `/admin/occurrences`, `/admin/milestones` redirect to the consolidated paths.

---

## 2 · What's live (applied features by area)

### 2.1 Chrome / nav
- **Header** — desktop nav swaps between member TOP_NAV (5 tabs) and ADMIN_TOP_NAV (7 tabs + Sair button) by `adminMode`. Brand: "DAD BIGDADDYS" (both words gold-shimmer, no crest). Hairline turns crimson in admin mode.
- **AdminBottomNav** (mobile) — Sair is OUTSIDE the scroll strip, separated by a crimson divider, so the 7 scrolling tabs can never slide under its hitbox.
- **Notifications bell + search lupa** — placeholders, Fase 6 will wire push.

### 2.2 Hub (Home)
- 4 cards only, in order: **UserHero** → **NextEvent (crimson)** → **PendingPolls (gold/green)** → **KingdomTimeline (steel)**. Motto removed from top (was redundant with Alliance hero).
- **UserHero**: **framed-portrait variant** (`card-hero--portrait`) — navy field + double ornamental frame (outer gold border + inner hairline gold ring at 6px inset, separated by dark gap; thicker gold top beam). Avatar is a circular medallion with double ring (gold outer 2px, crimson inner 1.5px). DAD chip sits on the medallion. Name uses `font-display` text-2xl/3xl gold-shimmer + cream — eats the full upper area (max 16 chars enforced by the input). R-rank moved to the footer band as `@username · 👑 R4` alongside Editar perfil. Allies keep the crimson variant.
- **NextEvent**: card-hero crimson, gold countdown numerals intact.
- **PendingPolls**: success-green when 0 pending, gold when ≥1, always visible.
- **KingdomTimeline**: steel-blue, real game icons resolved per row, rows are `<Link>` to `/timeline/:slug`.

### 2.3 Events page
- Header "Catalogue · Events of the realm"
- Hero is the **UpcomingEventsSlider** (5 next, swipeable)
- `AllEventsCard` catalogue with filter chips (All / Active / Coming soon / Archived)
- WeekCalendar and the vertical ThisWeekMobile list were REMOVED from the page (Salles: too tall, ugly)

### 2.4 Polls (Fase D — complete)
- Status workflow: draft → open → closed → archived
- `opens_at`, `closes_at`, `closed_at` timestamps; `results_visibility` (during / after_close / admin_only)
- Markdown body via safe escaper in `lib/markdown.ts`
- Short share URL `/p/:token` (6-char base58 token)
- RLS: only voting members vote, only on open polls within `closes_at`; admins manage everything
- Admin CRUD at `/admin/polls`

### 2.5 Kingdom Timeline (milestones)
- Public detail page: **`/timeline/:slug`** — hero card with smart icon + UTC date + countdown + admin-authored body_html
- Click-through from KingdomTimelineCard rows
- Admin: full CRUD at `/admin/alliance/timeline` — Create (name + category + slug auto from name + date + notes) / Edit (name, notes, date, achieved, body, icon override) / Delete (two-step crimson confirm)
- Icon picker grid: tiers/items/buildings/events/heroes + custom URL paste
- Override stored in `kingdom_milestones.icon_url`, falls back to smart resolver

### 2.6 Settings (Account)
- **LanguagePicker** — 11 languages, syncs to localStorage + `member_accounts.language_code`. RTL handling for Arabic.
- **PwaInstallButton** — captures `beforeinstallprompt`, marks `pwa_installed_at` on install.
- **ProfileEditor** — change display name, password (min 8), avatar URL.
- Open admin mode CTA shown for `isAdmin`.

### 2.7 Members (Alliance roster)
- Public list at `/alliance/members`, sortable by power/tier/rank/nick, searchable
- Per-row card shows hero portrait + R-rank chip + nick + DAD tag + power + TG badge
- Admin manages at `/admin/members` (roster) and `/admin/members/accounts` (login accounts)

### 2.8 Alliance landing (`/alliance`)
- Cleaned up: removed Languages KPI, About card, Event history card, Data freshness footer
- 3 colored stat tiles: Rank (gold) / Members (crimson) / Power (steel) — all card-hero tinted with mono-tabular numerals
- CTA cards (Polls / Members)
- Composition tile (card-hero), Latest announcements (card-hero with "soon" chip)

### 2.9 Admin pages
- **AdminChat** — rate limit, attachments toggle, max file size, two-step clear-all (purges chat once that backend exists), localStorage-backed today, swaps to `chat_settings` table when chat ships
- **AdminNotifications** — full editor (title/body/emoji/image), audience picker, tap target, schedule (now/later/recurring), live lock-screen preview, recent delivery stats. Wires to `send-push` Edge Function when Fase 6 lands.
- **AdminAnalytics** — online now, active sessions, never-logged-in roster, 1d/7d/30d activity buckets, PWA install split bar, push delivery split (mock until push ships), language distribution

### 2.10 Database
Migrations applied (in order):
1. `0001_initial_schema.sql` — base tables
2. `0002_rls_policies.sql` — base RLS
3. `0003_seed_data.sql` — seed events/milestones
4. `0004_security_hardening.sql` — search_path locking on functions
5. `0005_grants_base_privileges.sql` — base GRANTs
6. `audit_move_security_definer_to_private_schema` — moved is_admin/is_voting_member/is_ally/account_role to `private` schema, kept `public.*` wrappers
7. `milestones_body_html` — added `kingdom_milestones.body_html`
8. `grant_private_schema_usage_to_authenticated` — **critical fix** for 403s (see Lesson 1)
9. `milestones_icon_url` — added `kingdom_milestones.icon_url`
10. (no new migrations in 2026-06-15 evening pass — only frontend changes for avatar/Stat/footer)
11. Wave 2: `alliance_settings_policy_split`, `record_login_event_anon_restrict`, `storage_buckets_avatars_notifications_milestones` (2026-06-15)
12. Wave 3: `login_events_account_nullable`, `push_notifications_schema` (2026-06-15)
13. Wave 4+5: `members_power_snapshots`, `event_participants`, `game_catalogue_schema`, `game_catalogue_seeds` (2026-06-15)

### 2.16 · Wave 7 (2026-06-16, multi-agent + manual finish) — Full i18n coverage

The 4 wire agents fiou `useTranslation()` em todos os 30+ arquivos visíveis (Hub, Events, Members, Catalogue, Timeline, Alliance, Polls, Settings, Chat, Login, Header, Footer, Nav, NotificationsPanel, UI primitives, e os 16 admin pages). en.json cresceu de ~36 chaves para **1074** chaves cobrindo todo `t('...')` call no código.

A Locales phase (sintetizar 10 traduções) saturou o agente — fechei manualmente:
1. `cp src/locales/en.json src/locales/{pt,es,fr,de,ru,tr,ar,zh,ko,ja}.json` → todos 11 locales com 1074 keys (parity 100%).
2. Script `scripts/i18n/generate-locales.js` + 2 batches PT em `scripts/i18n/pt-extras-{1,2}.json` aplicados → **PT a ~96% de cobertura real** (66 strings restantes são proper nouns/termos game que ficam literais: Admin, Chat, R4, KvK phases, Truegold, etc).
3. Outras 9 línguas têm dicionário focado em chrome/nav/common/buttons (~77 strings/cada). Strings não mapeadas caem em `fallbackLng: 'en'` via i18next (configurado em `src/i18n.ts`).

**Per-locale state (post-Wave 7):**
- en — 1074/1074 ✓ canonical
- pt — ~96% (~1008/1074) — production-ready
- es/fr/de/ru/tr/ar/zh/ko/ja — ~10% (~107/1074) — chrome + nav traduzidos, resto em English fallback

**Como expandir um locale**:
```bash
# 1. List strings ainda em EN num locale X:
node -e "const e=require('./src/locales/en.json'),t=require('./src/locales/X.json');function f(o,r=[]){for(const k in o)if(typeof o[k]==='object')f(o[k],r);else r.push(o[k]);return r}f(e).filter((v,i)=>v===f(t)[i]).forEach(v=>console.log(JSON.stringify(v)))"
# 2. Adicione traduções em scripts/i18n/<lang>-extras-N.json
# 3. Re-run scripts/i18n/generate-locales.js (estende dicionário no script ou cria merger)
```

**Build limpa**: tsc exit 0, bundle 193 KB gzip (sem mudança vs Wave 6).

### 2.17 · Wave 8 (2026-06-16, manual) — Auto-translate pipeline

Salles ergeu o tema: traduzir manualmente 1000+ strings × 11 idiomas é insustentável a cada nova feature. Solução adotada:

**Stack escolhida — MyMemory (default) + LibreTranslate (opcional self-host)**
- DeepL Free seria melhor qualidade, mas pede cartão no cadastro e o plano pago é US$ 26/mês.
- MyMemory: zero cadastro, zero cartão, **grátis pra sempre**. Anônimo dá 5K chars/dia/IP, com email no parâmetro `?de=` dá 50K chars/dia. Qualidade ~85% de DeepL — bom o suficiente pra UI.
- LibreTranslate: opção self-host via `docker run libretranslate/libretranslate` — ilimitado, sem rate-limit. Configurável via env.

**Arquivos novos**
- [`scripts/i18n/translate.mjs`](scripts/i18n/translate.mjs) — script auto-translate. Lê en.json, para cada locale alvo encontra chaves onde valor === EN (= não traduzido), envia em batch pro engine, preserva `{{vars}}` e tags `<c>`/`<allianceLink>`, escreve de volta. NÃO sobrescreve strings já traduzidas manualmente.
- [`scripts/i18n/dont-translate.json`](scripts/i18n/dont-translate.json) — lista de proper nouns / termos do jogo que ficam literais (DAD War Room, Bear Hunt, KvK, Truegold, T1-T10, TG1-TG8, hero/master names, etc).
- Atualizado `.env.example` com `MYMEMORY_EMAIL` (opcional) e `LIBRETRANSLATE_URL`/`LIBRETRANSLATE_API_KEY` (opcional).
- Atualizado `package.json` com `npm run i18n:translate` e `npm run i18n:translate:dry`.

**Fluxo daqui pra frente**
1. Dev adiciona `t('foo.bar')` no código + a string EN em `src/locales/en.json` (canonical).
2. Roda `npm run i18n:translate` — todos os 10 locales se preenchem automaticamente.
3. Commit dos 11 arquivos juntos.

**Rate limit MyMemory**: 5K chars/dia anônimo, 50K/dia com email. Strings já traduzidas (PT a ~96%) são puladas. Para fechar todos os ~7000 furos atuais nos 9 idiomas restantes, pode levar alguns dias se ficar anônimo — adicione `MYMEMORY_EMAIL=seu@email` no `.env.local` pra acelerar 10×, ou rode `docker run libretranslate/libretranslate` pra ilimitado.

**Para o chat real-time (Fase 9 futura)**: usar **browser native Translation API** (Chrome 115+, Edge 115+, Safari recente) + cache no banco em `chat_translations(message_id, target_lang) = translated_text`. Mensagem traduzida 1x na vida por idioma alvo. Custo $0.

### 2.18 · Wave 9 (2026-06-16, manual) — i18n hardening: brand-name lock + overflow defense

Salles testou o PT no simulador e flagrou regressões críticas: o header mostrava **"PAPAI GRANDÃOS"** (em vez de "DAD BIGDADDYS"), o bottom-nav tinha "CONFIGURAÇÃO" estourando, "CLASSIFICAÇÃ" cortada na meio de cards, "BATER PAPO" no lugar de "Chat", e o motto traduzido fora da nossa pipeline. Diagnóstico mostrou **duas causas distintas**:

**Causa A — browser auto-translate sobre a UI multi-idioma**
- Chrome detectava texto inglês nos brand-spans hardcoded (Alliance.tsx `<span>DAD</span><span>BIGDADDYS</span>` e Header.tsx) e traduzia POR CIMA do nosso i18n.
- Motto vinha do hook `useAllianceSettings()` (DB) em inglês — Chrome traduzia também.
- Power formatado como "6.65B" → Chrome auto-traduzia pra "6,65 bilhões".

**Causa B — overflow real de containers tight com strings longas**
- BottomNav `<span>` sem `max-w` nem `line-clamp` — PT/DE/RU explodem.
- StatTile.label sem `truncate` → "CLASSIFICAÇÃO" cortada arbitrariamente pelo flex.

**Mudanças**
- [`index.html`](index.html) — `<html translate="no">` + `<meta name="google" content="notranslate">`. Bloqueia Chrome/Edge/Safari de auto-traduzir; nosso i18n vira único trator.
- [`src/components/Header.tsx`](src/components/Header.tsx) — `translate="no"` + classe `notranslate` no brand span.
- [`src/pages/Alliance.tsx`](src/pages/Alliance.tsx) — `translate="no"` no big title E no motto. StatTile.label agora tem `truncate` + `title`; StatTile.value tem `truncate notranslate translate="no"` (power "6.65B" não sofre auto-translate).
- [`src/components/BottomNav.tsx`](src/components/BottomNav.tsx) — span do label agora `line-clamp-2 break-words hyphens-auto leading-tight max-w-full text-center` + `tracking-[0.12em]` (compressão leve). Caso a string seja longa, quebra em 2 linhas dentro do tile em vez de estourar o nav.
- [`src/components/I18nText.tsx`](src/components/I18nText.tsx) NOVO — wrapper `<I18nText k="..." maxLines={1|2|3}>` pronto pra aplicar em futuros labels. `title` automático pra texto cortado virar tooltip-discoverable. (BottomNav e StatTile não migraram pra ele ainda; ficaram com classes Tailwind diretas — equivalente em comportamento, mais leve em re-render.)
- [`scripts/i18n/dont-translate.json`](scripts/i18n/dont-translate.json) — schema v2 com 3 modos: `exact` (string inteira), `regex` (testa contra valor), `substring` (case-insensitive contém). Adicionados: regex `^Kingdom\s+\d+$` / `^Reino\s+\d+$` / `^TG\s*\d+$`, substrings `BIGDADDY`/`PAPAI`/`GRANDÃO`, exatos `Chat`/`Kingdom 1652`. Translate.mjs atualizado pra ler os 3 modos no `shouldSkip()`.
- [`scripts/i18n/revert-bad-translations.mjs`](scripts/i18n/revert-bad-translations.mjs) NOVO — one-shot que varre cada locale procurando valores contendo qualquer substring proibida ou matching regex proibido E restaura do en.json. Padrões cobrem traduções erradas conhecidas: "Bate-papo" (PT), "Charla" (ES), "Bavardage" (FR), "Plaudern" (DE), "Болтовня" (RU), "Sohbet" (TR), e variantes de "Reino N" em todos os idiomas.
- [`src/locales/pt.json`](src/locales/pt.json) — `nav.chat: "Chat"` (era "Bate-papo"), `nav.settings: "Ajustes"` (era "Configurações" — explodia no bottom-nav), `header.kingdomTag: "Kingdom 1652"` (era "Reino 1652").
- Após reverter rodado em todos os locales: **16 reverts aplicados** em PT(4), ES(3), RU(3), TR(3), JA(3) — strings tipo "Reino 1652" / "Bate-papo" / "Sohbet" voltaram pra "Kingdom 1652" / "Chat".
- [`supabase/migrations/0006_wave9_covering_indexes.sql`](supabase/migrations/0006_wave9_covering_indexes.sql) NOVO — covering indexes em `event_participants.added_by` e `member_power_snapshots.recorded_by` (P4 backlog). NÃO aplicado ainda — próxima sessão roda via Supabase MCP `apply_migration`.

**Estado final pós-Wave 9**
- Parity check: **1074 keys em todos os 11 locales** (en/pt/es/fr/de/ru/tr/ar/zh/ko/ja). 100%.
- `tsc --noEmit` ✓ clean.
- `npm run build` ✓ 344 KB gzip dist/assets/index.
- Docker LibreTranslate parado, RAM liberada.
- Browser auto-translate desativado em todo o app — qualquer brand name visível agora é AUTORITATIVA do nosso i18n+DB.

**Pendências Wave 9 que sobraram pra próxima sessão**
1. Aplicar `0006_wave9_covering_indexes.sql` via Supabase MCP `apply_migration`.
2. Migrar BottomNav/StatTile pra `<I18nText>` (refactor cosmético — comportamento idêntico hoje).
3. Playwright `tests/i18n-overflow.spec.ts` em DE/RU/KO/AR × 3 viewports (esboço documentado em HANDOFF.md §11.3).
4. Adicionar `formatPower()` versão localizada com `units.billion/million/thousand` keys (hoje sufixos B/M/K em inglês — ok pq notranslate, mas sufixo localizado é mais natural pra falantes nativos).

**Lição 13 — Browser auto-translate vs i18n próprio**
Quando o app tem i18n próprio cobrindo tudo, o browser auto-translate VIRA INIMIGO: ele sobrepõe nossa tradução com qualidade pior, traduz brand names que NÃO devem ser traduzidos, e gera bug reports falsos. Solução: `<html translate="no">` + `<meta name="google" content="notranslate">` no HEAD. Para casos onde alguma string deve ainda ser traduzida (impossível em DAD War Room, mas relevante em apps híbridos), usar opt-in com `translate="yes"` em elementos específicos.

**Lição 14 — Strings em containers tight precisam de defesa, não de aposta**
Não dá pra confiar que "Settings" → "Configurações" vai caber só porque coube em EN. Toda label em flex/grid tight DEVE ter `truncate` ou `line-clamp-N break-words` + `min-w-0` no pai. Sem isso, qualquer locale que expanda 20%+ quebra. Padrão: `<I18nText maxLines={N}>` ou Tailwind direto `truncate` + `title={text}` pra acessibilidade.
11. `perf_add_fk_indexes` (2026-06-15) — covering indexes on 6 FKs (event_occurrences.created_by, events.created_by, member_accounts.created_by, poll_votes.option_id, polls.created_by, polls.event_occurrence_id)
12. `perf_admin_users_initplan_fix` (2026-06-15) — rewrote `admin_users_self_select` to use `(SELECT auth.uid())` (initplan optimization)
13. `perf_consolidate_overlapping_policies` (2026-06-15) — replaced `*_admin_all` FOR ALL policies with per-verb admin INSERT/UPDATE/DELETE on member_accounts, members, poll_options, poll_votes, polls; admin SELECT now flows through the existing public `_select` (qual=true). Also wrapped `is_admin()` in `(SELECT ...)` everywhere
14. `perf_drop_unused_indexes` (2026-06-15) — dropped 12 unused indexes; kept `polls_closes_at_idx` for planned "polls closing soon" sort
15. `perf_consolidate_remaining_admin_self_overlaps` (2026-06-15) — merged admin + self UPDATE on member_accounts and admin + self INSERT/DELETE on poll_votes into single OR'd policies (eliminates last 3 multiple_permissive_policies WARNs)
16. `auth_telemetry_record_login_event` (2026-06-15) — SECURITY DEFINER RPC `public.record_login_event(event_type, account_id, user_agent)` that inserts into `login_events` and stamps `member_accounts.last_login_at` / `first_login_at`. EXECUTE granted to anon + authenticated so the DEFINER context bypasses RLS on `login_events` without policy changes.
17. `alliance_settings_singleton` (2026-06-15) — singleton table `public.alliance_settings` (rank, motto, tagline, brand_primary, brand_accent, captured_at, updated_by, updated_at) with uniqueness index, RLS (public SELECT, admin write via `public.is_admin()`), idempotent seed row.
18. `alliance_settings_policy_split` (2026-06-15) — Wave 2 follow-up to Lesson 11. Dropped `alliance_settings_admin_write FOR ALL` and replaced with three per-verb admin policies (`_admin_insert` / `_admin_update` / `_admin_delete`), each gated by `(SELECT public.is_admin())`. Public `_select FOR SELECT USING(true)` untouched. Cleared the 5 `multiple_permissive_policies` WARNs introduced in Wave 1.
19. `record_login_event_anon_restrict` (2026-06-15) — Wave 2 Option A on `public.record_login_event`. Kept EXECUTE grant for anon + authenticated but added an in-function guard: anon callers can only insert `event_type='failed_signin' AND p_account_id IS NULL`; authenticated retains full access. The two SECURITY DEFINER advisor WARNs persist (they flag the EXECUTE+DEFINER capability itself, not the behavior), but defense in depth is now in place.
20. `storage_buckets_avatars_notifications_milestones` (2026-06-15) — Created 3 public-read Storage buckets with RLS on `storage.objects`: `avatars` (2 MB, jpeg/png/webp/gif, writable by owner under their `auth.uid()` folder prefix); `notification-images` (5 MB, jpeg/png/webp, admin-only via `public.is_admin()`); `milestone-bodies` (5 MB, jpeg/png/webp/gif, admin-only via `public.is_admin()`). Buckets are `public=true` so public Hub/Alliance/Members pages can render images via CDN URL without signed-URL roundtrips.
21. `login_events_account_nullable` (2026-06-15) — Wave 3 prerequisite for Lesson 12. Dropped `NOT NULL` on `public.login_events.account_id` and reworked `record_login_event()` so anon `failed_signin` callers can insert `account_id = NULL` without tripping the column constraint. AdminAnalytics queries unaffected (they already counted non-null account_id when computing online/active/never-logged-in). Verified via `SET ROLE anon` smoke test: 1 row inserted, `account_id IS NULL`.
22. `push_notifications_schema` (2026-06-15) — Wave 3 push notifications full stack. Created `public.push_subscriptions` (account_id, endpoint UNIQUE, p256dh, **auth_token** [PLANNING.md §3.3 called it `auth`; renamed to dodge the reserved-feeling word — Edge Function maps `auth_token → keys.auth` for web-push], user_agent, language_code, last_seen_at, deactivated_at), `public.push_messages` (title, body, emoji, image_url, audience enum, custom_account_ids[], tap_target enum, tap_url, scheduled_for, sent_at, cancelled, created_by), `public.push_message_deliveries` (message_id, subscription_id, sent_at, delivered_at, opened_at, error). Full RLS: subs self-only + admin read-all; messages admin-only write + audience-targeted SELECT for recipients; deliveries admin-only. Indexes per PLANNING.md §3.3. GRANTs to authenticated where applicable.

### 2.11 · Wave 1 (2026-06-15 night, multi-agent)
- **Foundation (Phase A)** — Performance advisor warnings dropped from **29 → 12** during Phase A (5 migrations including a 5th extra `perf_consolidate_remaining_admin_self_overlaps` to merge the last admin+self overlaps the spec couldn't split). Admin reads/writes sanity-tested via SET ROLE. 5 dropped FK indexes re-flagged as INFO-level unindexed_foreign_keys (intentional per spec); 6 newly-created FK covering indexes also flagged unused (no traffic history yet — will clear once exercised).
- **Login telemetry (Agent B1)** — New `src/repositories/loginEvents.ts` exposes fire-and-forget `recordLoginEvent()`. `src/hooks/useAuth.ts` now records `signin` (with account.id) / `failed_signin` / `signout` (captures account.id BEFORE repoSignOut). All void-prefixed so rejection can't propagate. AdminAnalytics now shows real data.
- **Alliance editable (Agent B2)** — `/alliance` rank/motto/tagline now sourced from DB singleton `alliance_settings` via `useAllianceSettings()` hook. AdminAlliance gets a live `AllianceMetadataEditor` (card-hero anatomy) with hex inputs + live color swatch + captured_at. Removed the "still hardcoded" warning callout. Types regenerated; `Tables`/`TablesInsert`/`TablesUpdate`/`Enums` helpers preserved per Lesson 6.
- **Bundle hygiene (Agent B3)** — All 10 admin pages now React.lazy in App.tsx with single Suspense + card-hero skeleton. Deleted orphans `WeekCalendarCard.tsx` + `ThisWeekMobile.tsx`. Public index bundle: **259.09 KB gzip** (was ~300 KB pre-wave), well under the 500 KB target. Largest chunk is now lazy AdminMilestones at 143.34 KB gzip — never loaded by public visitors. `html-to-docx` confirmed absent from package.json (already removed).
- **i18n locales (Agent B4)** — 9 locale stubs translated (ES/FR/DE/RU/TR/AR/ZH/KO/JA). Brand "DAD War Room", "[DAD] BIGDADDYS", "Salles", and game-term proper nouns (event names, hero/game terms) kept untranslated per pt.json convention; "Kingdom" translated per language; UI labels/footer/event titles localized naturally. All 9 files JSON-validated.
- **Verify (Phase C)** — `npx tsc --noEmit` exit 0, `npm run build` succeeds, index bundle 259.09 KB gzip. Final advisor counts: security 3 WARN (leaked-password intentional + 2 new anon/authenticated SECURITY DEFINER warnings on `record_login_event` — these are intentional: the RPC IS meant to be callable by anon for failed_signin telemetry and by authenticated for signin/signout); performance 18 (6 unindexed_foreign_keys INFO, 7 unused_index INFO, 5 multiple_permissive_policies WARN on new `alliance_settings` table where admin_write and public_select both grant SELECT — see backlog).

### 2.12 · Wave 2 (2026-06-15, multi-agent)

- **Foundation (Agent)** — Cleared the 5 `alliance_settings` `multiple_permissive_policies` WARNs from Wave 1 by splitting `_admin_write FOR ALL` into per-verb `_admin_insert` / `_admin_update` / `_admin_delete` (Lesson 11 applied). Applied OPTION A on `record_login_event`: kept EXECUTE for anon + authenticated but added in-function guard so anon is restricted to `event_type='failed_signin' AND p_account_id IS NULL`. Created 3 Storage buckets (avatars 2 MB; notification-images 5 MB; milestone-bodies 5 MB) with public-read + RLS on writes (avatars by owner's `auth.uid()` folder prefix; notification-images & milestone-bodies admin-only). The 2 SECURITY DEFINER advisor WARNs on `record_login_event` persist (capability-level flag, not behavior — only revoking EXECUTE or switching to SECURITY INVOKER clears them, both of which break legitimate use cases). Discovered (not fixed, backlogged): `public.login_events.account_id` is NOT NULL, so the anon `failed_signin` path from `useAuth.ts` was already silently failing at the table constraint pre-Wave 2.
- **Image upload (Agent)** — New reusable `ImageUploadField` (drag-and-drop, preview, error handling) backed by new `src/repositories/storage.ts`. Wired into 3 existing URL-paste flows: ProfileEditor (avatar), IconPicker (milestone icon override), RichTextEditor (inline image insert). All 3 callers currently pass `value={null}` because each call site manages its own current-value preview; the component supports a non-null value with a Trocar/Remover UI for future callers.
- **Analytics real (Agent)** — Wired `AdminAnalytics` to real `login_events` data. New `src/repositories/analytics.ts` with 5 typed read-only helpers: `countSigninsSince()`, `countOnlineNow()` (5 min window), `countActiveSessions()` (24 h window), `countFailedSigninsLast24h()`, `countNeverLoggedIn()`. New `useLiveCounters()` hook in AdminAnalytics Promise.all-fetches on mount + refreshes every 30 s. KPI row regridded to 5 tiles (added "Failed signins (24h)" crimson tile). All live tiles render `—` until first resolve. Activity-windows section eyebrow now clarifies it's derived from `last_login_at`, not raw signins. Push delivery split still mocked — pending Wave 3 (Fase 6).
- **Verify (Phase C)** — `npx tsc --noEmit` exit 0, `npm run build` succeeds, index bundle **261.91 KB gzip** (up 2.8 KB from Wave 1 — image upload + analytics counters). Final advisor counts: security 3 WARN (leaked-password intentional + 2 record_login_event SECURITY DEFINER preserved as defense-in-depth Option A); performance 13 INFO (6 unindexed_foreign_keys + 7 unused_index — no WARNs left, down from Wave 1's 18 thanks to the 5 alliance_settings WARNs being cleared).

### 2.13 · Wave 3 (2026-06-15, multi-agent) — Push notifications full stack

- **Foundation (Agent)** — Two migrations: `login_events_account_nullable` (made `login_events.account_id` nullable + reworked `record_login_event` so anon `failed_signin` no longer trips Lesson 12) and `push_notifications_schema` (3 tables: `push_subscriptions`, `push_messages`, `push_message_deliveries` with full RLS, indexes, GRANTs per PLANNING.md §3.3). Generated VAPID keypair; public key written to `.env.example` only, private key delivered to Salles via deploy checklist (never on disk). Wrote and deployed `supabase/functions/send-push/index.ts` (Deno + `npm:web-push@3.6.7` + `npm:@supabase/supabase-js@2.45.0`) — reads due `push_messages`, expands audience (`all` / `voting` / `admins` / `allies` / `custom`) against `account_role`, sends via Web Push, records deliveries, auto-deactivates subs on 404/410, stamps `sent_at`, capped at 500 deliveries/invocation. Verified function deployed (slug `send-push`, version 1, status ACTIVE). One naming deviation flagged: PLANNING.md §3.3 used the field name `auth`; live schema uses `auth_token` (Edge Function maps `auth_token → keys.auth` correctly).
- **SW + subscription primitives (Agent)** — New `src/lib/push.ts` (VAPID base64→Uint8Array, env-driven public key reader, `isPushSupported`, `subscribePush`, `unsubscribePush`, `getCurrentSubscription`), `src/repositories/pushSubscriptions.ts` (idempotent UPSERT on `endpoint` UNIQUE + UPDATE + DELETE; locally-typed row shape because regenerated Supabase types don't include push_* yet — escape hatch scoped to this file only), `src/hooks/usePushSubscription.ts` (wires `useAuth().account.id` + `i18n.language` + `navigator.userAgent`, auto-detects existing sub on mount, exposes `{ permission, subscribed, loading, supported, subscribe, unsubscribe }`). New `public/sw-push.js` with dependency-free `push` + `notificationclick` listeners (safe JSON parse, emoji-in-title, route by `tap_target` to `/events` / `/alliance/polls` / `/alliance` / `tap_url` / `/`). `vite.config.ts` got `workbox.importScripts: ['/sw-push.js']` so the autoUpdate-mode generated SW pulls in the handlers.
- **Settings toggle (Agent)** — New `src/components/settings/PushNotificationsToggle.tsx` consumes `usePushSubscription()` and renders five branches: VAPID-missing info row, loading skeleton, `permission='denied'` crimson Warning row, gold "Active" badge + "Desativar" link when subscribed, "Ativar" button when permission default/granted but not yet subscribed. Body copy: "Receive in-app pings when an event is starting, a new poll opens, or admin sends an announcement — in your chosen language." `src/pages/Settings.tsx` lost its placeholder Row + unused `BellRinging`/`Translate` imports; LanguagePicker / PwaInstallButton / ProfileEditor untouched.
- **AdminNotifications real (Agent)** — New `src/repositories/notifications.ts` (`createPushMessage`, `listRecentPushMessages` via two-SELECT aggregate of `push_messages` + `push_message_deliveries`, `sendPushImmediately` invoking `supabase.functions.invoke('send-push', { body: { message_id } })`). New `src/hooks/useNotifications.ts` (`useRecentPushMessages`) following the existing `usePolls` pattern. `src/pages/admin/AdminNotifications.tsx`: replaced `PAST_DELIVERIES` mock with hook-driven data; Send/Schedule now calls `createPushMessage()` (and `sendPushImmediately()` for `schedule='now'`), refetches on success, surfaces errors in a crimson card-foot. Added `<ImageUploadField bucket="notification-images" pathPrefix="notif-">` as sibling of the URL-paste input. All public types explicit (PushAudience, PushTapTarget, PushMessage, PushMessageSummary, CreatePushMessageInput) — no `Record<string, unknown>` (Lesson 9). `push_messages` / `push_message_deliveries` still missing from regenerated `src/types/database/supabase.ts`, so access is funneled through a single localized `supabaseUntyped` cast in `notifications.ts` only.
- **Bell panel (Agent)** — New `src/hooks/useMyNotifications.ts` fetches the 20 most-recent delivered (`sent_at IS NOT NULL`, `cancelled = false`) push messages targeted at the signed-in user via a Postgrest `or(...)` expression that mirrors `audienceRoles()` in `send-push/index.ts` (`all` / `voting` / `admins` / `allies` / `custom`); unread count compares `sent_at`/`created_at` against the `war-room.last_seen_notification_at` localStorage key; `markAllAsSeen()` stamps `now()` to clear. New `src/components/NotificationsPanel.tsx` is an absolutely-positioned popover anchored to the bell (`card-hero`), handles outside-click + Escape, renders empty state "Sem notificações recentes.", shows emoji + bold title + 1-line truncated body + short time-ago, routes via react-router on `tap_target` (external `url` falls back to `window.location.href`), footer "Ver todas" → `/settings`. `src/components/Header.tsx` lost its TODO bell — clicking now toggles `bellOpen` and (on open) calls `markAllAsSeen()` to clear the red `bg-crimson-glow` dot. Bell + panel wrapped in a `relative` div so the popover anchors correctly.
- **Verify (Phase C)** — `npx tsc --noEmit` exit 0 (root `tsc.json`), but `npm run build` (which runs `tsc -b` against `tsconfig.app.json` + `tsconfig.node.json`) **FAILS** with 2 errors that need Salles' attention before bundle sizes can be captured: (1) `src/components/settings/PushNotificationsToggle.tsx:20` destructures `.busy` from `usePushSubscription()` but the hook exposes `.loading`, not `.busy` (rename one of the two); (2) `src/lib/push.ts:100` — `Uint8Array<ArrayBufferLike>` is not assignable to `BufferSource` because the lib types now distinguish `ArrayBuffer` from `SharedArrayBuffer` (cast via `as BufferSource` or rebuild the typed array as `new Uint8Array(rawData).slice().buffer`). Both are outside this verify agent's strict file scope (WAR_ROOM_LOG.md only). Bundle size unchanged from Wave 2 (no fresh `dist/` produced). Advisor counts (recounted via MCP after the two Wave 3 migrations): security **3 WARN** (same composition as Wave 2: leaked-password intentional + 2 `record_login_event` SECURITY DEFINER preserved as defense-in-depth Option A); performance **19 INFO** (no WARNs): 8 `unindexed_foreign_keys` (was 6 — added `push_message_deliveries.subscription_id` and `push_messages.created_by`) + 11 `unused_index` (was 7 — added `push_deliveries_message_idx`, `push_subscriptions_account_idx`, `push_messages_scheduled_idx`, and a few re-flagged from Wave 1 that haven't seen traffic yet). All new INFO flags are expected for freshly-shipped tables — they clear once production traffic exercises the indexes.

---

## 3 · Lessons learned (DO NOT repeat)

### Lesson 1 · SECURITY DEFINER wrappers need schema USAGE, not just function EXECUTE
**Symptom:** every admin write returned 403 across `kingdom_milestones`, `polls`, `poll_options`.
**Root cause:** RLS policies call `public.is_admin()` (SECURITY INVOKER) which calls `private.is_admin()` (SECURITY DEFINER). Even though `EXECUTE` was granted on the inner function, the caller (`authenticated`) had no `USAGE` on the `private` schema → couldn't resolve the function name → `is_admin()` short-circuited to false → 403.
**Fix:** `GRANT USAGE ON SCHEMA private TO authenticated, anon;` + `ALTER DEFAULT PRIVILEGES IN SCHEMA private GRANT EXECUTE ON FUNCTIONS TO authenticated, anon;`
**Sanity test for the future:**
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"<admin uuid>","role":"authenticated"}';
SELECT public.is_admin(); -- MUST return true for an admin
```

### Lesson 2 · Vite optimizeDeps must include freshly-installed packages
**Symptom:** `[plugin:vite:import-analysis] Failed to resolve import "@tiptap/react"` even though `node_modules/@tiptap/react/` exists and `tsc --noEmit` passes.
**Root cause:** Vite caches its dep pre-bundle in `node_modules/.vite/`. When you install a new package and the dev server already has a cache from before, the dynamic resolver can fail. `optimizeDeps.include` forces the pre-bundle to know about them.
**Fix:** Add every Tiptap module (and future big libs) to `vite.config.ts` → `optimizeDeps.include`. After install, also `rm -rf node_modules/.vite` and restart dev server.

### Lesson 3 · Card backgrounds: cream linear-gradient washes everything out
**Symptom:** every card except NextEventCard looked milky/transparent.
**Root cause:** `card-elev` stacked a `linear-gradient(rgba(255,219,138,0.09→0.03))` over the dark navy. NextEventCard hid that layer by overriding `background-image` via inline `style`. Other cards inherited it → milky.
**Fix:** New `card-hero` uses solid navy `#0d1124` + ONE small corner gold radial; no cream layer.

### Lesson 4 · Don't paint a hero card the same color as the one above it
**Symptom:** UserHero gold → NextEvent gold → all gold → monochrome block.
**Fix:** Rotate variants per card. Crimson for "call to arms", success for "rest", steel for "institutional info". Reserve gold for top hierarchy and for accents (numerals, eyebrows, CTAs) — NOT titles.

### Lesson 5 · Sticky `position: sticky` doesn't block overlap if z-index/background isn't enforced
**Symptom:** "Sair" button in the mobile admin bottom nav got covered by scrolling tabs sliding underneath it.
**Fix:** Pull Sair OUTSIDE the scrollable `<ul>` entirely. Place it in a separate sibling div with `shrink-0` and a `border-r` divider. Position-based separation, not z-index hacks.

### Lesson 6 · Hidden columns + outdated generated types = silent type errors
**Symptom:** Polls Fase D — frontend wrote to `results_visible_during_voting` after migration dropped it; types looked OK because they were stale.
**Fix:** After every DDL migration, run the Supabase MCP `generate_typescript_types` and overwrite `src/types/database/supabase.ts`. Keep the helper types (`Tables`, `TablesInsert`, `TablesUpdate`, `Enums`) at the bottom because the generator doesn't always re-emit them.

### Lesson 7 · Hidden by "soon" badges = looks broken
**Symptom:** Salles couldn't tell if buttons were intentional placeholders or just bugs.
**Fix:** For wires-not-ready features, use a small `soon` chip embedded in the eyebrow (not a separate corner badge). Make the parent button still clickable to a useful place when possible.

### Lesson 8 · Frame > Field for "hero" cards
**Symptom:** Inverting a card to a solid gold background ("banner" variant) turned it into a plastic block — uniform gradient, harsh navy strip at the footer, avatar imprisoned in a navy box on gold, brown labels disappearing into the field.
**Fix:** Keep the dark navy field; identity comes from an **ornamental double frame** (outer border + inner hairline ring + thicker top beam) plus a **signature avatar treatment** (circular medallion with double-ring gold/crimson). The card stands out because of its FRAME, not its fill. Salles 2026-06-15: "ficou lindo putssssss".
**Rule of thumb:** When a card needs to dominate visually, prefer frame ornamentation + avatar treatment over inverting the entire fill color. Field inversion only works for tiny cards or single-purpose stamps where the content can be minimal.

### Lesson 9 · Strict Supabase update payload types reject `Record<string, unknown>`
**Symptom:** `npm run build` fails with `Type 'Record<string, unknown>' is not assignable to ...{ [x: string]: never }`.
**Fix:** Type the patch object explicitly with the column names you write:
```ts
const patch: { display_name?: string; language_code?: string } = {}
```
Never use `Record<string, unknown>` for Supabase update bodies.

### Lesson 10 · Admin + self on the same verb cannot be eliminated by per-verb splitting
**Symptom:** Wave 1 Phase A spec called for splitting `FOR ALL` admin policies into per-verb policies to eliminate `multiple_permissive_policies` advisor WARNs. After applying 4 migrations, 3 WARNs persisted on `member_accounts` (admin + self UPDATE) and `poll_votes` (admin + self INSERT/DELETE).
**Root cause:** When both an admin policy and a self-policy legitimately need to grant the **same verb** to the **same role**, splitting them per-verb doesn't help — they still overlap on that verb. The advisor flags any two permissive policies on the same role+action regardless of intent.
**Fix:** Merge them into a single policy with OR'd predicates: `USING ((SELECT is_admin()) OR <self-condition>)`. Preserves exact prior semantics (admin OR self can write). Required an extra 5th migration `perf_consolidate_remaining_admin_self_overlaps` beyond the 4 in the original spec.
**Rule of thumb:** Per-verb splitting only works when admin and self differ on the verb (e.g., admin writes, self only reads). When both need the same verb, merge with OR.

### Lesson 11 · A `FOR ALL` write policy implicitly grants SELECT — overlapping with the public read policy
**Symptom:** Created `alliance_settings_admin_write FOR ALL ... USING (is_admin())` plus `alliance_settings_select FOR SELECT TO public USING (true)` on a new table. Advisor immediately flagged 5 `multiple_permissive_policies` WARNs (one per role) because `FOR ALL` includes SELECT.
**Root cause:** PostgreSQL RLS `FOR ALL` is shorthand for `FOR SELECT, INSERT, UPDATE, DELETE` — it grants admin SELECT in addition to writes. Combined with a separate public SELECT policy, every role+SELECT pair has two matching policies.
**Fix (preferred):** Use `FOR INSERT/UPDATE/DELETE` per-verb for admin writes instead of `FOR ALL`. Admin SELECT then flows through the existing public `_select` (qual=true). See the `perf_consolidate_overlapping_policies` migration for the working pattern on member_accounts/polls/etc.
**Apply to alliance_settings:** the 5 WARNs introduced by this wave should be cleared in a follow-up by replacing `alliance_settings_admin_write FOR ALL` with `_admin_insert`/`_admin_update`/`_admin_delete`. **Done in Wave 2** via `alliance_settings_policy_split` (2026-06-15).

### Lesson 12 · A SECURITY DEFINER RPC bypasses RLS but not NOT NULL constraints
**Symptom:** Wave 2 sanity-tested `record_login_event` after layering the anon guard. The anon `failed_signin` path (called from `useAuth.ts` when login fails before an account can be resolved) was passing `p_account_id = NULL` — but `public.login_events.account_id` is declared NOT NULL, so the INSERT was already silently failing at the column constraint pre-Wave 2. The frontend `recordLoginEvent()` wrapper is fire-and-forget with `console.warn`-on-error, so the breakage never surfaced.
**Root cause:** SECURITY DEFINER lets you bypass **RLS policies** (the function runs with the definer's privileges), but it does NOT bypass **table constraints** like NOT NULL, CHECK, or FK validity. A definer function still has to satisfy the same column-level rules any other writer would.
**Fix (not applied in Wave 2 — backlogged):** Either (a) `ALTER TABLE public.login_events ALTER COLUMN account_id DROP NOT NULL` (and tweak AdminAnalytics queries to handle nulls), OR (b) resolve `account_id` frontend-side before calling `failed_signin` (e.g., look up the account by username before the auth attempt).
**Rule of thumb:** When designing a SECURITY DEFINER RPC that mixes anon + authenticated callers, walk through each caller's payload column-by-column and confirm every NOT NULL / CHECK / FK is satisfiable. Don't conflate "bypasses RLS" with "bypasses all DB safety nets".

### Lesson 14 · rolldown-vite `manualChunks` TS typings only accept the function form
**Symptom:** Wave 6 tried `build.rollupOptions.output.manualChunks = { tiptap: ['@tiptap/...'], supabase: ['@supabase/...'] }` (the standard Vite/Rollup pattern). `npm run build` failed with `Type 'Record<string, string[]>' is not assignable to type 'ManualChunksFunction'`.
**Root cause:** This repo uses `rolldown-vite` (alpha/beta variant of vite on Rolldown). Its TypeScript typings for `output.manualChunks` are narrower than upstream Vite/Rollup — they only accept the function form `(id: string) => string | null | undefined`, not the object form.
**Fix:** Convert to the function form:
```ts
output: {
  manualChunks(id: string) {
    if (id.includes('@tiptap')) return 'tiptap'
    if (id.includes('@supabase')) return 'supabase'
    if (id.includes('framer-motion')) return 'framer'
    if (id.includes('date-fns')) return 'date-fns'
    return undefined
  }
}
```
**Rule of thumb:** When upgrading bundler config in this repo, check `rolldown-vite` types first — they trail upstream by a release or two and may reject patterns that work in standard Vite.

### Lesson 13 · `tsc --noEmit` (root) ≠ `tsc -b` (build mode) — verify agents must match `npm run build`
**Symptom:** Wave 3 frontier agents all reported "tsc passes" because `npx tsc --noEmit` exits 0. The Phase C verify pass ran `npm run build`, which executes `tsc -b && vite build`, and discovered 2 type errors that block production builds (the `vite build` step never ran).
**Root cause:** Root `tsconfig.json` is a minimal references shim. The real type-checking happens via the project references in `tsconfig.app.json` (app sources, browser DOM lib) and `tsconfig.node.json` (vite.config + scripts). `npx tsc --noEmit` only checks the root config, which has no `include`/`files`, so it trivially exits 0 even when the referenced projects have errors. `tsc -b` walks the references and reports errors per project.
**Fix:** Verify agents (and any agent self-checking before reporting "tsc passes") must run `npx tsc -b --noEmit` OR the full `npm run build`. Never trust a bare `npx tsc --noEmit` on this repo.
**Rule of thumb:** Whenever a repo has multiple `tsconfig.*.json` files (project references), the build-mode check is the only authoritative one.

---

## 4 · Backlog (pending, by priority)

### P0 — visible UX defects
- [x] **Avatar consistency between UserHero & Members roster** — DONE 2026-06-15. Shared `resolveAvatarUrl()` in `src/lib/heroAvatar.ts`. `Members.tsx` joins accounts via `member_id` and passes `avatarUrl` to `MemberCard`.
- [x] **Hero picker in ProfileEditor** — DONE 2026-06-15. Two-tab AvatarEditor (Escolher herói / Imagem custom). 33 portraits in a grid, writes to `member_accounts.avatar_hero_slug`. Reset button voltam pro automático.
- [x] **Power / Truegold real icons in UserHero** — DONE 2026-06-15. Power uses `/images/buildings/truegold-barracks.png`. TG uses the actual tier image (`/images/tiers/tg{N}.png`) based on `member.tg_level`.
- [x] **Footer gap on Hub** — DONE 2026-06-15. Footer `mt-2 sm:mt-4` (was mt-8/12), Hub `pb-4 sm:pb-6` (was pb-12/16).

### P1 — Fase 6 (push notifications, chat live)
- [x] **Wire `send-push` Edge Function; switch AdminNotifications local-state to server-backed** — DONE 2026-06-15 (Wave 3). Edge Function deployed (slug `send-push`, version 1, ACTIVE). AdminNotifications now uses `createPushMessage()` + `sendPushImmediately()` + `useRecentPushMessages()`. **Manual deploy steps remain for Salles**: set Supabase secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`, copy `VITE_VAPID_PUBLIC_KEY` to `.env.local`, and schedule the function via pg_cron or external cron — see verify agent's `deploy_instructions`.
- [x] **Service worker push handler + permission flow in Settings** — DONE 2026-06-15 (Wave 3). `public/sw-push.js` imported into the generated SW via `workbox.importScripts`. `PushNotificationsToggle` in Settings handles VAPID-missing / loading / denied / subscribed / default states.
- [ ] Chat backend (Supabase Realtime channel + `chat_messages` table); flip AdminChat localStorage to server config
- [x] **Bell icon in Header opens notification panel** — DONE 2026-06-15 (Wave 3). New `NotificationsPanel` popover (card-hero, outside-click + Escape, time-ago, tap_target routing). Unread dot driven by `war-room.last_seen_notification_at` localStorage key.

### P2 — Quality of life
- [ ] Hero picker also for the UserHero card itself (one-click change without going through Settings)
- [ ] Drag-to-reorder milestones in AdminMilestones (uses `display_order`)
- [ ] Date+TG range filters in `/timeline` index
- [x] **Image upload (not just URL paste)** — DONE 2026-06-15 (Wave 2). 3 public Supabase Storage buckets (`avatars`, `notification-images`, `milestone-bodies`) with RLS. New `<ImageUploadField>` wired into ProfileEditor, IconPicker, RichTextEditor.
- [ ] Members search: highlight matched substring
- [x] **Code-split `dist/assets/index-*.js`** — DONE 2026-06-15. All 10 admin pages React.lazy in App.tsx. Public index now 932 KB / **259 KB gzip** (was ~300 KB). Largest chunk is lazy AdminMilestones (143 KB gzip), never loaded by public visitors.
- [x] **Clear `alliance_settings` multiple_permissive_policies WARNs** — DONE 2026-06-15 (Wave 2) via `alliance_settings_policy_split` migration. Per-verb admin INSERT/UPDATE/DELETE; public SELECT untouched.
- [x] **Narrow `record_login_event` anon surface (Wave 2 follow-up B)** — DONE 2026-06-15 via `record_login_event_anon_restrict` migration. Option A: in-function guard restricts anon to `event_type='failed_signin' AND p_account_id IS NULL`. The 2 SECURITY DEFINER advisor WARNs remain (capability-level flag, not behavior — intentional defense-in-depth choice).
- [x] **AdminAnalytics on real data (online now / active sessions / failed signins / never logged in)** — DONE 2026-06-15 (Wave 2). New `src/repositories/analytics.ts` + `useLiveCounters()` in AdminAnalytics. **Push delivery split still mocked** — pending Fase 6 / Wave 3.
- [x] **Pre-existing data-model bug surfaced by Wave 2 sanity test: `public.login_events.account_id` is NOT NULL** — DONE 2026-06-15 (Wave 3) via `login_events_account_nullable` migration. Dropped `NOT NULL`; `record_login_event` reworked to accept anon `failed_signin` with `p_account_id = NULL`. Verified via `SET ROLE anon` smoke test. AdminAnalytics queries already counted non-null account_id when computing online/active/never-logged-in, so no frontend tweaks needed.

### P3 — Future
- [ ] Multi-language admin auto-translation for notifications and milestones
- [ ] Discord webhook bridge for poll outcomes
- [ ] In-game alliance sync (if Kingshot ever exposes API)

### P4 — Wave 6 close-outs (2026-06-16)
- [x] **AdminEventParticipants real CRUD** — DONE 2026-06-16 (Wave 6). Replaced the Wave 4/5 stub with the real squad-management page (~430 lines): inline add/edit/remove, member dropdown auto-excludes assigned members, role select (leader/joiner/standby), notes. New repo write functions in `eventParticipants.ts`; new `useEventParticipants` hook. "Squads" link added to each occurrence row in AdminOccurrences.
- [x] **a11y baseline** — DONE 2026-06-16 (Wave 6). Global `:focus-visible` gold outline ring + stronger `prefers-reduced-motion` rule in `index.css`. Skip-to-content link in `App.tsx` (`id="main-content"` on `<main>`). `aria-label="Sair do modo admin"` on admin exit button. AdminBottomNav + BottomNav were already labeled.
- [x] **Real README + DEPLOY.md** — DONE 2026-06-16 (Wave 6). Boilerplate Vite README replaced; `DEPLOY.md` covers Supabase secrets, send-push cron, pg_cron, Vercel, smoke test, VAPID rotation. `.env.example` reorganized with inline comments.
- [x] **Vercel deploy preconfigured** — READY 2026-06-16 (Wave 6). `vercel.json` (framework + SPA rewrites + security/cache headers), `.vercelignore`, `public/_redirects`, `public/robots.txt`. Manual step pending: Salles connects GitHub → Vercel → sets 3 env vars → first deploy. See go_live_checklist in Wave 6 verify output.
- [x] **Bundle chunk split** — DONE 2026-06-16 (Wave 6). `manualChunks` in `vite.config.ts` extracted tiptap (134 KB gzip), supabase (52 KB), framer (42 KB), date-fns (6 KB). AdminMilestones: 144 → 11 KB gzip. Main index: 276 → **193 KB gzip**.
- [ ] **Chat backend (Realtime + chat_messages table)** — still pending (P1 above). Wave 6 polish added a CTA in `Chat.tsx` pointing users to push notifications as the interim broadcast channel.
- [ ] **`auth_leaked_password_protection`** — still WARN (intentional; Salles asked it kept off).
- [ ] **Followup: extract `getOccurrenceById` to `repositories/occurrences.ts`** — Wave 6 AdminEventParticipants does an inline supabase query for the occurrence header; cleaner if reused elsewhere.
- [ ] **Followup: add covering indexes for `event_participants_added_by_fkey` + `member_power_snapshots_recorded_by_fkey`** — surfaced by Wave 6 advisor recount (10 unindexed FK INFOs total). Cheap migration when traffic arrives.

---

## 5 · Open questions to confirm with Salles

- (none currently — list captured above)

---

## 6 · Conventions cheat-sheet

- **Files > 300 lines = split.** Hero cards in their own files.
- **Color tokens are CSS vars first**: `var(--gold)`, `var(--ink-cream)`, etc. Tailwind classes are sugar.
- **All times are UTC** in storage and in the UI label "UTC". Convert only at the display layer.
- **Slugs**: NFD-normalized, lowercase, hyphen-separated, max 80 chars (`slugify()` in AdminMilestones).
- **No `any`. No `console.log` in committed code.**
- **Real assets > Phosphor icons** when one exists in `/public/images/`.
- **Hero titles in cream, not gold.** Gold for numerals, eyebrows, CTAs.

---

## 7 · How to use this file

- Before adding a feature: scan §1 (decisions) and §3 (lessons) so you don't refight the same battles.
- After landing a feature: append it to §2 and update §4 (backlog).
- After hitting a bug that took >30 min to diagnose: add it to §3 as a new lesson.
- When migrations land: append to §2.10 in order.

---

## 8 · Reconciled phased plan (2026-06-15 post-audit)

**Source of truth for backend SQL specs**: [PLANNING.md](PLANNING.md) §3.1 (game catalogue), §3.2 (members roster + power snapshots + event_participants), §3.3 (push notifications). DO NOT redesign — apply the SQL that's already there.

**Source of truth for feature semantics**: PLANNING.md §1ter (login-first arch), §1quater (polls), §1quinquies (event participation), §1sexies (timeline detail pages), §1septies (this-week), §1octies (chat), §1octies-bis (navigation).

### 8.1 Execution order (reconciled from PLANNING.md §2 + this session's audit)

| # | Wave | Source | Risk | Notes |
|---|---|---|---|---|
| 1 | **DB hardening** (advisor warnings) | this audit | low | FK indexes, drop unused indexes, fix `auth_rls_initplan`, consolidate overlapping policies. NEVER touches `auth_leaked_password_protection` (intentionally off). |
| 2 | **Members evolution** (snapshot trigger + chart in profile + event_participants) | PLANNING §3.2 | medium | Trigger SQL already drafted in PLANNING. Adds power-over-time line chart on member detail page. |
| 3 | **Game catalogue admin** (heroes/pets/masters/troop_tiers CRUD + seeds from existing PNGs) | PLANNING §3.1 | medium-high | Replaces hardcoded image listings with DB-backed catalogue. |
| 4 | **Storage uploads** (avatars, milestone bodies, notification images via Supabase Storage) | this audit | medium | Shared `<ImageUploadField>` reused 4 places. landed 2026-06-15 ✓ |
| 5 | **Push notifications full** (push_subscriptions / push_messages / push_message_deliveries + Edge Function `send-push` + VAPID + cron + i18n keys + SW handler) | PLANNING §3.3 | high | landed 2026-06-15 ✓ (Wave 3 multi-agent). Manual deploy steps remain for Salles: set VAPID secrets in Supabase, copy `VITE_VAPID_PUBLIC_KEY` to `.env.local`, schedule send-push via pg_cron. Two `npm run build` type errors must be fixed before next deploy (Lesson 13). |
| 6 | **Login telemetry** (insert login_events + update last_login_at — destrava AdminAnalytics real) | this audit | low | Done in Wave 1 below. |
| 7 | **AdminAlliance editable** (`alliance_settings` singleton table; `/alliance` reads from DB; substitui hardcoded `data/roster.ts` meta) | this audit + PLANNING §1octies-bis | low | Done in Wave 1 below. |
| 8 | **Outras 7 event pages** (KvK, Viking Vengeance, Tri-Alliance, Castle Battle, Cesar's Fury, Swordland Showdown, seasonal) | PLANNING §2 Fase 9 | medium | Bear 1 already done — use the same template. |
| 9 | **Chat live** | PLANNING §1octies | high | Depends on storage (4) + push (5). |
| 10 | **i18n full content** (9 stub locales preenchidos) | PLANNING §2 Fase 4 | medium | Done in Wave 1 below (ES/FR/DE/RU/TR/AR/ZH/KO/JA). |
| 11 | **Polish + a11y + README real + Vercel deploy** (`dad-1652.vercel.app`) | PLANNING §2 Fase 10 | medium | landed 2026-06-16 ✓ (Wave 6 multi-agent). ARIA labels, focus rings, prefers-reduced-motion, skip-to-content link, real README replacing Vite template + DEPLOY.md, Vercel `vercel.json`/`.vercelignore`/`_redirects`/`robots.txt` preconfigured. Manual deploy steps remain (see go_live_checklist). |
| 12 | **Future** (Discord webhook, auto-translation, in-game API sync) | extra | — | Backlog. |

### 2.14 · Wave 4+5 (2026-06-15 night, multi-agent) — Members evolution + Game catalogue

Source of truth: PLANNING.md §3.1 (catalogue) + §3.2 (members).

**Foundation**: 4 migrations
- `members_power_snapshots` — table + SECURITY DEFINER trigger `tg_member_power_snapshot()` auto-records power_m/tg_level changes
- `event_participants` — table + RLS (public select, admin write)
- `game_catalogue_schema` — 5 tables (heroes, pets, masters, troop_tiers, troop_tier_branch_icons) + troop_branch enum + RLS + GRANTs
- `game_catalogue_seeds` — 33 heroes (from /public/images/heroes/*.png), 18 troop tiers (T1-T10 + TG1-TG8), 4 masters (Valora/Pan/Roman/Cassia). Pets empty pending assets.

Types regen + domain interfaces (Hero, Pet, Master, TroopTier, TroopBranch, MemberPowerSnapshot, EventParticipant) + mappers added. 12 routes wired in App.tsx (6 public eager + 6 admin lazy).

**Frontier A — MemberDetail (Wave 4)**:
- Pure-SVG `<PowerChart>` (no chart lib): gold-shimmer line + dot tooltips + 10% Y-axis headroom + 6 X-axis ticks
- `/alliance/members/:nick` page with double-ring medallion hero, rank/DAD/Out badges, Power+TG stats, PowerChart, participation history grouped by event
- Members.tsx wraps each card in `<Link>` via new optional `to` prop on MemberCard

**Frontier B — AdminCatalogue (Wave 5)**:
- `/admin/alliance/catalogue` hub + 4 CRUD pages (AdminHeroes/Pets/Masters/TroopTiers)
- 4 repos + 4 hooks
- Pattern: AdminMilestones (inline create/edit forms, two-step crimson delete confirm, ImageUploadField from Wave 2 for portraits)
- AdminAlliance gained a "Catalogue" CTA card

**Frontier C — Public Catalogue (Wave 5)**:
- `/heroes` (filter by generation), `/heroes/:slug`, `/pets`, `/masters`, `/troop-tiers` (split T/TG sections)
- Alliance.tsx gained a "Game catalogue" grid CTA section

**Verify (post-workflow manual fix-up)**:
Verify agent hit session limit; Salles ran final tsc/build. 5 build errors caught and fixed in 6 min:
- `Bow` icon doesn't exist in Phosphor → swapped for `Crosshair as BowIcon` in Heroes.tsx + HeroDetail.tsx
- `Castle` icon doesn't exist → swapped for `CastleTurret as Castle` in TroopTiers.tsx
- `AdminEventParticipants` route declared without a page file → added stub page (route resolves; full UI deferred)
- `PushNotificationsToggle` destructured `busy` which the hook exports as `loading` → renamed
- `lib/push.ts` Uint8Array → BufferSource typing under TS5+ → cast to `.buffer as ArrayBuffer`

Final: tsc clean, build clean, **bundle 983.8 KB / 265.9 KB gzip** (still under 500 KB target despite +13 new pages).

### 2.15 · Wave 6 (2026-06-16, multi-agent) — Polish + go-live readiness

Final wave before Salles flips the switch on Vercel. Five parallel frontiers under one verify.

- **Foundation (Agent)** — Three jobs in one frontier:
  1. **AdminEventParticipants real CRUD** — Replaced the Wave 4/5 stub at `src/pages/admin/AdminEventParticipants.tsx` (~430 lines) with a real page: header card showing event name + occurrence date/time/duration + phase label, "Add participant" card-hero form (member dropdown auto-filters out already-assigned members, role select leader/joiner/standby, notes textarea), participants list with nick + rank chip + power + TG level + role badge + notes, inline edit, two-step crimson delete confirm, loading skeleton, error callout, empty state, back link to `/admin/events/occurrences`. Header fetched via inline supabase join (no new repo function — followup wave could extract `getOccurrenceById`). Extended `src/repositories/eventParticipants.ts` with admin write functions (`listForOccurrence`, `addParticipant`, `updateParticipant`, `removeParticipant`) — all explicitly typed via `AllianceRank` / `MemberStatusValue` / `ParticipationRole` (Lesson 9 — no `Record<string, unknown>`). New `src/hooks/useEventParticipants.ts` follows the `useMembers` pattern. `AdminOccurrences.tsx` got a "Squads" link button per row pointing to the new page.
  2. **Bundle chunk optimization** — Added `manualChunks` (function form — rolldown-vite's TS typings only accept `ManualChunksFunction`) to `vite.config.ts`. Extracted four cacheable shared chunks: `tiptap` (433.78 KB / 134.52 KB gzip), `supabase` (201.28 KB / 51.55 KB gzip), `framer` (128.99 KB / 42.03 KB gzip), `date-fns` (20.68 KB / 6.05 KB gzip). `AdminMilestones` dropped from 477 KB / 144 KB gzip → 48 KB / 11 KB gzip. Main `index` chunk dropped from 1007 KB / 276 KB gzip → 706 KB / **193 KB gzip**. Admin users now pay for Tiptap once and it's cached across all admin navigations.
  3. **Advisor audit** — Recounted: security 5 WARN (4 SECURITY DEFINER on `record_login_event` + `tg_member_power_snapshot`, each counted twice for anon + authenticated — all intentional per Lesson 12 / §1.1 + leaked-password protection still-off intentionally); performance 22 INFO (10 unindexed FKs + 12 unused indexes — none are bugs, just freshly-shipped indexes that haven't seen production traffic yet).
- **A11y (Agent)** — Global `:focus-visible` gold outline ring + stronger `prefers-reduced-motion` block (0.001ms durations + `scroll-behavior: auto`) added to `src/index.css`. "Skip to content" link wired as the first focusable element in `App.tsx` with `id="main-content"` on the `<main>`. `aria-label="Sair do modo admin"` added to the admin exit button in `Header.tsx` (search + notifications already labeled). `AdminBottomNav.tsx` + `BottomNav.tsx` already had aria-labels on every NavLink + Sair button — no edits needed.
- **README + DEPLOY (Agent)** — Replaced the boilerplate Vite README with a real project README for DAD War Room. Created step-by-step `DEPLOY.md` covering Supabase secrets / `send-push` cron / pg_cron / Vercel / smoke test / VAPID rotation. Reorganized `.env.example` so every variable has an inline comment explaining what it is + where to source it. All three files cross-reference each other and link out to `PLANNING.md` §3 and `WAR_ROOM_LOG.md` §1–§3, §2.10, §6 instead of duplicating detail.
- **Vercel (Agent)** — One-click deploy prepared. Created `vercel.json` (Vite framework + SPA rewrites via negative-lookahead regex that correctly passes `/timeline/*` and `/alliance/members/*` through to `/index.html` while excluding `/api`, `/assets`, `/images`, `/icons`, `/favicon`, `/robots`, `/sw-push`, `/sw`, `/workbox`, `/manifest`); security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy locking camera/mic/geolocation); cache headers (1-year immutable on `/assets/*` + `/icons/*`; no-cache on `/sw.js` + `/sw-push.js` + `/index.html`). Also `.vercelignore` (excludes node_modules, env files, supabase/, markdown files except README.md, .git, .vite, coverage), `public/_redirects` (SPA fallback), `public/robots.txt` (disallow `/admin`, `/login`, `/p/`, forward-looking sitemap reference).
- **Polish (Agent)** — Removed the Header search button (deferred via a one-line comment, not a phase-bound TODO). Replaced the Alliance "Latest announcements" stub with a real audience-filtered list of the top 5 push messages via `useMyNotifications` (emoji + relative timestamp + body excerpt + deep-link tap target + loading skeleton + empty-state copy). Polished `Chat.tsx`: dropped "Coming soon" / "Fase Y" leftovers, added a primary CTA linking to `/settings` to enable the push subscription as the interim broadcast channel. `PendingPollsCard.tsx` + `NextEventCard.tsx` reviewed for card-hero consistency — both already conformed to Wave 1 audit, no edits.
- **Verify (Phase C)** — `npx tsc --noEmit` clean. `npm run build` clean (only the residual `> 500 KB` warning on `index-*.js` at 706 KB, which is acceptable post-split — pre-split it was 1007 KB). Advisor counts unchanged from Foundation report (security 5, performance 22). Bundle index gzip = **193.30 KB** (was 276 KB pre-Wave-6, was 266 KB at end of Wave 4+5). Production-ready code-wise. Remaining work is manual deploy (see go_live_checklist in this verify's structured output) — no code blockers.

### 8.2 Multi-agent orchestration — Wave 1 (2026-06-15 night) · landed 2026-06-15 ✓

Per Salles' instruction "ataque com vários agentes as frentes/fases que forem possíveis fazem concomitantemente" — this wave runs as a Workflow with 3 phases:

**Phase A · Foundation** (single agent, sequential — DB-only, no /src/ writes)
- Apply `perf_add_fk_indexes` (6 FK indexes)
- Apply `perf_admin_users_initplan_fix` (rewrite `auth.uid()` → `(SELECT auth.uid())`)
- Apply `perf_consolidate_overlapping_policies` (member_accounts, members, polls, poll_options, poll_votes)
- Apply `perf_drop_unused_indexes` (case-by-case decision; some kept for planned queries)
- Re-run advisor, confirm warnings dropped

**Phase B · Wave 1 frontiers** (4 parallel agents, file-scope partitioned to avoid races)
- **Agent B1 — Login telemetry**: `src/hooks/useAuth.ts`, `src/repositories/auth.ts`, NEW `src/repositories/loginEvents.ts`. Migration: SECURITY DEFINER RPC `record_login_event()`.
- **Agent B2 — Alliance editable**: `src/repositories/allianceSettings.ts` (NEW), `src/hooks/useAllianceSettings.ts` (NEW), `src/pages/Alliance.tsx`, `src/pages/admin/AdminAlliance.tsx`, `src/types/domain.ts`, `src/repositories/mappers.ts`, regen `src/types/database/supabase.ts`. Migration: `alliance_settings_singleton`.
- **Agent B3 — Code-split + cleanup**: `src/App.tsx` (React.lazy on admin pages), `vite.config.ts` if needed for manualChunks, DELETE `WeekCalendarCard.tsx` + `ThisWeekMobile.tsx` (orphans), audit + maybe `npm uninstall html-to-docx` (~1.9 MB if unused).
- **Agent B4 — i18n locales**: fills `src/locales/{es,fr,de,ru,tr,ar,zh,ko,ja}.json` with real translations. Brand names + game terms NEVER translated.

**Phase C · Verify** (single agent)
- `npx tsc --noEmit` + `npm run build`
- Final advisor counts
- Append landed changes to WAR_ROOM_LOG.md §2 and §4

### 8.3 Conflict-avoidance rules for parallel agents

- Each agent's prompt declares **STRICT FILE SCOPE** — explicit list of paths they're allowed to read/write/delete. Agents are instructed NOT to touch anything outside.
- Schema-affecting DB changes (new tables/columns) trigger a **types regen** within the same agent that did the migration. Other parallel agents that don't depend on the new types proceed normally.
- The verify agent reads the diff and reconciles.
- Migrations are named with the agent's prefix so the migration log is traceable per frontier.

---

## 2.19-2.24 · Waves 10-15 (2026-06-16/17) — pointer to SESSION_LOG_2026-06-17.md

The 6 waves shipped in the 2026-06-16/17 session are documented in full at
`SESSION_LOG_2026-06-17.md`. Capsule below for quick reference:

| Wave | Theme | Headline |
|---|---|---|
| 2.19 = Wave 10 | Audit remediation | git init, 27 migrations backfilled, ROSTER→useMembers, DOMPurify, FK indexes, Vitest, GitHub Actions. Score 6.1→7.7/10. |
| 2.20 = Wave 11 | Bug bash + consolidation | send-push CORS fix (root cause: no OPTIONS handler), admin Sair race fix (effect-order bug), admin nav arrows, BottomNavSpacer additive height, AdminPolls RHF+zod migration, pg_cron 401 → verify_jwt=false rescue. |
| 2.21 = Wave 12 | Mobile polish | PWA icon RGBA flatten (removed alpha bleed), header back button (icon-only in chrome slot), iOS input zoom CSS (first pass). |
| 2.22 = Wave 13 | Icon system regenerated | "Bracketed D" SVG master, 14 PNGs (favicon/apple-touch/PWA-maskable+any/macOS-install/Windows-tile/OG-social), favicon.svg + mask-icon.svg, all opaque RGB, ?v=2 cache-bust. |
| 2.23 = Wave 14 | UX iteration | RequireAuth gate, fixed-position header (replaced sticky — iOS PWA standalone fix), bottom nav opacity, back to icon-only, translate=no on brand spans, iOS input zoom v2 (broader selector), login functional language picker, PWA install hook + platform modal, Game Catalogue moved to Hub + refined (no description/counts/icon fallbacks), Polls subtitle removed, ScrollToTop, notifications View All → /alliance#announcements. |
| 2.24 = Wave 15 | Council redesign + variation system | 7-agent workflow `wf_09ad0ace-2ff`: CSS tone × glow matrix (3 new tones + 2 glow positions × 5 tones + pulse + reduced-motion guard), Council vocab rename (labels only — URLs/code untouched), centralized titles on 7 pages, dashboard tones applied, Council list with status tabs + participation rings + leading-option preview, Council detail with countdown hero + donut + results widget + voters row + 48h sparkline + sticky bar. |
| (parallel) | Game icons scrape | 243 webp icons pulled from kingshotdata.com via WordPress REST API `?_embed=wp:featuredmedia`. Organized in `public/images/icons/kingshot/{heroes,pets,masters,buildings,events,items,research,war-academy-research,alliance-tech,database}/` with manifest JSON for programmatic lookup. Polite 250ms delay, idempotent re-run. |

---

## 5 · Lessons learned (extended — Waves 10-15)

These additions to §3 — covering pitfalls discovered in Waves 10-15. The
full narrative is in `SESSION_LOG_2026-06-17.md`. Capsules:

### Lesson 12 — `position: sticky` breaks in iOS PWA standalone mode
A sticky element inside a flex column with `pt-safe` works fine in regular
Safari but silently loses its scroll anchor when the same site runs as a PWA
in standalone mode (display-mode: standalone). The element scrolls away with
content. **Fix:** use `fixed top-0 inset-x-0` + sibling spacer with matching
height. Same pattern bottom nav has always used.

### Lesson 13 — Vercel `cache-control: immutable` + iOS apple-touch-icon
Vercel ships `cache-control: max-age=31536000, immutable` by default on
`/icons/*`. iOS Safari honors this aggressively — deleting + re-installing
the PWA does NOT refetch the icon. **Fix:** cache-bust the icon URLs in
`index.html` with `?v=N`. iOS treats query-stringed URLs as distinct
resources. Future icon refreshes bump `v=N+1`.

### Lesson 14 — `BottomNavSpacer` under border-box + safe-area
`h-[72px] pb-safe` rendered the safe-area inset INSIDE the 72px box (the
default `box-sizing: border-box`), so a 34px home-indicator inset effectively
reduced the spacer to 38px. **Fix:**
`minHeight: calc(64px + max(0.5rem, env(safe-area-inset-bottom)))` — additive
math, grows with the inset.

### Lesson 15 — i18next plural keys look "missing" to naive grep audits
`key_one` / `key_other` are i18next's auto-pluralization. A grep for "key"
won't find them. **Fix for auditors:** before flagging missing keys, search
for `t(key, { count: N })` call patterns and verify the matching `_one` /
`_other` forms exist.

### Lesson 16 — pg_cron `service_role_key` setting may be empty
`current_setting('app.settings.service_role_key', true)` returned NULL in
this Supabase project — the setting wasn't populated. The cron's
Authorization header was therefore missing → send-push 401. **Fix:**
redeploy the called function with `verify_jwt: false` AND have it
authenticate via its own `SUPABASE_SERVICE_ROLE_KEY` env var internally
(which is always present in Edge Functions). The caller's JWT becomes
redundant. Bonus: simpler architecture, no need to manage a shared secret
across schema boundaries.

### Lesson 17 — Vercel Auth blocks OG scrapers
Vercel's "Require Log In" Standard Protection means Facebook/Discord/WhatsApp
crawlers get a 401 challenge they can't pass (no JS execution). Link
previews show fallback chrome. **Fix:** if the app has its own auth (which
ours does — RLS protects what matters), disable Vercel Auth. The Vercel
gate is strictly worse for this app's threat model.

### Lesson 18 — Subagent `sleep` long is an anti-pattern
Subagents that `sleep` more than a few seconds for a deploy-or-poll scenario
can stall and waste turns. **Fix:** drive long-running follow-ups from the
main loop using `Bash run_in_background` or the `Monitor` tool, or schedule
a follow-up agent for later. Subagents are best for bounded, parallel
investigation, not for wait-and-verify cycles.

### Lesson 19 — Browser auto-translate vs brand names
Chrome's auto-translate happily rewrites our brand name "DAD BIGDADDYS" as
"PAPAI GRANDÃOS" or worse. Our i18n explicitly says don't, but the browser
doesn't read our dont-translate.json. **Fix:**
- `<html translate="no">` + `<meta name="google" content="notranslate">` in
  index.html
- `translate="no"` on every brand-name span (Header, Alliance, etc)

### Lesson 20 — Card tone system as `tone × glow-position` matrix
Per-card overrides led to drift (each card had its own bespoke shadow + halo
combo). Refactored to a matrix: 5 tones (gold/crimson/success/steel/violet)
× 3 glow positions (top-left default, top-right `--glow-tr`, center-top
`--glow-c`) + optional `--pulse` (guarded by `prefers-reduced-motion`).
Now: card chooses semantic tone + visual weight; CSS does the rest. Adding
a new card variant is one line.

