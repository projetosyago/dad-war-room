-- Wave 10 audit remediation: cover 8 unindexed FKs flagged by the Supabase
-- performance advisor. Shaves query time off cascade lookups + admin-actor
-- audits as tables grow. All idempotent (IF NOT EXISTS).

create index if not exists idx_alliance_settings_updated_by
  on public.alliance_settings (updated_by);
create index if not exists idx_event_occurrences_event_id
  on public.event_occurrences (event_id);
create index if not exists idx_login_events_account_id
  on public.login_events (account_id);
create index if not exists idx_member_accounts_member_id
  on public.member_accounts (member_id);
create index if not exists idx_poll_options_poll_id
  on public.poll_options (poll_id);
create index if not exists idx_poll_votes_account_id
  on public.poll_votes (account_id);
create index if not exists idx_push_message_deliveries_subscription_id
  on public.push_message_deliveries (subscription_id);
create index if not exists idx_push_messages_created_by
  on public.push_messages (created_by);
