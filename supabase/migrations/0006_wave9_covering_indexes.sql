-- Wave 9 · cheap covering indexes for FK-style hot paths.
-- Apply via Supabase MCP `apply_migration` next session.
-- Estimated impact: shaves ~5ms off audit reads on AdminAnalytics + Members detail.
-- Both columns are nullable + low cardinality on writes (admin actions only),
-- so the index is cheap to maintain.

create index if not exists idx_event_participants_added_by
  on public.event_participants (added_by);

create index if not exists idx_member_power_snapshots_recorded_by
  on public.member_power_snapshots (recorded_by);

comment on index public.idx_event_participants_added_by is
  'Wave 9 covering index — supports admin audit reads by actor.';
comment on index public.idx_member_power_snapshots_recorded_by is
  'Wave 9 covering index — supports admin audit reads by actor.';
