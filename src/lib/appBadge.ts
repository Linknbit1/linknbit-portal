/**
 * The unread count shown on the app's own icon — the dock on macOS, the taskbar
 * on Windows, and the browser tab.
 *
 * Two mechanisms, because no single one covers both places:
 *
 * - The Badging API paints the installed app's icon. The OS draws it, so it is
 *   the real thing and it survives the window being closed.
 * - The tab has no such API, so the favicon is redrawn with the count on it.
 *
 * Both are best-effort. Safari has no Badging API and some browsers ignore a
 * swapped favicon; neither failure is worth telling anybody about, since the
 * count is already on screen in the sidebar and the bell.
 */

/** Past this the number stops being readable at 32px, and "lots" is the message. */
const MAX_SHOWN = 99

const badgeSupported = () =>
  typeof navigator !== 'undefined' && 'setAppBadge' in navigator

/** The dock / taskbar icon. Installed apps only; a browser tab ignores it. */
export function setDockBadge(count: number): void {
  if (!badgeSupported()) return
  // Promise-returning and it can reject (permission, unsupported surface).
  // A badge that could not be set is not an error anybody can act on.
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  const done = count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.()
  void done?.catch(() => {})
}

/**
 * The icon links the page shipped with, captured once so they can be put back
 * exactly rather than reconstructed from a guess.
 *
 * They are REMOVED while a badge is up, not disabled: `disabled` only means
 * anything on a stylesheet link, so disabling an icon link does nothing at all
 * — and since an SVG favicon outranks a PNG wherever it is supported, the
 * drawn one stayed invisible behind the one it was meant to replace.
 */
let declared: HTMLLinkElement[] | null = null

function captureDeclared(): HTMLLinkElement[] {
  declared ??= Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]:not([data-badge])'))
  return declared
}

function restoreDeclared(): void {
  document.querySelector('link[rel~="icon"][data-badge]')?.remove()
  for (const link of declared ?? []) {
    if (!link.isConnected) document.head.appendChild(link)
  }
}

/** A pill, with a plain rectangle where roundRect is not available. */
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, h / 2)
  else ctx.rect(x, y, w, h)
  ctx.fill()
}

function paint(ctx: CanvasRenderingContext2D, size: number, count: number): void {
  const label = count > MAX_SHOWN ? `${MAX_SHOWN}+` : String(count)
  // The pill grows with the number rather than the number shrinking to fit it.
  const w = label.length === 1 ? 30 : label.length === 2 ? 38 : 46
  const h = 30
  const x = size - w
  const y = size - h

  // A ring in the page background separates the pill from whatever the icon
  // puts behind it, at whatever scale the browser renders.
  ctx.fillStyle = '#0A0A0A'
  pill(ctx, x - 3, y - 3, w + 6, h + 6)

  ctx.fillStyle = '#E01414'
  pill(ctx, x, y, w, h)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + w / 2, y + h / 2 + 1)
}

/**
 * Redraws the tab icon with a count on it.
 *
 * Drawn over the 192px raster rather than the SVG favicon: an <img> pointed at
 * an SVG is the one source that can refuse to decode or taint the canvas, and
 * toDataURL on a tainted canvas throws — which would have been a badge that
 * silently never appeared.
 */
export function setTabBadge(count: number): void {
  if (count <= 0) {
    restoreDeclared()
    return
  }
  captureDeclared()

  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const commit = () => {
    paint(ctx, size, count)
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"][data-badge]')
      ?? document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.dataset.badge = 'true'
    link.href = canvas.toDataURL('image/png')
    if (!link.isConnected) document.head.appendChild(link)
    // Only once the replacement is in place, so the tab never flashes blank.
    for (const other of declared ?? []) other.remove()
  }

  const source = new Image()
  source.onload = () => { ctx.drawImage(source, 0, 0, size, size); commit() }
  // Without the mark the badge is still the useful half, so draw it regardless.
  source.onerror = () => { ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, size, size); commit() }
  source.src = '/icons/pwa-192x192.png'
}
