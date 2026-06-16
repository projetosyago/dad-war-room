import { supabase } from '../lib/supabase'
import type {
  Poll,
  PollOption,
  PollStatus,
  PollType,
  PollVote,
  PollWithDetails,
  ResultsVisibility,
} from '../types/domain'
import type { Json } from '../types/database/supabase'
import { mapPoll, mapPollOption, mapPollVote } from './mappers'

/**
 * Polls repository — full Fase D spec (PLANNING.md §1quater).
 *
 * Vote rules: single-type DELETE-then-INSERT in `vote()`; multi-type INSERT
 * (or DELETE via `clearVote` to toggle off). RLS additionally gates by
 * `status='open' AND closes_at > NOW()`.
 */

const SHARE_TOKEN_LEN = 6
const SHARE_TOKEN_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ' // no 0/1/Il/O ambiguity

function generateShareToken(): string {
  let out = ''
  for (let i = 0; i < SHARE_TOKEN_LEN; i++) {
    out += SHARE_TOKEN_ALPHABET.charAt(
      Math.floor(Math.random() * SHARE_TOKEN_ALPHABET.length),
    )
  }
  return out
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export interface ListPollsOptions {
  /** Include drafts (admin-only filter; default false). */
  includeDrafts?: boolean
  /** Include archived polls (default false). */
  includeArchived?: boolean
}

/**
 * Lists polls visible to the caller.
 * - Members/allies see only `open` + `closed` polls.
 * - Admin pages pass `includeDrafts` and/or `includeArchived` to see everything.
 */
export async function listPolls(options: ListPollsOptions = {}): Promise<Poll[]> {
  const allowed: PollStatus[] = ['open', 'closed']
  if (options.includeDrafts) allowed.push('draft')
  if (options.includeArchived) allowed.push('archived')
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .in('status', allowed)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapPoll)
}

async function getPollByColumn(
  column: 'slug' | 'share_token',
  value: string,
): Promise<PollWithDetails | null> {
  const { data: poll, error: pollErr } = await supabase
    .from('polls').select('*').eq(column, value).maybeSingle()
  if (pollErr) throw pollErr
  if (!poll) return null
  const [{ data: options, error: optErr }, { data: votes, error: voteErr }] = await Promise.all([
    supabase.from('poll_options').select('*').eq('poll_id', poll.id).order('display_order', { ascending: true }),
    supabase.from('poll_votes').select('*').eq('poll_id', poll.id),
  ])
  if (optErr) throw optErr
  if (voteErr) throw voteErr
  return {
    ...mapPoll(poll),
    options: (options ?? []).map(mapPollOption),
    votes: (votes ?? []).map(mapPollVote),
  }
}

export const getPollBySlug = (slug: string) => getPollByColumn('slug', slug)
export const getPollByShareToken = (token: string) => getPollByColumn('share_token', token)

export interface CreatePollInput {
  title: string
  description?: string  // Markdown
  type: PollType
  status?: PollStatus            // default 'open' (admin can save as 'draft')
  opensAt?: string | null
  closesAt?: string | null
  resultsVisibility?: ResultsVisibility
  eventOccurrenceId?: string | null
  options: { label: string; metadata?: Record<string, unknown> }[]
  slug?: string
}

export async function createPoll(input: CreatePollInput): Promise<Poll> {
  if (!input.options || input.options.length < 2) {
    throw new Error('A poll needs at least 2 options.')
  }
  const baseSlug = input.slug ?? slugify(input.title)
  if (!baseSlug) throw new Error('Could not derive a slug from the title.')

  // Slug collision handling — small retry pool.
  let slug = baseSlug
  for (let attempt = 0; attempt < 4; attempt++) {
    const { count } = await supabase
      .from('polls').select('id', { count: 'exact', head: true }).ilike('slug', slug)
    if (!count) break
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 5)}`
  }

  // Share-token collision retry (very unlikely with 54^6 space).
  let shareToken = generateShareToken()
  for (let attempt = 0; attempt < 4; attempt++) {
    const { count } = await supabase
      .from('polls').select('id', { count: 'exact', head: true }).eq('share_token', shareToken)
    if (!count) break
    shareToken = generateShareToken()
  }

  const { data: poll, error: pollErr } = await supabase
    .from('polls')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      status: input.status ?? 'open',
      opens_at: input.opensAt ?? null,
      closes_at: input.closesAt ?? null,
      results_visibility: input.resultsVisibility ?? 'during',
      event_occurrence_id: input.eventOccurrenceId ?? null,
      slug,
      share_token: shareToken,
    })
    .select()
    .single()
  if (pollErr) throw pollErr

  const optionRows = input.options.map((opt, i) => ({
    poll_id: poll.id,
    label: opt.label.trim(),
    display_order: i,
    metadata: (opt.metadata ?? null) as Json | undefined,
  }))
  const { error: optErr } = await supabase.from('poll_options').insert(optionRows)
  if (optErr) {
    await supabase.from('polls').delete().eq('id', poll.id)
    throw optErr
  }
  return mapPoll(poll)
}

export async function vote(
  poll: Pick<Poll, 'id' | 'type'>,
  optionId: string,
  accountId: string,
): Promise<void> {
  if (poll.type === 'single') {
    const { error: delErr } = await supabase
      .from('poll_votes').delete().eq('poll_id', poll.id).eq('account_id', accountId)
    if (delErr) throw delErr
  }
  const { error } = await supabase
    .from('poll_votes')
    .upsert(
      { poll_id: poll.id, option_id: optionId, account_id: accountId },
      { onConflict: 'poll_id,option_id,account_id' },
    )
  if (error) throw error
}

export async function clearVote(pollId: string, optionId: string, accountId: string): Promise<void> {
  const { error } = await supabase
    .from('poll_votes').delete()
    .eq('poll_id', pollId).eq('option_id', optionId).eq('account_id', accountId)
  if (error) throw error
}

export async function clearAllVotesForPoll(pollId: string, accountId: string): Promise<void> {
  const { error } = await supabase
    .from('poll_votes').delete().eq('poll_id', pollId).eq('account_id', accountId)
  if (error) throw error
}

// ── Admin status workflow ───────────────────────────────────────────

export async function publishPoll(pollId: string): Promise<void> {
  const { error } = await supabase
    .from('polls').update({ status: 'open' }).eq('id', pollId)
  if (error) throw error
}

export async function closePollNow(pollId: string): Promise<void> {
  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('polls').update({ status: 'closed', closed_at: nowIso }).eq('id', pollId)
  if (error) throw error
}

export async function reopenPoll(pollId: string): Promise<void> {
  const { error } = await supabase
    .from('polls').update({ status: 'open', closed_at: null }).eq('id', pollId)
  if (error) throw error
}

export async function archivePoll(pollId: string): Promise<void> {
  const { error } = await supabase
    .from('polls').update({ status: 'archived' }).eq('id', pollId)
  if (error) throw error
}

export async function unarchivePoll(pollId: string, target: PollStatus = 'closed'): Promise<void> {
  const { error } = await supabase
    .from('polls').update({ status: target }).eq('id', pollId)
  if (error) throw error
}

export async function deletePoll(pollId: string): Promise<void> {
  const { error } = await supabase.from('polls').delete().eq('id', pollId)
  if (error) throw error
}

// ── Helpers / aggregations ──────────────────────────────────────────

/**
 * "Is the poll open and accepting votes right now?"
 * Status must be 'open' AND (no deadline OR deadline still in the future).
 */
export function isPollOpen(poll: Pick<Poll, 'status' | 'closesAt'>): boolean {
  if (poll.status !== 'open') return false
  if (!poll.closesAt) return true
  return new Date(poll.closesAt).getTime() > Date.now()
}

/** Whether the caller (member/ally/admin) should see vote counts on this poll. */
export function shouldShowResults(
  poll: Pick<Poll, 'status' | 'resultsVisibility' | 'closesAt'>,
  ctx: { isAdmin: boolean },
): boolean {
  if (ctx.isAdmin) return true // admins always see
  if (poll.resultsVisibility === 'admin_only') return false
  if (poll.resultsVisibility === 'after_close') return !isPollOpen(poll)
  return true // 'during'
}

export function tallyVotes(
  poll: PollWithDetails,
): { option: PollOption; votes: PollVote[]; count: number }[] {
  return poll.options.map((option) => {
    const votes = poll.votes.filter((v) => v.optionId === option.id)
    return { option, votes, count: votes.length }
  })
}

/** Polls the given account hasn't voted on yet (used in Hub widget). */
export async function listPollsPendingVote(accountId: string): Promise<Poll[]> {
  const { data: openPolls, error: pollsErr } = await supabase
    .from('polls').select('*').eq('status', 'open')
  if (pollsErr) throw pollsErr
  const open = (openPolls ?? []).map(mapPoll).filter(isPollOpen)
  if (open.length === 0) return []
  const { data: votes, error: votesErr } = await supabase
    .from('poll_votes').select('poll_id').eq('account_id', accountId)
  if (votesErr) throw votesErr
  const voted = new Set((votes ?? []).map((v) => v.poll_id))
  return open.filter((p) => !voted.has(p.id))
}
