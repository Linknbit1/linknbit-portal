// Bumped for the WFH date-range release. Assets are served cache-first below and
// never revalidated, so a hashed bundle stays in the cache forever once it lands
// there. When a release renames a DB column, a client booting that stale bundle
// runs code against a shape that no longer exists — which is exactly how the WFH
// page white-screened on `r.date` being undefined. A new name drops the old
// cache on activate, so the offline fallback cannot resurrect the previous app.
const CACHE_NAME = 'linknbit-portal-v12'
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/brand/linknbit-icon.svg',
  '/brand/linknbit-icon-maskable.svg',
  '/brand/linknbit-mark-dark.svg',
  '/brand/linknbit-mark-light.svg',
  '/brand/linknbit-portal-banner-black.svg',
  '/brand/linknbit-portal-banner-white.svg',
  '/brand/linknbit-wordmark-dark.svg',
  '/brand/linknbit-wordmark-light.svg',
  '/install-banner.png',
  '/og-image.png',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-48x48.png',
  '/icons/apple-touch-icon.png',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png',
  '/icons/pwa-maskable-512x512.png',
  '/icons/pwa-maskable-1024x1024.png',
  '/splash/linknbit-splash.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      })
    }),
  )
})

// ── Web push ────────────────────────────────────────────────────────────────
// Every push shows a system notification, always — app open, app closed, even
// sitting on the very page the notification is about.
//
// This used to suppress the popup whenever a window here was focused, on the
// theory that the in-app toast covered it. In practice people missed things:
// a toast inside a tab you are not reading is not a notification. The suppressed
// case also forwarded the payload to the page, which nothing ever listened for,
// so a focused device showed nothing at all from push.
//
// The cost is that a focused device now shows both the system popup and the
// Realtime in-app toast. That is the intended trade: seeing it twice beats
// missing it.
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Linknbit Portal', body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Linknbit Portal', {
      body: payload.body || '',
      icon: '/icons/pwa-192x192.png',
      badge: '/icons/favicon-48x48.png',
      // A tag unique per notification. Sharing one (the old fallback to `type`)
      // let a second request of the same kind silently replace the first popup
      // instead of alerting again.
      tag: payload.id || 'linknbit-' + Date.now(),
      // Alert even when a tag does collide, rather than swapping in silence.
      renotify: true,
      data: {
        notificationId: payload.id,
        resourceType: payload.resource_type,
        resourceId: payload.resource_id,
      },
    }),
  )
})

// Map a notification's resource to an in-app path (mirrors notificationHref).
function pathForNotification(data) {
  const id = data.resourceId
  switch (data.resourceType) {
    case 'task': return id ? '/admin/tasks/' + id + '?openInProject=1' : '/inbox'
    case 'project': return id ? '/admin/projects/' + id : '/inbox'
    case 'leave_request':
    case 'wfh_request':
    case 'attendance_exception':
    case 'overtime_request':
    case 'holiday':
    case 'company_wfh_day':
    case 'working_saturday':
      return '/attendance'
    case 'quest_task':
    case 'shoutout':
    case 'badge':
    case 'redemption':
    case 'reward_pool':
    case 'employee_of_the_month':
      return '/gamification'
    case 'enrolled_device': return '/settings/devices'
    default: return '/inbox'
  }
}

// Focus an existing window (and navigate it) or open a new one at the resource.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const path = pathForNotification(data)

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const target = new URL(path, self.location.origin)
    if (data.notificationId) target.searchParams.set('n', data.notificationId)

    for (const client of clientList) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        client.postMessage({ type: 'NOTIFICATION_CLICK', data, href: path })
        return client.focus()
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target.href)
  })())
})

// Browsers can rotate a subscription without asking. Re-register so the device
// doesn't silently stop receiving push.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    clientList.forEach((c) => c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' }))
  })())
})
