import { supabase } from '../lib/supabase'
import type { AdminUser, MemberAccount } from '../types/domain'
import { mapAdminUser, mapMemberAccount } from './mappers'

/** Synthetic email domain — usernames are turned into emails for Supabase Auth. */
export const SYNTHETIC_EMAIL_DOMAIN = '@dad-war-room.local'

/**
 * Convert a username typed at /login into the synthetic email Supabase Auth needs.
 * Already-an-email inputs pass through (so admin can paste a full email if they want).
 */
export function usernameToEmail(input: string): string {
  const trimmed = input.trim().toLowerCase()
  return trimmed.includes('@') ? trimmed : `${trimmed}${SYNTHETIC_EMAIL_DOMAIN}`
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/** Convenience wrapper that maps a username to the synthetic email and signs in. */
export async function signInWithUsername(username: string, password: string) {
  return signInWithPassword(usernameToEmail(username), password)
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/**
 * Load the current user's member_account row — source of truth for role,
 * display name, language, avatar. Returns null when not signed in, or when
 * the auth user exists but no member_accounts row has been provisioned yet.
 */
export async function getCurrentAccount(): Promise<MemberAccount | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('member_accounts')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw error
  return data ? mapMemberAccount(data) : null
}

/**
 * @deprecated Use {@link getCurrentAccount} and check `account.role` instead.
 * Kept while the old shared-admin AdminLogin route is still wired; will be
 * removed once that route is retired.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw error
  return data ? mapAdminUser(data) : null
}
