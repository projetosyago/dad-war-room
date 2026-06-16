/**
 * Web Push primitives.
 *
 * Browser-side helpers for VAPID-protected push subscriptions:
 *   - urlBase64ToUint8Array  — convert the public key to the binary form the
 *                              PushManager expects.
 *   - getPushPublicKey       — read VITE_VAPID_PUBLIC_KEY at call time.
 *   - subscribePush          — request Notification permission and produce a
 *                              fresh PushSubscription JSON.
 *   - unsubscribePush        — best-effort tear-down of the current sub.
 *   - getCurrentSubscription — peek the existing sub without prompting.
 *
 * This module is environment-aware: every function early-returns or throws
 * with a clear message in non-browser / unsupported contexts so callers don't
 * have to repeat the feature-detect boilerplate.
 */

/** Convert a URL-safe base64 VAPID public key into a Uint8Array. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

/**
 * Returns the VAPID public key from Vite env. Throws when missing — the caller
 * (the hook) renders a "push not configured" state in that case.
 */
export function getPushPublicKey(): string {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!key || key.trim() === '') {
    throw new Error(
      'Missing VITE_VAPID_PUBLIC_KEY. Add it to .env.local and restart Vite.',
    )
  }
  return key
}

/**
 * True when the runtime exposes both the Service Worker and PushManager APIs.
 * Used by callers to render a fallback UI instead of throwing.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Resolves to the registration that owns this scope. We wait for `ready` so
 * the SW is actually active before we ask its PushManager for anything.
 */
async function getRegistration(): Promise<ServiceWorkerRegistration> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.')
  }
  // navigator.serviceWorker.ready resolves only when there is an active SW.
  // vite-plugin-pwa registers one in autoUpdate mode, so this is safe in prod.
  return navigator.serviceWorker.ready
}

/**
 * Subscribes the current browser to push.
 *
 * Flow:
 *   1. feature-detect → throw if unsupported.
 *   2. request Notification permission (no-op if already granted).
 *   3. ask the PushManager to subscribe with the VAPID key.
 *
 * Returns the JSON form of the subscription so callers can persist it.
 */
export async function subscribePush(): Promise<PushSubscriptionJSON> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(`Notification permission was '${permission}'.`)
  }

  const registration = await getRegistration()

  // Reuse the existing sub if it already exists with the same key. The PushManager
  // will throw InvalidStateError otherwise.
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing.toJSON()

  // PushManager's typed signature wants BufferSource (ArrayBuffer-backed); the
  // Uint8Array we get from urlBase64ToUint8Array satisfies it at runtime, but
  // TS5+'s narrower ArrayBufferLike typing requires a cast. Safe — the buffer
  // is a fresh ArrayBuffer, never a SharedArrayBuffer.
  const applicationServerKey = urlBase64ToUint8Array(getPushPublicKey())
    .buffer as ArrayBuffer
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  })
  return subscription.toJSON()
}

/**
 * Unsubscribes the current browser from push, if any subscription exists.
 * Safe to call even when there is no active subscription.
 */
export async function unsubscribePush(): Promise<void> {
  if (!isPushSupported()) return
  const registration = await getRegistration()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await subscription.unsubscribe()
}

/**
 * Peeks at the current subscription without prompting or registering anything.
 * Returns null when there is no active subscription or the API is unsupported.
 */
export async function getCurrentSubscription(): Promise<PushSubscriptionJSON | null> {
  if (!isPushSupported()) return null
  try {
    const registration = await getRegistration()
    const subscription = await registration.pushManager.getSubscription()
    return subscription ? subscription.toJSON() : null
  } catch {
    // Reading the current sub is best-effort — never throw.
    return null
  }
}
