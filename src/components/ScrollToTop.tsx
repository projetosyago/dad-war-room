import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Restores scroll-to-top behavior on new route navigation while preserving
 * scroll position on browser back/forward (POP navigation type).
 *
 * Why: React Router v6 doesn't reset scroll on route changes by default
 * (mimicking native browser behavior), but in an SPA the user expects
 * "open a new page, see the top". Without this, switching tabs at the
 * bottom-nav drops you halfway into the next page.
 *
 * Mount once near the top of the tree (inside <BrowserRouter>). No props,
 * renders nothing.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const type = useNavigationType()

  useEffect(() => {
    if (type === 'POP') return // back/forward: keep user's previous position
    if (hash) {
      // Smooth-scroll to a named anchor when present (e.g. /alliance#announcements
      // from the NotificationsPanel "View all" CTA).
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash, type])

  return null
}
