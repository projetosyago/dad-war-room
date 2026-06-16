import type { Tables } from '../types/database/supabase'
import type {
  GameEvent,
  EventOccurrence,
  KingdomMilestone,
  AdminUser,
  MemberAccount,
  Member,
  Poll,
  PollOption,
  PollVote,
  AllianceSettings,
  Hero,
  Pet,
  Master,
  TroopTier,
  MemberPowerSnapshot,
  EventParticipant,
  ParticipationRole,
} from '../types/domain'

export const mapEvent = (row: Tables<'events'>): GameEvent => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  shortName: row.short_name,
  description: row.description,
  iconUrl: row.icon_url,
  guideRoute: row.guide_route,
  status: row.status,
  displayOrder: row.display_order,
  accentColor: row.accent_color,
  isSeasonal: row.is_seasonal,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
})

export const mapOccurrence = (row: Tables<'event_occurrences'>): EventOccurrence => ({
  id: row.id,
  eventId: row.event_id,
  startsAtUtc: row.starts_at_utc,
  durationMinutes: row.duration_minutes,
  phaseLabel: row.phase_label,
  notes: row.notes,
  recurrenceRule: row.recurrence_rule,
  cancelled: row.cancelled,
  createdAt: row.created_at,
})

export const mapMilestone = (row: Tables<'kingdom_milestones'>): KingdomMilestone => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  category: row.category,
  unlockDateUtc: row.unlock_date_utc,
  notes: row.notes,
  sourceUrl: row.source_url,
  displayOrder: row.display_order,
  achieved: row.achieved,
  generation: row.generation,
  tgLevel: row.tg_level,
  bodyHtml: row.body_html,
  iconUrl: row.icon_url,
})

export const mapAdminUser = (row: Tables<'admin_users'>): AdminUser => ({
  id: row.id,
  displayName: row.display_name,
  ingameNick: row.ingame_nick,
})

export const mapPoll = (row: Tables<'polls'>): Poll => ({
  id: row.id,
  slug: row.slug,
  shareToken: row.share_token,
  title: row.title,
  description: row.description,
  type: row.type,
  status: row.status,
  opensAt: row.opens_at,
  closesAt: row.closes_at,
  closedAt: row.closed_at,
  resultsVisibility: row.results_visibility,
  eventOccurrenceId: row.event_occurrence_id,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const mapPollOption = (row: Tables<'poll_options'>): PollOption => ({
  id: row.id,
  pollId: row.poll_id,
  label: row.label,
  displayOrder: row.display_order,
  metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  createdAt: row.created_at,
})

export const mapPollVote = (row: Tables<'poll_votes'>): PollVote => ({
  pollId: row.poll_id,
  optionId: row.option_id,
  accountId: row.account_id,
  votedAt: row.voted_at,
})

export const mapMember = (row: Tables<'members'>): Member => ({
  id: row.id,
  nick: row.nick,
  rank: row.rank,
  subgroup: row.subgroup,
  powerM: Number(row.power_m),
  tgLevel: row.tg_level,
  townCenterLevel: row.town_center_level,
  dadTag: row.dad_tag,
  tagPosition: row.tag_position,
  status: row.status,
  statusNote: row.status_note,
  langHint: row.lang_hint,
  note: row.note,
  displayOrder: row.display_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const mapAllianceSettings = (row: Tables<'alliance_settings'>): AllianceSettings => ({
  id: row.id,
  rank: row.rank,
  motto: row.motto,
  tagline: row.tagline,
  brandPrimary: row.brand_primary,
  brandAccent: row.brand_accent,
  capturedAt: row.captured_at,
  updatedAt: row.updated_at,
})

export const mapMemberAccount = (row: Tables<'member_accounts'>): MemberAccount => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  role: row.role,
  languageCode: row.language_code,
  avatarHeroSlug: row.avatar_hero_slug,
  avatarImageUrl: row.avatar_image_url,
  memberId: row.member_id,
  active: row.active,
  passwordTemporary: row.password_temporary,
  firstLoginAt: row.first_login_at,
  lastLoginAt: row.last_login_at,
  pwaInstalledAt: row.pwa_installed_at,
  createdAt: row.created_at,
})

export const mapHero = (row: Tables<'heroes'>): Hero => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  generation: row.generation,
  role: row.role,
  preferredBranch: row.preferred_branch,
  portraitUrl: row.portrait_url,
  description: row.description,
  releasedAt: row.released_at,
  displayOrder: row.display_order,
  active: row.active,
})

export const mapPet = (row: Tables<'pets'>): Pet => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  generation: row.generation,
  portraitUrl: row.portrait_url,
  description: row.description,
  releasedAt: row.released_at,
  displayOrder: row.display_order,
  active: row.active,
})

export const mapMaster = (row: Tables<'masters'>): Master => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  unlockOrder: row.unlock_order,
  portraitUrl: row.portrait_url,
  description: row.description,
  releasedAt: row.released_at,
  active: row.active,
})

export const mapTroopTier = (row: Tables<'troop_tiers'>): TroopTier => ({
  id: row.id,
  tierLabel: row.tier_label,
  isTruegold: row.is_truegold,
  displayOrder: row.display_order,
  trainingBuildingLevel: row.training_building_level,
  iconUrl: row.icon_url,
  description: row.description,
})

export const mapMemberPowerSnapshot = (
  row: Tables<'member_power_snapshots'>,
): MemberPowerSnapshot => ({
  id: row.id,
  memberId: row.member_id,
  powerM: Number(row.power_m),
  tgLevel: row.tg_level,
  snapshotAt: row.snapshot_at,
})

export const mapEventParticipant = (
  row: Tables<'event_participants'>,
): EventParticipant => ({
  eventOccurrenceId: row.event_occurrence_id,
  memberId: row.member_id,
  participationRole: (row.participation_role as ParticipationRole | null) ?? null,
  notes: row.notes,
  addedAt: row.added_at,
})
