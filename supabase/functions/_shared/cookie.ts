export const REFRESH_COOKIE = 'sb-refresh-token'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function parseCookie(header: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = header.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// Browsers refuse to store a `Secure` cookie on a plain-HTTP origin (e.g. local
// dev or testing on a LAN IP / phone over http://), which silently breaks login
// persistence. Only mark the cookie Secure when the app origin is HTTPS; in
// production (https) it stays Secure, in http dev it persists without it.
export function isSecureRequest(req: Request): boolean {
  const origin = req.headers.get('origin') ?? ''
  if (origin.startsWith('http://')) return false
  if (origin.startsWith('https://')) return true
  // No Origin header (rare for fetch POST) — fall back to the forwarded proto,
  // defaulting to Secure so production is never weakened.
  return (req.headers.get('x-forwarded-proto') ?? 'https') !== 'http'
}

export function setCookie(name: string, value: string, maxAge: number, secure = true): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly${secure ? '; Secure' : ''}; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function clearCookie(name: string, secure = true): string {
  return `${name}=; HttpOnly${secure ? '; Secure' : ''}; SameSite=Lax; Path=/; Max-Age=0`
}
