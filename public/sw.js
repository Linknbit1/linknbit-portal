// Bumped for the app-icon fix: the old cache holds the previous manifest, which
// pointed the icons at splash art. Without a new name, installed clients would
// keep serving the stale manifest and the banner icon with it.
const CACHE_NAME = 'linknbit-portal-v6'
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
// A push arrives on EVERY subscribed device. Each device decides for itself:
// if a window here is focused the user can already see the in-app toast (driven
// by Supabase Realtime), so we forward the payload and stay silent. If nothing
// here is focused — another device, another tab, or the app closed — we show a
// system notification. That's why looking at your laptop still lets your phone
// buzz: only the focused device suppresses.
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Linknbit Portal', body: event.data ? event.data.text() : '' }
  }

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const focused = clientList.find((c) => c.focused || c.visibilityState === 'visible')

    if (focused) {
      // Visible here — hand it to the page and don't stack a system popup on top.
      focused.postMessage({ type: 'PUSH_NOTIFICATION', payload })
      return
    }

    await self.registration.showNotification(payload.title || 'Linknbit Portal', {
      body: payload.body || '',
      icon: '/icons/pwa-192x192.png',
      badge: '/icons/favicon-48x48.png',
      // Collapse repeats of the same thing (e.g. re-sent) instead of stacking.
      tag: payload.id || payload.type || 'linknbit',
      renotify: false,
      data: {
        notificationId: payload.id,
        resourceType: payload.resource_type,
        resourceId: payload.resource_id,
      },
    })
  })())
})

// Map a notification's resource to an in-app path (mirrors notificationHref).
function pathForNotification(data) {
  const id = data.resourceId
  switch (data.resourceType) {
    case 'task': return id ? '/admin/tasks/' + id : '/inbox'
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
