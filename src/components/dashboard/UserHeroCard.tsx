import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Crown,
  PencilSimple,
  Shield,
  SignIn,
  Sword,
  User as UserIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMembers } from '../../hooks/useMembers'
import { formatPower } from '../../data/roster'
import { resolveAvatarUrl } from '../../lib/heroAvatar'

const RANK_LABEL: Record<string, string> = {
  r1: 'R1', r2: 'R2', r3: 'R3', r4: 'R4', r5: 'R5',
}

/**
 * Hub hero — "who you are" panel at the top of Home. Matches the NextEventCard
 * anatomy (radial glow, gold top beam, framed avatar, eyebrow + hero title,
 * footer strip with metadata and an action).
 */
export function UserHeroCard() {
  const { t } = useTranslation()
  const auth = useAuth()
  const { members } = useMembers()
  const ROLE_LABEL: Record<string, string> = {
    r5: t('hub.userHero.role.r5'),
    r4: t('hub.userHero.role.r4'),
    r3: t('hub.userHero.role.r3'),
    r2: t('hub.userHero.role.r2'),
    member: t('hub.userHero.role.member'),
    ally: t('hub.userHero.role.ally'),
  }

  if (auth.status === 'loading') {
    return (
      <div className="card-hero p-5 sm:p-6 min-h-[140px] animate-pulse">
        <div className="h-3 w-24 bg-bg-elev rounded mb-3" />
        <div className="h-5 w-56 bg-bg-elev rounded mb-4" />
        <div className="h-3 w-40 bg-bg-elev rounded" />
      </div>
    )
  }

  if (auth.status !== 'signed-in' || !auth.account) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="card-hero"
      >
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-2">
          <div className="flex items-center gap-3">
            <span className="icon-frame text-gold-soft">
              <UserIcon size={22} weight="duotone" />
            </span>
            <div>
              <div className="eyebrow">{t('hub.userHero.visitorEyebrow')}</div>
              <h2 className="hero-title text-lg sm:text-xl mt-0.5">
                {t('hub.userHero.visitorTitle')}
              </h2>
              <p className="text-xs text-ink-mute mt-1 max-w-[40ch]">
                {t('hub.userHero.visitorSubtitle')}
              </p>
            </div>
          </div>
        </div>
        <div className="card-foot">
          <span className="text-[11px] text-ink-mute tabular-nums">
            DAD War Room · Kingdom 1652
          </span>
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-gold hover:text-gold-shimmer"
          >
            <SignIn size={13} weight="duotone" /> {t('hub.userHero.signIn')}
          </Link>
        </div>
      </motion.div>
    )
  }

  const account = auth.account
  const linked = account.memberId ? members.find((m) => m.id === account.memberId) ?? null : null
  const displayName = linked?.nick ?? account.displayName ?? account.username
  // Single resolver shared with the Members roster — uploaded > picked hero > hashed.
  const avatarUrl = resolveAvatarUrl({
    uploadedUrl: account.avatarImageUrl,
    heroSlug: account.avatarHeroSlug,
    seed: account.username,
  })
  const rankLabel = linked ? RANK_LABEL[linked.rank] ?? linked.rank.toUpperCase() : ROLE_LABEL[account.role] ?? account.role.toUpperCase()
  const dadTag = linked?.dadTag
  const power = linked ? formatPower(linked.powerM) : null
  const tg = linked?.tgLevel != null ? `TG${linked.tgLevel}` : null
  const isAlly = account.role === 'ally'

  // Allies stay on the crimson card. Members/admins get the framed-portrait —
  // navy field + ornamental gold double-frame + medallion avatar.
  const variantClass = isAlly ? 'card-hero--crimson' : 'card-hero--portrait'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`card-hero ${variantClass}`}
    >
      <div className="relative flex items-center gap-4 p-5 sm:p-6 pb-4">
        {/* Avatar medallion — double-ring (gold outer, crimson inner), circular */}
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute -inset-1.5 rounded-full bg-gold/25 blur-md"
          />
          <div
            className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full p-[2px]"
            style={{
              background: isAlly
                ? 'linear-gradient(135deg, #e25656 0%, #b04949 100%)'
                : 'linear-gradient(135deg, #ffe9a3 0%, #f4cf73 50%, #c89934 100%)',
            }}
          >
            <div
              className="rounded-full p-[1.5px] h-full w-full"
              style={{
                background: isAlly
                  ? '#0d1124'
                  : 'linear-gradient(135deg, #b04949 0%, #6d1818 100%)',
              }}
            >
              <img
                src={avatarUrl}
                alt={displayName}
                className="rounded-full h-full w-full object-cover"
              />
            </div>
          </div>
          {dadTag && (
            <span
              className="absolute -bottom-1 -right-1 inline-flex items-center px-1.5 py-0.5 rounded-md bg-crimson text-ink-cream text-[9px] font-bold tracking-[0.18em] uppercase border border-crimson-glow/60 shadow-lg"
            >
              DAD
            </span>
          )}
        </div>

        {/* Name only — eats the upper area. Max 16 chars enforced by the input,
            so text-3xl always fits one line even worst case. */}
        <div className="min-w-0 flex-1">
          <h2 className="font-display tracking-[0.08em] text-2xl sm:text-3xl text-ink-cream truncate leading-tight">
            <span className="text-gold-shimmer">{displayName}</span>
          </h2>
          {isAlly && (
            <span className="inline-flex items-center text-[9px] tracking-[0.22em] uppercase px-1.5 py-0.5 rounded bg-crimson/12 border border-crimson/35 text-crimson-glow mt-1.5">
              {t('hub.userHero.allyBadge')}
            </span>
          )}

          {/* Stats — real game icons, mono-gold numerals. */}
          <div className="mt-3 flex items-end gap-5 sm:gap-7">
            {power && (
              <Stat
                value={power}
                label={t('hub.userHero.stat.power')}
                tint="steel"
                imageSrc="/images/buildings/truegold-barracks.png"
              />
            )}
            {tg && linked?.tgLevel != null && (
              <Stat
                value={tg}
                label={t('hub.userHero.stat.truegold')}
                tint="gold"
                imageSrc={`/images/tiers/tg${Math.min(8, Math.max(1, linked.tgLevel))}.png`}
              />
            )}
            {!power && !tg && (
              <Stat
                icon={Sword}
                value={ROLE_LABEL[account.role] ?? '—'}
                label={t('hub.userHero.stat.role')}
                tint="cream"
              />
            )}
          </div>
        </div>
      </div>

      <div className="card-foot relative">
        <span className="text-[11px] text-ink-mute truncate inline-flex items-center gap-2">
          <span>@{account.username}</span>
          <span className="text-gold-soft/40">·</span>
          <span className="inline-flex items-center gap-1 text-gold-soft">
            <Crown size={10} weight="duotone" />
            {rankLabel}
          </span>
        </span>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-gold-soft hover:text-gold-shimmer"
        >
          <PencilSimple size={12} weight="duotone" />
          {t('hub.userHero.editProfile')}
        </Link>
      </div>
    </motion.div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
  tint,
  imageSrc,
}: {
  icon?: typeof Shield
  value: string
  label: string
  tint: 'gold' | 'steel' | 'cream' | 'crimson' | 'navy'
  imageSrc?: string
}) {
  const valueClass =
    tint === 'gold'
      ? 'text-gold'
      : tint === 'steel'
        ? 'text-[#9fb2cc]'
        : tint === 'crimson'
          ? 'text-crimson-glow'
          : tint === 'navy'
            ? 'text-[#1f2542]'
            : 'text-ink-cream'
  const iconClass =
    tint === 'gold'
      ? 'text-gold-soft'
      : tint === 'steel'
        ? 'text-[#9fb2cc]'
        : tint === 'crimson'
          ? 'text-crimson-glow'
          : tint === 'navy'
            ? 'text-[#1f2542]'
            : 'text-ink-soft'
  // On the gold banner, the small "POWER" / "TRUEGOLD" label needs more contrast
  // than the default ink-mute (which is designed for dark backgrounds).
  const labelClass = tint === 'navy' ? 'text-[#5a3d0f]' : 'text-ink-mute'
  return (
    <div className="flex flex-col items-start">
      <span
        className={`font-mono text-2xl sm:text-3xl tabular-nums leading-none ${valueClass}`}
        style={
          tint === 'navy'
            ? { textShadow: '0 1px 0 rgba(255,233,163,0.55)', fontWeight: 700 }
            : undefined
        }
      >
        {value}
      </span>
      <span
        className={`mt-1 inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] tracking-[0.28em] uppercase font-semibold ${labelClass}`}
      >
        {imageSrc ? (
          <img src={imageSrc} alt="" className="h-3.5 w-3.5 object-contain" />
        ) : Icon ? (
          <Icon size={12} weight="duotone" className={iconClass} />
        ) : null}
        {label}
      </span>
    </div>
  )
}
