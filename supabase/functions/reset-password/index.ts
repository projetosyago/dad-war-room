// Edge Function: reset-password
//
// Admin-only (r4/r5) endpoint that sets a new temporary password for any
// account, AND flips password_temporary=true on member_accounts so the
// member is forced to change it on next sign-in.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Body {
  accountId: string
  newPassword: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Invalid session' }, 401)

    // Caller must be admin (r4/r5).
    const { data: caller } = await userClient
      .from('member_accounts')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (!caller || (caller.role !== 'r4' && caller.role !== 'r5')) {
      return json({ error: 'Admin (r4/r5) only' }, 403)
    }

    let body: Body
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

    if (!body.accountId || !body.newPassword) {
      return json({ error: 'accountId and newPassword are required' }, 400)
    }
    if (body.newPassword.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Salles 2026-06-14: just change the password. No password_temporary flag.
    const { error: pwError } = await adminClient.auth.admin.updateUserById(body.accountId, {
      password: body.newPassword,
    })
    if (pwError) {
      console.error('[reset-password] updateUserById failed:', pwError.message)
      return json({ error: pwError.message }, 400)
    }

    return json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return json({ error: message }, 500)
  }
})
