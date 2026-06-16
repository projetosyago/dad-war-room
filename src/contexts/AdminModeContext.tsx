import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../hooks/useAuth'

/**
 * Admin mode is a UI shell toggle (not a permission gate — auth.isAdmin still
 * controls that). When ON:
 *   - The member BottomNav is hidden
 *   - The AdminBottomNav (8 tabs, scrollable) is shown
 *   - The Header gets a crimson hairline below it
 *
 * Locked spec in PLANNING.md §1octies-bis "Navigation & page structure".
 *
 * Persistence: stored in localStorage so admins don't have to re-toggle on
 * every reload. Auto-exits when the user loses their R4/R5 role or signs out.
 */

interface AdminModeContextValue {
  adminMode: boolean
  enter: () => void
  exit: () => void
  toggle: () => void
}

const KEY = 'dad.adminMode'

const AdminModeContext = createContext<AdminModeContextValue | undefined>(undefined)

function readPersisted(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

function writePersisted(value: boolean): void {
  try {
    globalThis.localStorage?.setItem(KEY, value ? 'true' : 'false')
  } catch {
    /* localStorage blocked — non-fatal */
  }
}

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const [adminMode, setAdminMode] = useState<boolean>(readPersisted)
  const auth = useAuth()

  const enter = useCallback(() => {
    setAdminMode(true)
    writePersisted(true)
  }, [])

  const exit = useCallback(() => {
    setAdminMode(false)
    writePersisted(false)
  }, [])

  const toggle = useCallback(() => {
    setAdminMode((v) => {
      const next = !v
      writePersisted(next)
      return next
    })
  }, [])

  // Auto-exit when the user is no longer admin (signed out, role downgraded).
  useEffect(() => {
    if (adminMode && auth.status === 'signed-out') exit()
    if (adminMode && auth.status === 'signed-in' && !auth.isAdmin) exit()
  }, [adminMode, auth.status, auth.isAdmin, exit])

  const value = useMemo(
    () => ({ adminMode, enter, exit, toggle }),
    [adminMode, enter, exit, toggle],
  )

  return <AdminModeContext.Provider value={value}>{children}</AdminModeContext.Provider>
}

export function useAdminMode(): AdminModeContextValue {
  const ctx = useContext(AdminModeContext)
  if (!ctx) {
    throw new Error('useAdminMode must be used inside <AdminModeProvider>')
  }
  return ctx
}
