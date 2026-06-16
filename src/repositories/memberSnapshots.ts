import { supabase } from '../lib/supabase'
import type { MemberPowerSnapshot } from '../types/domain'
import { mapMemberPowerSnapshot } from './mappers'

/**
 * Read access for `public.member_power_snapshots`. Rows are written by a
 * trigger on `members` UPDATE (power_m / tg_level deltas) — we never INSERT
 * from the client. The chart consumes these as the historical series.
 *
 * Ordering note: the query asks the DB for DESC (most recent first) — handy
 * for "latest N" semantics — but the chart consumer flips back to ASC for
 * left-to-right rendering. Doing the DESC at SQL time means the LIMIT picks
 * the *newest* rows, not an arbitrary slice.
 */
export async function listSnapshotsForMember(
  memberId: string,
  limit = 365,
): Promise<MemberPowerSnapshot[]> {
  const { data, error } = await supabase
    .from('member_power_snapshots')
    .select('*')
    .eq('member_id', memberId)
    .order('snapshot_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(mapMemberPowerSnapshot)
}
