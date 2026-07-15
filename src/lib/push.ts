// Browser-side web push helpers. Pure platform plumbing — no React, no Supabase
// (the VAPID key is passed in; fetching it lives in src/api/notifications.ts).
//
// A PushSubscription belongs to a browser install, not to a person: permission is
// granted per browser+origin, so a subscription can only ever be created ON the
// device it is for. That is why Settings can enable push for "this device" only,
// while disabling any device just flips a row server-side.

export interface BrowserSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

/** iOS only allows web push from an installed (home-screen) PWA. */
export function isIosBrowserWithoutPwa(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIos) return false
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && Boolean((navigator as { standalone?: boolean }).standalone))
  return !standalone
}

export function permissionState(): NotificationPermission | 'unsupported' {
  return pushSupported() ? Notification.permission : 'unsupported'
}

// Built on an explicit ArrayBuffer so the result is a Uint8Array<ArrayBuffer>,
// which is what BufferSource (applicationServerKey) requires.
const b64urlToUint8 = (base64Url: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const view = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return view
}

const bufToB64url = (buf: ArrayBuffer | null): string => {
  if (!buf) return ''
  const bytes = new Uint8Array(buf)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const toBrowserSubscription = (sub: PushSubscription): BrowserSubscription => ({
  endpoint: sub.endpoint,
  p256dh: bufToB64url(sub.getKey('p256dh')),
  auth: bufToB64url(sub.getKey('auth')),
})

/** The subscription this browser already holds, if any. */
export async function getCurrentSubscription(): Promise<BrowserSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? toBrowserSubscription(sub) : null
}

/**
 * Ask permission (if needed) and subscribe THIS browser with the given VAPID
 * public key. Throws 'permission_denied' | 'unsupported'.
 */
export async function subscribeThisDevice(key: string): Promise<BrowserSubscription> {
  if (!pushSupported()) throw new Error('unsupported')

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('permission_denied')

  const reg = await navigator.serviceWorker.ready

  // Reuse the existing subscription when present; re-subscribing with a different
  // applicationServerKey throws, so drop the stale one first.
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    const sameKey = bufToB64url(existing.options.applicationServerKey ?? null) === key
    if (sameKey) return toBrowserSubscription(existing)
    await existing.unsubscribe()
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64urlToUint8(key),
  })
  return toBrowserSubscription(sub)
}

/** Unsubscribe this browser. Safe to call when not subscribed. */
export async function unsubscribeThisDevice(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
}
