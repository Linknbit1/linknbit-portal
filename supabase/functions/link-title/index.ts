// Resolve the human title behind a pasted link, so "Add document" can fill the
// title box in for you instead of making you retype what the file is called.
//
// This has to run server-side: the browser cannot read the <title> of
// docs.google.com, and Google serves no CORS headers that would let it.
//
// ── What it will and will not fetch ──────────────────────────────────────────
// The function makes an outbound request to a URL a user supplied, which is the
// definition of SSRF if left open. So: https/http only, public hostnames only
// (every private and loopback range is refused, including the cloud metadata
// address), no redirects followed to anywhere that fails the same test, a hard
// timeout, and only the first 64 KB read — a title lives in the first kilobyte
// and nothing here should stream a 2 GB file into memory.
//
// A caller must be signed in: this is an authenticated convenience, not an open
// URL-fetching proxy for the internet.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FETCH_TIMEOUT_MS = 6000
const MAX_BYTES = 64 * 1024
const MAX_REDIRECTS = 3

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

/** Reject anything that resolves to our own network rather than the internet. */
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return true
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!v4) return false
  const [a, b] = [Number(v4[1]), Number(v4[2])]
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||          // link-local, incl. 169.254.169.254 metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224                              // multicast and reserved
  )
}

function safeUrl(raw: string): URL | null {
  const trimmed = raw.trim()
  // A bare domain gets https:// — but only when there is no scheme at all.
  // Prefixing blindly turns "file:///etc/passwd" into a request for the host
  // "file", which is nonsense rather than a refusal.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) return null

  let parsed: URL
  try {
    parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  if (isBlockedHost(parsed.hostname)) return null
  return parsed
}

/**
 * Google appends its product name to every document title — "Q3 Proposal -
 * Google Docs". Nobody wants that in the box, so it comes off.
 */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[-–|]\s*Google\s+(Docs|Sheets|Slides|Drive|Forms)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Google's sign-in wall has a title too — it is just never the one we want. */
function isSignInWall(title: string): boolean {
  return /^(sign in|log in|login|meet - |google drive - (sign|access))/i.test(title) ||
    /google accounts$/i.test(title)
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

function extractTitle(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
  const tag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const raw = og?.[1] ?? tag?.[1]
  if (!raw) return null
  const title = cleanTitle(decodeEntities(raw))
  return title && !isSignInWall(title) ? title : null
}

/**
 * Follow redirects by hand rather than letting fetch do it, so every hop is
 * checked against the same host rules as the first — an open redirect on a
 * public site is otherwise a way straight back into the private network.
 */
async function fetchHtml(start: URL): Promise<string | null> {
  let url = start
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(url.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          // Google serves a bare shell to unknown agents; this gets the real title.
          'User-Agent': 'Mozilla/5.0 (compatible; LinknbitPortal/1.0; +link-title)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      })
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return null
      const next = safeUrl(new URL(location, url).toString())
      if (!next) return null
      url = next
      continue
    }
    if (!res.ok) return null

    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('html') && !type.includes('xml')) return null

    // Read at most MAX_BYTES, then stop — the title is in the head.
    const reader = res.body?.getReader()
    if (!reader) return null
    const chunks: Uint8Array[] = []
    let total = 0
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      total += value.length
    }
    await reader.cancel().catch(() => {})
    const buffer = new Uint8Array(total)
    let at = 0
    for (const c of chunks) { buffer.set(c.subarray(0, Math.min(c.length, total - at)), at); at += c.length }
    return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  }
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'Unauthorized' }, 401)

  let raw: string
  try {
    raw = String((await req.json()).url ?? '')
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const url = safeUrl(raw)
  // Not an error the UI should shout about: the user simply types the title.
  if (!url) return json({ title: null, reason: 'unsupported_url' }, 200)

  const html = await fetchHtml(url)
  if (!html) return json({ title: null, reason: 'unreachable' }, 200)

  const title = extractTitle(html)
  return json({ title, reason: title ? null : 'no_title' }, 200)
})
