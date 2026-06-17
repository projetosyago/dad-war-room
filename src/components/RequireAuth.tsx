import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'

/**
 * Layout route — gates every member-facing page behind a signed-in session.
 *
 * - status === 'loading' → small placeholder so the screen doesn't flash before
 *   the supabase auth boot finishes.
 * - status === 'signed-out' → redirect to /login, preserving the requested path
 *   in location.state.from so the Login page can return them after auth.
 * - signed-in → render the nested route via <Outlet />.
 *
 * Admin-only pages keep their stricter `<ProtectedAdminRoute>` wrapper on top
 * of this so r1/r2/r3 members can't reach /admin/*.
 */
export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()
  const { t } = useTranslation()

  if (auth.status === 'loading') {
    return (
      <div className="container-narrow py-16 text-center text-ink-mute text-sm">
        {t('ui.checkingSession', 'Checking session…')}
      </div>
    )
  }

  if (auth.status === 'signed-out') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
