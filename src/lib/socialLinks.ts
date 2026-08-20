/**
 * Which platform a social link points at, worked out from the URL.
 *
 * Derived on every render rather than stored beside the link: a platform guessed
 * once and saved is a guess that goes stale the moment somebody edits the URL,
 * and there is nothing to reconcile if it is never written down.
 *
 * Lucide ships no brand glyphs (v1 dropped them) and the project is Lucide-only,
 * so each platform carries its brand colour and a short monogram instead. An
 * unrecognised link falls back to a globe.
 */

export interface SocialPlatform {
  key: string
  /** Shown in the tooltip and read out to screen readers. */
  label: string
  /** Two characters at most — rendered as the badge glyph. */
  monogram: string
  /** Brand colour, used for the badge background. */
  color: string
}

const PLATFORMS: { test: RegExp; platform: SocialPlatform }[] = [
  { test: /linkedin\.com/i,                  platform: { key: 'linkedin',  label: 'LinkedIn',  monogram: 'in', color: '#0A66C2' } },
  { test: /instagram\.com/i,                 platform: { key: 'instagram', label: 'Instagram', monogram: 'ig', color: '#E4405F' } },
  { test: /facebook\.com|fb\.com|fb\.me/i,   platform: { key: 'facebook',  label: 'Facebook',  monogram: 'f',  color: '#1877F2' } },
  { test: /twitter\.com|(^|\/\/|\.)x\.com/i, platform: { key: 'x',         label: 'X',         monogram: 'X',  color: '#111827' } },
  { test: /youtube\.com|youtu\.be/i,         platform: { key: 'youtube',   label: 'YouTube',   monogram: 'yt', color: '#FF0000' } },
  { test: /tiktok\.com/i,                    platform: { key: 'tiktok',    label: 'TikTok',    monogram: 'tt', color: '#111827' } },
  { test: /wa\.me|whatsapp\.com/i,           platform: { key: 'whatsapp',  label: 'WhatsApp',  monogram: 'wa', color: '#25D366' } },
  { test: /t\.me|telegram\./i,               platform: { key: 'telegram',  label: 'Telegram',  monogram: 'tg', color: '#26A5E4' } },
  { test: /github\.com/i,                    platform: { key: 'github',    label: 'GitHub',    monogram: 'gh', color: '#24292F' } },
  { test: /dribbble\.com/i,                  platform: { key: 'dribbble',  label: 'Dribbble',  monogram: 'dr', color: '#EA4C89' } },
  { test: /behance\.net/i,                   platform: { key: 'behance',   label: 'Behance',   monogram: 'Bē', color: '#1769FF' } },
  { test: /pinterest\./i,                    platform: { key: 'pinterest', label: 'Pinterest', monogram: 'p',  color: '#BD081C' } },
  { test: /threads\.net/i,                   platform: { key: 'threads',   label: 'Threads',   monogram: '@',  color: '#111827' } },
  { test: /fiverr\.com/i,                    platform: { key: 'fiverr',    label: 'Fiverr',    monogram: 'fi', color: '#1DBF73' } },
  { test: /upwork\.com/i,                    platform: { key: 'upwork',    label: 'Upwork',    monogram: 'up', color: '#14A800' } },
]

/** Null when the link matches no known platform — the caller shows a globe. */
export function socialPlatform(url: string): SocialPlatform | null {
  return PLATFORMS.find((p) => p.test.test(url))?.platform ?? null
}

/**
 * A URL safe to put in href. Bare domains are the norm in a spreadsheet, so a
 * missing scheme is assumed to be https rather than treated as a relative path —
 * which is what "linknbit.com" in an href would otherwise mean.
 *
 * Returns null for anything that is not http(s), so a `javascript:` link pasted
 * into the form never becomes a clickable one.
 */
export function externalHref(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withScheme)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

/** "https://www.acme.com/about?x=1" → "acme.com/about" — a link you can read. */
export function prettyUrl(url: string): string {
  const href = externalHref(url)
  if (!href) return url
  try {
    const { hostname, pathname } = new URL(href)
    const host = hostname.replace(/^www\./, '')
    const path = pathname === '/' ? '' : pathname.replace(/\/$/, '')
    return `${host}${path}`
  } catch {
    return url
  }
}
