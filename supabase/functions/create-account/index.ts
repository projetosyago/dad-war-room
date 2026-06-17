// Edge Function: create-account
//
// Admin-only (r4/r5) endpoint that mints a new auth.users row + matching
// public.member_accounts row in one shot. The browser cannot do this because
// auth.admin.createUser requires the service_role key.
//
// Called by src/repositories/accounts.ts → supabase.functions.invoke('create-account', { body }).
// Deployed to Supabase via MCP; the source here is for repo discovery and
// re-deploy via `supabase functions deploy create-account` if needed.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS — must include every custom header the browser will send.
// `x-application-name` is set globally by our supabase client (src/lib/supabase.ts).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_ROLES = ['ally', 'member', 'r2', 'r3', 'r4', 'r5'] as const
type AccountRole = typeof VALID_ROLES[number]

interface Body {
  username: string
  password: string
  role: AccountRole
  displayName?: string
  languageCode?: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Redact PII (emails, usernames) before writing to logs.
function redact(s: string | null | undefined): string {
  if (!s) return '<none>'
  if (s.includes('@')) return s.split('@')[0].slice(0, 2) + '***@' + s.split('@')[1].slice(-4)
  return s.slice(0, 2) + '***'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    // ─── Verify caller is admin (r4/r5) using their own JWT ──────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Invalid session' }, 401)

    const { data: caller, error: callerErr } = await userClient
      .from('member_accounts')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (callerErr || !caller) return json({ error: 'No account row for caller' }, 403)
    if (caller.role !== 'r4' && caller.role !== 'r5') {
      return json({ error: 'Admin (r4/r5) only' }, 403)
    }

    // ─── Parse + validate body ───────────────────────────────────────────
    let body: Body
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

    if (!body.username || !body.password || !body.role) {
      return json({ error: 'username, password, and role are required' }, 400)
    }
    if (!VALID_ROLES.includes(body.role)) {
      return json({ error: `Invalid role: ${body.role}` }, 400)
    }
    if (body.role === 'r5' && caller.role !== 'r5') {
      return json({ error: 'Only r5 can create r5 accounts' }, 403)
    }

    const username = String(body.username).trim().toLowerCase()
    const displayName = ((body.displayName ?? body.username) || '').toString().trim()
    const languageCode = (body.languageCode ?? 'en').toString().toLowerCase().slice(0, 8)

    if (!/^[a-z0-9._-]{2,32}$/.test(username)) {
      return json({ error: 'Username must be 2-32 chars · only a-z 0-9 . _ -' }, 400)
    }
    if (body.password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const email = `${username}@dad-war-room.local`

    // ─── Create auth user + member_account row ───────────────────────────
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    console.log('[create-account] Calling auth.admin.createUser for', redact(email))
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
    })
    if (authError || !authData.user) {
      console.error('[create-account] createUser failed:', authError?.message, authError)
      const friendly = authError?.message?.toLowerCase().includes('already')
        ? `A user with username "${username}" already exists.`
        : (authError?.message ?? 'Failed to create auth user')
      return json({ error: friendly }, 400)
    }

    console.log('[create-account] Inserting member_accounts row for', authData.user.id)
    const { data: account, error: accountError } = await adminClient
      .from('member_accounts')
      .insert({
        id: authData.user.id,
        username,
        display_name: displayName || username,
        role: body.role,
        language_code: languageCode,
        password_temporary: false, // Salles: don't force password change
        created_by: user.id,
      })
      .select()
      .single()

    if (accountError) {
      console.error('[create-account] Insert failed, rolling back auth user:', accountError.message)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return json({ error: accountError.message }, 400)
    }

    console.log('[create-account] Success for username', redact(username))
    return json({ account }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return json({ error: message }, 500)
  }
})
