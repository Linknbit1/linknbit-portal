export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

  // A tab that was open before a deploy keeps running the bundle it booted with,
  // for as long as it stays open — and the installed PWA can stay open for days.
  // That is survivable for a cosmetic change and fatal for a schema one: the WFH
  // release renamed a column, and long-lived tabs carried on reading the old
  // field until the page threw. So when a new worker takes control, reload once
  // and pick up the matching bundle.
  //
  // Guarded on there already being a controller: `clients.claim()` in the worker
  // fires controllerchange on the FIRST install too, and reloading there would
  // bounce every first-time visitor. `reloading` guards against a second pass.
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error)
    })
  })
}
