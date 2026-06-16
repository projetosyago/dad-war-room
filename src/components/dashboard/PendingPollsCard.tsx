import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CheckCircle,
  ScrollIcon,
  SealCheck,
} from '@phosphor-icons/react'
import { useAuth } from '../../hooks/useAuth'
import { usePendingPolls } from '../../hooks/usePolls'

/**
 * Hub widget — polls waiting for the signed-in voting member's vote.
 * Same anatomy as NextEventCard: framed gold icon, eyebrow + hero title,
 * footer strip with metadata + arrow CTA.
 *
 * Hidden when signed-out or ally. When 0 pending → "all clear" empty state
 * (Salles 2026-06-15: nunca esconder, mostrar "nenhuma pendente").
 */
export function PendingPollsCard() {
  const { t } = useTranslation()
  const auth = useAuth()
  const { polls, loading } = usePendingPolls(
    auth.account?.id,
    auth.isVotingMember,
  )

  if (auth.status !== 'signed-in' || !auth.isVotingMember) return null
  if (loading) return null

  const isEmpty = polls.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`card-hero ${isEmpty ? 'card-hero--success' : ''}`}
    >
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
        <span
          className={`icon-frame ${isEmpty ? 'text-[#7fc08a]' : 'text-gold-soft'}`}
          style={
            isEmpty
              ? { boxShadow: '0 0 18px -4px rgba(127,192,138,0.45)', borderColor: 'rgba(127,192,138,0.4)' }
              : undefined
          }
        >
          {isEmpty ? (
            <SealCheck size={24} weight="fill" />
          ) : (
            <ScrollIcon size={24} weight="duotone" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={`eyebrow ${isEmpty ? '' : ''}`}
            style={isEmpty ? { color: '#7fc08a' } : undefined}
          >
            {isEmpty ? t('hub.pendingPolls.allClearEyebrow') : t('hub.pendingPolls.actionEyebrow')}
          </div>
          <h2 className="hero-title text-lg sm:text-xl mt-0.5 text-ink-cream">
            {isEmpty
              ? t('hub.pendingPolls.emptyTitle')
              : t('hub.pendingPolls.waitingTitle', { count: polls.length })}
          </h2>
          {isEmpty && (
            <p className="text-xs text-ink-mute mt-1">
              {t('hub.pendingPolls.emptySubtitle')}
            </p>
          )}
        </div>
      </div>

      {!isEmpty && (
        <ul className="px-5 sm:px-6 pb-2 divide-y divide-gold/10">
          {polls.slice(0, 3).map((poll) => (
            <li key={poll.id}>
              <Link
                to={`/alliance/polls/${poll.slug}`}
                className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-gold/5 transition-colors group"
              >
                <CheckCircle size={14} weight="duotone" className="text-gold-soft shrink-0" />
                <span className="flex-1 text-sm text-ink-cream truncate">{poll.title}</span>
                <ArrowRight
                  size={13}
                  weight="bold"
                  className="text-ink-mute group-hover:text-gold-soft group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="card-foot">
        <span className="text-[11px] text-ink-mute">
          {isEmpty
            ? t('hub.pendingPolls.footerEmpty')
            : t('hub.pendingPolls.footerCount', { shown: Math.min(polls.length, 3), total: polls.length })}
        </span>
        <Link
          to="/alliance/polls"
          className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] ${
            isEmpty ? 'text-[#7fc08a] hover:opacity-80' : 'text-gold-soft hover:text-gold-shimmer'
          }`}
        >
          {t('hub.pendingPolls.viewAll')}
          <ArrowRight size={12} weight="bold" />
        </Link>
      </div>
    </motion.div>
  )
}
