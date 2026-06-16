/**
 * App-level domain types — these are what the React components consume.
 * Raw DB row types live in `./database/supabase.ts` and are mapped via the
 * helpers in `src/repositories/mappers.ts`.
 */

export type EventStatus = 'active' | 'coming-soon' | 'archived'

export interface GameEvent {
  id: string
  slug: string
  name: string
  shortName: string | null
  description: string | null
  iconUrl: string | null
  guideRoute: string | null
  status: EventStatus
  displayOrder: number
  accentColor: string | null
  isSeasonal: boolean
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface EventOccurrence {
  id: string
  eventId: string
  startsAtUtc: string // ISO 8601
  durationMinutes: number
  phaseLabel: string | null
  notes: string | null
  recurrenceRule: string | null
  cancelled: boolean
  createdAt: string
}

/** Occurrence joined with its parent event (the common shape in the UI). */
export interface OccurrenceWithEvent extends EventOccurrence {
  event: GameEvent
}

export type MilestoneCategory =
  | 'truegold'
  | 'heroes'
  | 'pets'
  | 'pvp'
  | 'feature'
  | 'master'
  | 'fog'
  | 'war-academy'
  | 'other'

export interface KingdomMilestone {
  id: string
  slug: string
  name: string
  category: MilestoneCategory
  /** ISO date string in UTC, or null if not yet known. */
  unlockDateUtc: string | null
  notes: string | null
  sourceUrl: string | null
  displayOrder: number
  achieved: boolean
  generation: number | null
  tgLevel: number | null
  /** Tiptap-authored rich content rendered on /timeline/:slug. */
  bodyHtml: string | null
  /** Per-milestone icon override (admin-picked). Falls back to smart resolver. */
  iconUrl: string | null
}

export interface AdminUser {
  id: string
  displayName: string
  ingameNick: string | null
}

/**
 * Account role — locked-in design in PLANNING.md "Member roles & permissions".
 *   ally     → read-only guest from another alliance (NOT a DAD member)
 *   member   → R1 (regular DAD member)
 *   r2 / r3  → DAD officers (no admin extras for now)
 *   r4 / r5  → admin (r5 also manages other accounts including allies)
 */
export type AccountRole = 'ally' | 'member' | 'r2' | 'r3' | 'r4' | 'r5'

/** A per-person account row from public.member_accounts. */
export interface MemberAccount {
  id: string
  username: string
  displayName: string
  role: AccountRole
  languageCode: string
  avatarHeroSlug: string | null
  avatarImageUrl: string | null
  memberId: string | null
  active: boolean
  passwordTemporary: boolean
  firstLoginAt: string | null
  lastLoginAt: string | null
  pwaInstalledAt: string | null
  createdAt: string
}

/**
 * In-game alliance rank (R1-R5). Mirrors `account_role` but conceptually
 * separate: this is the GAME state, account_role is the APP permission.
 */
export type AllianceRank = 'r1' | 'r2' | 'r3' | 'r4' | 'r5'
export type MemberSubgroup = 'lieutenant' | 'alpha' | 'enforcerer' | 'supreme'
export type MemberStatusValue = 'active' | 'temporary_out' | 'left'

/** A row from public.members — the DAD in-game roster. */
export interface Member {
  id: string
  nick: string
  rank: AllianceRank
  subgroup: MemberSubgroup | null
  powerM: number
  tgLevel: number | null
  townCenterLevel: number | null
  dadTag: string | null      // 'prefix' / 'suffix' / null
  tagPosition: string | null
  status: MemberStatusValue
  statusNote: string | null
  langHint: string | null
  note: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

/** Poll type — single-select or multi-select. */
export type PollType = 'single' | 'multi'
export type PollStatus = 'draft' | 'open' | 'closed' | 'archived'
/** when results are visible: 'during' open · 'after_close' only · 'admin_only' always restricted */
export type ResultsVisibility = 'during' | 'after_close' | 'admin_only'

export interface Poll {
  id: string
  slug: string
  shareToken: string
  title: string
  /** Markdown — render via `markdownToHtml` from src/lib/markdown.ts. */
  description: string | null
  type: PollType
  status: PollStatus
  opensAt: string | null
  closesAt: string | null
  closedAt: string | null
  resultsVisibility: ResultsVisibility
  eventOccurrenceId: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface PollOption {
  id: string
  pollId: string
  label: string
  displayOrder: number
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface PollVote {
  pollId: string
  optionId: string
  accountId: string
  votedAt: string
}

/** Poll with options and votes already attached — what page handlers consume. */
export interface PollWithDetails extends Poll {
  options: PollOption[]
  votes: PollVote[]
}

/**
 * Singleton row from public.alliance_settings — the editable metadata
 * surfaced on /alliance (rank, motto, brand colors, capture date).
 */
export interface AllianceSettings {
  id: string
  rank: string | null
  motto: string | null
  tagline: string | null
  brandPrimary: string | null
  brandAccent: string | null
  capturedAt: string | null
  updatedAt: string
}

/** Troop branch — primary combat unit category in Kingshot. */
export type TroopBranch = 'infantry' | 'cavalry' | 'archer'

/** A Hero in the game catalogue (row from public.heroes). */
export interface Hero {
  id: string
  slug: string
  name: string
  generation: number
  role: string | null
  preferredBranch: TroopBranch | null
  portraitUrl: string | null
  description: string | null
  releasedAt: string | null
  displayOrder: number
  active: boolean
}

/** A Pet in the game catalogue (row from public.pets). */
export interface Pet {
  id: string
  slug: string
  name: string
  generation: number
  portraitUrl: string | null
  description: string | null
  releasedAt: string | null
  displayOrder: number
  active: boolean
}

/** A Master in the game catalogue (row from public.masters). */
export interface Master {
  id: string
  slug: string
  name: string
  unlockOrder: number
  portraitUrl: string | null
  description: string | null
  releasedAt: string | null
  active: boolean
}

/** A Troop tier (T1..T10, TG1..TG8). */
export interface TroopTier {
  id: string
  tierLabel: string
  isTruegold: boolean
  displayOrder: number
  trainingBuildingLevel: number | null
  iconUrl: string | null
  description: string | null
}

/** A snapshot of a member's power_m / tg_level — written by the trigger. */
export interface MemberPowerSnapshot {
  id: string
  memberId: string
  powerM: number
  tgLevel: number | null
  snapshotAt: string
}

/** Participation role for an event occurrence. */
export type ParticipationRole = 'leader' | 'joiner' | 'standby'

/** A member's participation in a specific event occurrence. */
export interface EventParticipant {
  eventOccurrenceId: string
  memberId: string
  participationRole: ParticipationRole | null
  notes: string | null
  addedAt: string
}

/** Auth state surfaced to React. */
export interface AuthState {
  status: 'loading' | 'signed-in' | 'signed-out'
  user: { id: string; email: string } | null
  /** The full account row (null if no member_accounts entry — legacy state). */
  account: MemberAccount | null
  /** Derived from account.role — null if no account. */
  role: AccountRole | null
  /** role in ('r4', 'r5'). */
  isAdmin: boolean
  /** role in ('member','r2','r3','r4','r5') — i.e. not an ally. */
  isVotingMember: boolean
  /** role === 'ally'. */
  isAlly: boolean
}
