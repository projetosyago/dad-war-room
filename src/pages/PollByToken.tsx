import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ShieldWarning } from '@phosphor-icons/react'
import { usePollByShareToken } from '../hooks/usePolls'

/**
 * Short-URL handler: `/p/<share_token>` → canonical `/alliance/polls/<slug>`.
 * Renders a tiny loading shim while the lookup resolves, then redirects.
 * If the token doesn't match anything, shows a friendly 404.
 */
export function PollByToken() {
  const { token } = useParams<{ token: string }>()
  const { poll, loading, error } = usePollByShareToken(token)
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="container-narrow py-8">
        <div className="card p-6 animate-pulse h-24" />
      </div>
    )
  }
  if (error || !poll) {
    return (
      <div className="container-narrow py-10 text-center">
        <ShieldWarning size={28} weight="duotone" className="mx-auto text-ink-mute mb-2" />
        <p className="text-sm text-ink-paper mb-4">{t('polls.shareToken.invalid')}</p>
        <Link to="/alliance/polls" className="btn-ghost text-xs">
          <ArrowLeft size={12} weight="bold" /> {t('polls.shareToken.browse')}
        </Link>
      </div>
    )
  }
  return <Navigate to={`/alliance/polls/${poll.slug}`} replace />
}
