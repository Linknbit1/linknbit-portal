// Web-push sender. Invoked by the trg_push_notification DB trigger (via pg_net)
// once per inserted notification row — never by the browser.
//
// GET  → { publicKey }  the VAPID public key, so the browser can subscribe
//                       without a build-time env var (rotating keys needs no
//                       frontend redeploy). Public by design.
// POST → { notification_id }  fan the notification out to every enabled push
//                             subscription the recipient has (one per device).
//
// Auth: the trigger sends `x-push-secret`; JWT verification is off because the
// caller is Postgres, not a signed-in user.
//
// NOTE: uses @negrel/webpush (Deno-native, Web Crypto). The npm `web-push`
// package cannot be used here — it depends on Node built-ins and fails to boot
// in the Supabase edge runtime.
import * as webpush from 'jsr:@negrel/webpush@0.3.0'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@linknbit.com'
const HOOK_SECRET   = Deno.env.get('PUSH_HOOK_SECRET') ?? ''
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })

const b64urlToBytes = (s: string): Uint8Array => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
const bytesToB64url = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/**
 * Convert a standard `web-push generate-vapid-keys` pair (base64url) into the
 * JWK form @negrel/webpush expects. Public = 65 bytes (0x04 ‖ X32 ‖ Y32),
 * private = the 32-byte scalar d.
 */
function vapidKeysToJwk(publicKey: string, privateKey: string) {
  const pub = b64urlToBytes(publicKey)
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error(
      `invalid VAPID public key: expected 65 bytes starting with 0x04 (87 base64url chars, starts with "B"), got ${pub.length} bytes`,
    )
  }
  const d = b64urlToBytes(privateKey)
  if (d.length !== 32) {
    throw new Error(`invalid VAPID private key: expected 32 bytes (43 base64url chars), got ${d.length} bytes`)
  }
  const x = bytesToB64url(pub.slice(1, 33))
  const y = bytesToB64url(pub.slice(33, 65))
  return {
    publicKey:  { kty: 'EC', crv: 'P-256', x, y, key_ops: ['verify'], ext: true },
    privateKey: { kty: 'EC', crv: 'P-256', x, y, d: bytesToB64url(d), key_ops: ['sign'], ext: true },
  }
}

let appServerPromise: Promise<webpush.ApplicationServer> | null = null
function getAppServer(): Promise<webpush.ApplicationServer> {
  if (!appServerPromise) {
    appServerPromise = (async () => {
      const jwk = vapidKeysToJwk(VAPID_PUBLIC, VAPID_PRIVATE)
      const vapidKeys = await webpush.importVapidKeys(jwk, { extractable: false })
      return webpush.ApplicationServer.new({ contactInformation: VAPID_SUBJECT, vapidKeys })
    })()
  }
  return appServerPromise
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-secret',
      },
    })
  }

  // The browser fetches the VAPID public key from here before subscribing.
  if (req.method === 'GET') {
    if (!VAPID_PUBLIC) return json({ error: 'push_not_configured' }, 503)
    return json({ publicKey: VAPID_PUBLIC })
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: 'push_not_configured' }, 503)
  if (HOOK_SECRET && req.headers.get('x-push-secret') !== HOOK_SECRET) {
    return json({ error: 'forbidden' }, 401)
  }

  let notificationId: string | undefined
  try {
    notificationId = (await req.json())?.notification_id
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!notificationId) return json({ error: 'missing notification_id' }, 400)

  let appServer: webpush.ApplicationServer
  try {
    appServer = await getAppServer()
  } catch (e) {
    // Bad/missing keys must not look like a transient failure — say so loudly.
    return json({ error: 'invalid_vapid_keys', detail: String(e) }, 503)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: notification, error: nErr } = await admin
    .from('notifications')
    .select('id, profile_id, type, title, body, resource_type, resource_id')
    .eq('id', notificationId)
    .single()
  if (nErr || !notification) return json({ error: 'notification_not_found' }, 404)

  // One row per device — a user with a laptop and two phones gets three sends.
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('profile_id', notification.profile_id)
    .eq('enabled', true)

  if (!subs?.length) return json({ sent: 0, reason: 'no_subscriptions' })

  const payload = JSON.stringify({
    id: notification.id,
    title: notification.title,
    body: notification.body ?? '',
    type: notification.type,
    resource_type: notification.resource_type,
    resource_id: notification.resource_id,
  })

  // Send to every device in parallel — one dead endpoint must not stall the rest.
  const results = await Promise.allSettled(
    subs.map((s) =>
      appServer
        .subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
        .pushTextMessage(payload, {}),
    ),
  )

  // 404/410 Gone = the browser dropped the subscription (uninstalled, permission
  // revoked, profile wiped). Prune it or the table grows dead endpoints forever.
  const dead: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const reason = r.reason
      const code = reason?.statusCode ?? reason?.response?.status
      if (code === 404 || code === 410 || reason instanceof webpush.PushMessageError && reason.isGone()) {
        dead.push(subs[i].id)
      }
    }
  })
  if (dead.length) {
    await admin.from('push_subscriptions').delete().in('id', dead)
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length
  return json({ sent, failed: results.length - sent, pruned: dead.length })
})
