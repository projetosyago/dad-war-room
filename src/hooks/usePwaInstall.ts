import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform =
  | 'ios-safari' // iPhone/iPad — no programmatic API, Share → Add to Home Screen
  | 'mac-safari' // macOS Safari — manual, File → Add to Dock (Safari 17+)
  | 'android-chrome' // Chrome / Edge / Brave on Android
  | 'desktop-chromium' // Chrome / Edge / Brave / Arc on desktop
  | 'firefox' // No native PWA install on desktop Firefox, partial on Android
  | 'unknown'

export type InstallOutcome =
  | 'installed' // user accepted the native prompt
  | 'dismissed' // user dismissed the native prompt
  | 'manual' // no programmatic API available — caller should show a tutorial
  | 'already' // app already running as PWA

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari uses a legacy property on navigator
  return (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

function detectPlatform(): InstallPlatform {
  if (typeof window === 'undefined') return 'unknown'
  const ua = window.navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  if (isIOS) return 'ios-safari'
  const isAndroid = /Android/i.test(ua)
  if (isAndroid) return 'android-chrome'
  const isMac = /Macintosh/.test(ua)
  const isFirefox = /Firefox/i.test(ua)
  if (isFirefox) return 'firefox'
  if (isMac) return 'mac-safari'
  return 'desktop-chromium'
}

/**
 * Shared PWA install hook — captures the `beforeinstallprompt` event (where
 * available) and exposes a single `install()` function that returns an outcome
 * describing what happened so the caller can show appropriate UI.
 *
 * Platforms WITH a programmatic prompt: Android Chrome/Edge/Brave, desktop
 * Chrome/Edge/Brave/Arc. Calling install() pops the native install sheet.
 *
 * Platforms WITHOUT: iOS Safari, macOS Safari, Firefox. install() returns
 * { outcome: 'manual' } and the caller should show a tutorial modal with
 * platform-specific instructions (Share → Add to Home Screen, etc).
 */
export function usePwaInstall(): {
  installed: boolean
  canPromptDirectly: boolean
  install: () => Promise<InstallOutcome>
  platform: InstallPlatform
} {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone())
  const [platform] = useState<InstallPlatform>(() => detectPlatform())

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (installed) return 'already'
    if (!deferred) return 'manual'
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      setDeferred(null)
      return 'installed'
    }
    return 'dismissed'
  }, [deferred, installed])

  return {
    installed,
    canPromptDirectly: !!deferred,
    install,
    platform,
  }
}
