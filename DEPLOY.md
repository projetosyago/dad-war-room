# DAD War Room — Deployment Guide

Go-live checklist for shipping the alliance command center to production.
The Supabase project is already provisioned and most heavy lifting (migrations,
storage buckets, Edge Function code) has landed via Waves 1–5 — this guide
focuses on the **manual steps Salles still needs to perform** before the first
production deploy works end-to-end.

> Background: the project ref, advisor counts, applied migrations and Edge
> Function deployment status are all tracked in
> [`WAR_ROOM_LOG.md`](WAR_ROOM_LOG.md) §2.10–§2.14. Read that first if
> anything below feels surprising.

---

## Prerequisites

- **Supabase project** — already provisioned. Project ref:
  `ilogsrlbenhdzkfgexvt` (region/plan as configured by Salles).
- **Vercel account** — connected to the GitHub repo that hosts this app.
- **Web Push VAPID keypair** — already generated during Wave 3. The
  **public key** lives in `.env.example` and gets shipped to browsers. The
  **private key** is stored only in Salles' local `.env.local` and must be
  uploaded to Supabase as a function secret before `send-push` can deliver
  messages.
- Node 20+ and `npm` for the Supabase CLI calls below.

```bash
npm install -g supabase   # or use `npx supabase ...` ad-hoc
supabase login            # one-time browser flow
```

---

## 1 · Supabase setup

### 1.1 Secrets for the `send-push` Edge Function

The Edge Function reads three secrets from the Supabase runtime
environment. They must be set **before** the cron job (step 1.3) is
scheduled, otherwise every invocation will fail.

```bash
npx supabase secrets set \
  VAPID_PUBLIC_KEY=<paste from your .env.local — same value as VITE_VAPID_PUBLIC_KEY> \
  VAPID_PRIVATE_KEY=<paste from your .env.local — NEVER commit this> \
  VAPID_SUBJECT=mailto:salles@dad-1652.example \
  --project-ref ilogsrlbenhdzkfgexvt
```

Notes:

- `VAPID_SUBJECT` must be a `mailto:` or `https://` URL — web-push libraries
  reject anything else.
- Use the values from Salles' local `.env.local`. The public key is
  duplicated as `VITE_VAPID_PUBLIC_KEY` so the browser knows which key to
  subscribe with; they **must match** the keypair stored on Supabase.
- To rotate the keypair later, see "Rotating VAPID keys" below — all
  existing subscriptions become invalid and members must re-subscribe.

### 1.2 Verify the `send-push` Edge Function is deployed

The function code already lives at `supabase/functions/send-push/` and was
deployed during Wave 3. Confirm it's still ACTIVE:

```bash
npx supabase functions list --project-ref ilogsrlbenhdzkfgexvt
# Look for: send-push  v1+  ACTIVE
```

If it's missing (e.g. after a project restore), redeploy:

```bash
npx supabase functions deploy send-push --project-ref ilogsrlbenhdzkfgexvt
```

### 1.3 Schedule `send-push` via pg_cron

The Edge Function polls `push_messages` for due rows on each invocation
(`scheduled_for <= now()` and `sent_at IS NULL`). To make it run on a
schedule, add a single pg_cron row from the Supabase SQL editor:

```sql
-- Ensure pg_cron is enabled (it ships with Supabase Pro by default).
create extension if not exists pg_cron with schema extensions;

-- Invoke send-push every minute. Adjust the cadence to taste — once a
-- minute is the sweet spot for "next event starts in 5 min" pings.
select cron.schedule(
  'send-push-every-minute',
  '* * * * *',
  $$
  select
    net.http_post(
      url      := 'https://ilogsrlbenhdzkfgexvt.supabase.co/functions/v1/send-push',
      headers  := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body     := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) as request_id;
  $$
);
```

`current_setting('app.settings.service_role_key', true)` reads the
service-role JWT from the database configuration. If your Supabase project
doesn't expose it that way, paste the service-role key inline (and treat
the cron migration as a secret — don't commit it to git).

To check past runs and surface failures:

```sql
select * from cron.job_run_details where jobname = 'send-push-every-minute'
order by start_time desc limit 20;
```

---

## 2 · Vercel setup

### 2.1 Connect the repo

1. Vercel dashboard → **Add New… → Project**.
2. Select the GitHub repo for this project.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Install command: leave as default (`npm install`).

### 2.2 Environment variables

In the project's **Settings → Environment Variables**, add three values for
the **Production** environment (and copy them into **Preview** too if you
want push to work on PR preview deployments):

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://ilogsrlbenhdzkfgexvt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (paste from Supabase Settings → API → anon public) |
| `VITE_VAPID_PUBLIC_KEY` | (paste — must match the `VAPID_PUBLIC_KEY` secret on the Supabase Edge Function) |

Trigger a redeploy after adding them; Vercel doesn't auto-rebuild on env
changes by default.

### 2.3 Custom domain (optional)

If Salles wants a friendly URL, point a domain (e.g. `dad-1652.vercel.app`
or a custom domain from a registrar) at the Vercel project under
**Settings → Domains**. The PWA manifest in `index.html` will pick up the
deployed origin automatically — no code changes needed.

---

## 3 · First-deploy smoke test

After the Vercel deploy finishes:

1. Open the deployed URL in a browser that supports Web Push (Chrome,
   Edge, Firefox; not Safari iOS unless installed as a PWA on iOS 16.4+).
2. Sign in as an admin account (r4 or r5).
3. Open **Settings → Notifications**, click **Ativar**, and grant the
   browser permission prompt. Confirm the toggle reads "Active".
4. Open `/admin/notifications` in another tab.
5. Compose a test message: title `Test`, body `Hello DAD`, audience
   `Admins`, schedule `Now`, click **Send**.
6. Within ~60 seconds (the pg_cron cadence + Edge Function processing
   time), the test notification should land on the browser that opted in
   in step 3. The bell icon in the header should also show a red dot;
   clicking it opens the panel with the message at the top.

If the notification doesn't arrive:

- Check **Supabase → Edge Functions → send-push → Logs** for errors.
- Confirm `cron.job_run_details` is recording successful runs (step 1.3).
- Verify the browser's notification permission for the site is **granted**
  in the OS-level settings, not just the in-app toggle.
- Inspect `push_message_deliveries` for the row — `error` will hold the
  web-push library's failure reason (404/410 = subscription was
  auto-deactivated; the user must re-subscribe).

---

## 4 · Post-deploy ops

### Rotating VAPID keys

If the private key leaks (or you just want to rotate annually):

1. Generate a new keypair:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Update both Supabase secrets (`VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`)
   via `npx supabase secrets set` (step 1.1).
3. Update Vercel's `VITE_VAPID_PUBLIC_KEY` env var and redeploy.
4. **Every existing subscription becomes invalid** — the `send-push`
   function will start receiving 410 Gone for each one, auto-deactivate
   them, and members will need to re-toggle the bell in Settings to
   re-subscribe. Communicate this in the chat before rotating.

### Monitoring the cron job

```sql
-- Last 20 cron runs and their HTTP response codes
select start_time, status, return_message
from cron.job_run_details
where jobname = 'send-push-every-minute'
order by start_time desc limit 20;

-- Deliveries with errors in the last 24 h
select pm.title, pmd.subscription_id, pmd.error, pmd.sent_at
from public.push_message_deliveries pmd
join public.push_messages pm on pm.id = pmd.message_id
where pmd.error is not null and pmd.sent_at > now() - interval '24 hours'
order by pmd.sent_at desc;
```

### Dropping the dev cache after deps change

Vite's pre-bundle cache occasionally stales out after `npm install` adds
a package that wasn't in `optimizeDeps.include` (Lesson 2):

```bash
rm -rf node_modules/.vite
npm run dev
```

This isn't a production deploy step — only relevant when iterating
locally and `vite dev` starts complaining about unresolved imports for a
package that physically exists in `node_modules`.

---

## Reference

- [`README.md`](README.md) — quick start and project overview.
- [`PLANNING.md`](PLANNING.md) §3 — schema source of truth (game
  catalogue, members, push).
- [`WAR_ROOM_LOG.md`](WAR_ROOM_LOG.md) §2.10 — migration log; §3 —
  lessons learned (read Lessons 1, 2, 6, 12, 13 before touching the
  database or build pipeline).
