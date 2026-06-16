import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database/supabase'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loud at boot so devs notice the missing env vars instead of
  // silently shipping a broken client.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local.',
  )
}

export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'dad-war-room.auth',
  },
  global: {
    headers: { 'x-application-name': 'dad-war-room' },
  },
})

export type SupabaseClientType = typeof supabase
