// Pure functions — no React, no Supabase.

// ── Device identity (random token in a cookie) ────────────────────────────────
// The stable device identity is a random token minted once and stored in a cookie,
// NOT the specs fingerprint below. Two identical devices get different tokens (no
// false "shared" flag), and the token survives browser/OS updates (read, never
// recomputed). The legit cookie has a fixed obscure name so the app can find it;
// it is buried among decoy cookies with random names + UUID-shaped values so it
// cannot be picked out by casually inspecting cookies.
const DEVICE_COOKIE_NAME = 'x5ygdvrhe3rge_3dw'
const DECOY_COOKIE_COUNT = 19
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365 * 10 // ~10 years

function readCookie(name: string): string | null {
  const target = `${name}=`
  for (const part of document.cookie.split(';')) {
    const c = part.trim()
    if (c.startsWith(target)) return decodeURIComponent(c.slice(target.length))
  }
  return null
}

function writeCookie(name: string, value: string): void {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SEC}; Path=/; SameSite=Lax${secure}`
}

function randomCookieName(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'
  const len = 12 + Math.floor(Math.random() * 8)
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  let out = ''
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}

/**
 * Returns this device's stable identity token, minting + persisting it (with decoys)
 * on first call. Read from the cookie thereafter — unaffected by browser/OS updates.
 */
export function getDeviceToken(): string {
  const existing = readCookie(DEVICE_COOKIE_NAME)
  if (existing) return existing

  const token = crypto.randomUUID()
  writeCookie(DEVICE_COOKIE_NAME, token)
  for (let i = 0; i < DECOY_COOKIE_COUNT; i++) {
    const name = randomCookieName()
    if (name === DEVICE_COOKIE_NAME) continue // never shadow the legit cookie
    writeCookie(name, crypto.randomUUID())
  }
  return token
}

/**
 * Builds a specs-derived browser fingerprint (canvas + environment signals).
 * SOFT SIGNAL ONLY — it collides across identical devices and changes on updates,
 * so it is stored as a hint alongside the real identity ({@link getDeviceToken}).
 */
export async function getDeviceFingerprint(): Promise<string> {
  const signals: string[] = [
    navigator.userAgent,
    navigator.language,
    String(screen.width) + 'x' + String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency ?? ''),
    String((navigator as { deviceMemory?: number }).deviceMemory ?? ''),
  ]

  // Canvas fingerprint — renders text and shape; different GPU/driver/font combos produce different pixels
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = "14px 'Arial'"
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
      ctx.fillText('Linknbit🔐', 2, 15)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
      ctx.fillText('Linknbit🔐', 4, 17)
      signals.push(canvas.toDataURL())
    }
  } catch {
    // canvas blocked (e.g. privacy mode) — fingerprint is still valid without it
  }

  const raw = signals.join('|')
  const encoded = new TextEncoder().encode(raw)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Detects the browser family from a User-Agent string — NO version number, so the
 * label is stable across browser updates. Brave is indistinguishable from Chrome
 * by UA alone (it is resolved separately via navigator.brave where available).
 */
function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet'
  if (/Firefox\/|FxiOS/.test(ua)) return 'Firefox'
  if (/Chrome\/|CriOS/.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Browser'
}

/** Detects the OS / device label from a User-Agent string — no version numbers. */
function detectOs(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/iPod/.test(ua)) return 'iPod'

  const androidModel = ua.match(/Android [\d.]+.*?;\s*([^;)]+?)\s*(?:Build|\))/)
  if (androidModel) return androidModel[1].trim()
  if (/Android/.test(ua)) return 'Android'

  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows NT/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown device'
}

/**
 * Returns a human-readable device label — browser family + OS, with NO version
 * (e.g. "Chrome on Mac", "Safari on iPhone", "Chrome on SM-A515F"). Versions are
 * omitted on purpose: the identity is the cookie token, so the name is display-only
 * and must not churn when a browser/OS updates.
 */
export function getDeviceName(ua: string = navigator.userAgent): string {
  return `${detectBrowser(ua)} on ${detectOs(ua)}`
}
