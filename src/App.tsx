import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { BottomNav, BottomNavSpacer } from './components/BottomNav'
import { AdminBottomNav } from './components/AdminBottomNav'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { useAdminMode } from './contexts/AdminModeContext'
import { useAuth } from './hooks/useAuth'
import { Hub } from './pages/Hub'
import { Events } from './pages/Events'
import { Members } from './pages/Members'
import { Alliance } from './pages/Alliance'
import { Settings } from './pages/Settings'
import { Bear1Guide } from './pages/Bear1Guide'
import { Chat } from './pages/Chat'
import { Login } from './pages/Login'
import { Polls } from './pages/Polls'
import { PollDetail } from './pages/PollDetail'
import { PollByToken } from './pages/PollByToken'
import { MilestoneDetail } from './pages/MilestoneDetail'
import { MemberDetail } from './pages/MemberDetail'
import { Heroes } from './pages/Heroes'
import { HeroDetail } from './pages/HeroDetail'
import { Pets } from './pages/Pets'
import { Masters } from './pages/Masters'
import { TroopTiers } from './pages/TroopTiers'

// Admin pages — lazy-loaded so they stay out of the public bundle.
const AdminOccurrences = lazy(() =>
  import('./pages/admin/AdminOccurrences').then((m) => ({ default: m.AdminOccurrences })),
)
const AdminMilestones = lazy(() =>
  import('./pages/admin/AdminMilestones').then((m) => ({ default: m.AdminMilestones })),
)
const AdminEvents = lazy(() =>
  import('./pages/admin/AdminEvents').then((m) => ({ default: m.AdminEvents })),
)
const AdminAccounts = lazy(() =>
  import('./pages/admin/AdminAccounts').then((m) => ({ default: m.AdminAccounts })),
)
const AdminMembers = lazy(() =>
  import('./pages/admin/AdminMembers').then((m) => ({ default: m.AdminMembers })),
)
const AdminPolls = lazy(() =>
  import('./pages/admin/AdminPolls').then((m) => ({ default: m.AdminPolls })),
)
const AdminChat = lazy(() =>
  import('./pages/admin/AdminChat').then((m) => ({ default: m.AdminChat })),
)
const AdminAlliance = lazy(() =>
  import('./pages/admin/AdminAlliance').then((m) => ({ default: m.AdminAlliance })),
)
const AdminNotifications = lazy(() =>
  import('./pages/admin/AdminNotifications').then((m) => ({ default: m.AdminNotifications })),
)
const AdminAnalytics = lazy(() =>
  import('./pages/admin/AdminAnalytics').then((m) => ({ default: m.AdminAnalytics })),
)
const AdminCatalogue = lazy(() =>
  import('./pages/admin/AdminCatalogue').then((m) => ({ default: m.AdminCatalogue })),
)
const AdminHeroes = lazy(() =>
  import('./pages/admin/AdminHeroes').then((m) => ({ default: m.AdminHeroes })),
)
const AdminPets = lazy(() =>
  import('./pages/admin/AdminPets').then((m) => ({ default: m.AdminPets })),
)
const AdminMasters = lazy(() =>
  import('./pages/admin/AdminMasters').then((m) => ({ default: m.AdminMasters })),
)
const AdminTroopTiers = lazy(() =>
  import('./pages/admin/AdminTroopTiers').then((m) => ({ default: m.AdminTroopTiers })),
)
const AdminEventParticipants = lazy(() =>
  import('./pages/admin/AdminEventParticipants').then((m) => ({
    default: m.AdminEventParticipants,
  })),
)

/** Skeleton shown while a lazy route chunk is loading. */
function RouteFallback() {
  return (
    <div className="container-wide pt-6">
      <div className="card-hero h-32 animate-pulse" />
    </div>
  )
}

/** Routes that render full-screen without Header/Footer/BottomNav chrome. */
const BARE_ROUTES = new Set<string>(['/login'])

function App() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const isBare = BARE_ROUTES.has(pathname)
  const { adminMode, enter } = useAdminMode()
  const auth = useAuth()

  // Direct URL to /admin/* (bookmark, refresh) auto-enters admin mode.
  useEffect(() => {
    if (
      pathname.startsWith('/admin/') &&
      pathname !== '/admin/login' &&
      auth.isAdmin &&
      !adminMode
    ) {
      enter()
    }
  }, [pathname, auth.isAdmin, adminMode, enter])

  return (
    <div className="min-h-screen flex flex-col">
      {!isBare && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-gold focus:text-bg-deep focus:px-3 focus:py-2 focus:rounded"
        >
          {t('ui.skipToContent')}
        </a>
      )}
      {!isBare && <Header />}
      <main id="main-content" className={isBare ? '' : 'flex-1'}>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public / member-facing */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Hub />} />
          <Route path="/events" element={<Events />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/alliance" element={<Alliance />} />
          <Route path="/alliance/members" element={<Members />} />
          <Route path="/alliance/members/:nick" element={<MemberDetail />} />
          <Route path="/alliance/polls" element={<Polls />} />
          <Route path="/alliance/polls/:slug" element={<PollDetail />} />
          <Route path="/heroes" element={<Heroes />} />
          <Route path="/heroes/:slug" element={<HeroDetail />} />
          <Route path="/pets" element={<Pets />} />
          <Route path="/masters" element={<Masters />} />
          <Route path="/troop-tiers" element={<TroopTiers />} />
          <Route path="/about" element={<Navigate to="/alliance" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/bear-1" element={<Bear1Guide />} />

          {/* Short share link for in-game chat: /p/<token> → resolves & redirects */}
          <Route path="/p/:token" element={<PollByToken />} />

          {/* Kingdom Timeline — admin-authored milestone detail page */}
          <Route path="/timeline/:slug" element={<MilestoneDetail />} />

          {/* Legacy redirects */}
          <Route path="/members" element={<Navigate to="/alliance/members" replace />} />
          <Route path="/polls" element={<Navigate to="/alliance/polls" replace />} />
          <Route path="/polls/:slug" element={<PollSlugRedirect />} />

          {/* Legacy admin login → unified per-account /login */}
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <Navigate to="/admin/events" replace />
              </ProtectedAdminRoute>
            }
          />
          {/* Eventos hub: catalogue (list) + Occurrences subroute */}
          <Route
            path="/admin/events"
            element={
              <ProtectedAdminRoute>
                <AdminEvents />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/events/occurrences"
            element={
              <ProtectedAdminRoute>
                <AdminOccurrences />
              </ProtectedAdminRoute>
            }
          />
          {/* Membros hub: roster + Accounts subroute */}
          <Route
            path="/admin/members"
            element={
              <ProtectedAdminRoute>
                <AdminMembers />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/members/accounts"
            element={
              <ProtectedAdminRoute>
                <AdminAccounts />
              </ProtectedAdminRoute>
            }
          />
          {/* Aliança hub: public info + Kingdom Timeline (milestones) subroute */}
          <Route
            path="/admin/alliance"
            element={
              <ProtectedAdminRoute>
                <AdminAlliance />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/alliance/timeline"
            element={
              <ProtectedAdminRoute>
                <AdminMilestones />
              </ProtectedAdminRoute>
            }
          />
          {/* Enquetes / Chat / Notif / Dados */}
          <Route
            path="/admin/polls"
            element={
              <ProtectedAdminRoute>
                <AdminPolls />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/chat"
            element={
              <ProtectedAdminRoute>
                <AdminChat />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedAdminRoute>
                <AdminNotifications />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedAdminRoute>
                <AdminAnalytics />
              </ProtectedAdminRoute>
            }
          />
          {/* Aliança hub → Game Catalogue (heroes / pets / masters / troop tiers) */}
          <Route
            path="/admin/alliance/catalogue"
            element={
              <ProtectedAdminRoute>
                <AdminCatalogue />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/alliance/catalogue/heroes"
            element={
              <ProtectedAdminRoute>
                <AdminHeroes />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/alliance/catalogue/pets"
            element={
              <ProtectedAdminRoute>
                <AdminPets />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/alliance/catalogue/masters"
            element={
              <ProtectedAdminRoute>
                <AdminMasters />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/alliance/catalogue/troop-tiers"
            element={
              <ProtectedAdminRoute>
                <AdminTroopTiers />
              </ProtectedAdminRoute>
            }
          />
          {/* Event participants — admin pins members to a specific occurrence */}
          <Route
            path="/admin/events/occurrences/:id/participants"
            element={
              <ProtectedAdminRoute>
                <AdminEventParticipants />
              </ProtectedAdminRoute>
            }
          />

          {/* Legacy admin redirects — preserve bookmarks to consolidated routes */}
          <Route path="/admin/dashboard" element={<Navigate to="/admin/events" replace />} />
          <Route path="/admin/accounts" element={<Navigate to="/admin/members/accounts" replace />} />
          <Route path="/admin/occurrences" element={<Navigate to="/admin/events/occurrences" replace />} />
          <Route path="/admin/milestones" element={<Navigate to="/admin/alliance/timeline" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
      {!isBare && <Footer />}
      {!isBare && <BottomNavSpacer />}
      {!isBare && (adminMode ? <AdminBottomNav /> : <BottomNav />)}
    </div>
  )
}

/** Redirect legacy `/polls/:slug` to the new `/alliance/polls/:slug`. */
function PollSlugRedirect() {
  const { pathname } = useLocation()
  return <Navigate to={pathname.replace(/^\/polls/, '/alliance/polls')} replace />
}

export default App
