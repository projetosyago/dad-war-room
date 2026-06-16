import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedAdminRouteProps {
  children: React.ReactNode
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return (
      <div className="container-narrow py-16 text-center text-ink-mute text-sm">
        Checking session...
      </div>
    )
  }

  // Signed-out → go to the unified /login (per-account system from Fase B).
  if (auth.status === 'signed-out') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  // Signed-in but not r4/r5 → home (admin space is forbidden, not "redirect to log in").
  if (!auth.isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
