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
 * The count in the tab's text, as "(3) Linknbit Operations Portal".
 *
 * The favicon is the nicer signal and the one people expect, but it is also the
 * one a browser is free to ignore — it caches them hard, and a swapped icon is
 * not guaranteed to be picked up. The title has no such discretion: it is the
 * document's own text, it is legible at any tab width, and it is the only part
 * of a tab that still reads when the tab is narrowed to just its icon.
 */
let pageTitle: string | null = null

export function setTabTitle(count: number): void {
  pageTitle ??= document.title.replace(/^\(\d+\+?\)\s*/, '')
  document.title = count > 0 ? `(${count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}) ${pageTitle}` : pageTitle
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

/** The app mark, loaded once and composited under every badge after that. */
let base: HTMLImageElement | null = null

/** A pill, with a plain rectangle where roundRect is not available. */
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, h / 2)
  else ctx.rect(x, y, w, h)
  ctx.fill()
}

/**
 * How much of the square the mark keeps.
 *
 * A favicon has no outside, so "outside the mark" is made by giving the mark
 * less of the canvas and putting the badge in the corner it vacates. The mark
 * shrinks a little; the count gets a lot more room, which is the half that has
 * to survive being drawn at 16px.
 */
const MARK_SCALE = 0.64
/** Half the square, so the count reads at tab size rather than as a smudge. */
const BADGE_HEIGHT = 0.5

function paint(ctx: CanvasRenderingContext2D, size: number, count: number): void {
  const label = count > MAX_SHOWN ? `${MAX_SHOWN}+` : String(count)
  const h = Math.round(size * BADGE_HEIGHT)
  // The pill grows with the number rather than the number shrinking to fit it.
  const w = Math.round(h * (label.length === 1 ? 1 : label.length === 2 ? 1.3 : 1.6))
  const x = size - w
  const y = size - h

  // A ring in the page background separates the pill from the mark's corner
  // wherever the two still meet, at whatever scale the browser renders.
  const ring = Math.max(2, Math.round(size * 0.05))
  ctx.fillStyle = '#0A0A0A'
  pill(ctx, x - ring, y - ring, w + ring * 2, h + ring * 2)

  ctx.fillStyle = '#E01414'
  pill(ctx, x, y, w, h)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${Math.round(h * 0.72)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + w / 2, y + h / 2 + 1)
}

/**
 * Redraws the tab icon with a count on it.
 *
 * Everything that changes the document happens synchronously, before the base
 * icon is even requested: the declared links come out, the badged one goes in,
 * and it already carries a drawn badge. Loading the mark then only upgrades an
 * icon that is on screen either way.
 *
 * Built that way because the previous version did all of it inside the image's
 * onload, which is a single point at which the whole feature silently does
 * nothing — and under StrictMode the mount/unmount/mount cycle can interleave
 * that callback with its own teardown.
 */
export function setTabBadge(count: number): void {
  if (count <= 0) {
    restoreDeclared()
    return
  }
  captureDeclared()

  // Drawn larger than any tab needs, then scaled down by the browser — the
  // badge text has to stay legible once the mark is only part of the square.
  const size = 96
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const render = (): string => {
    ctx.clearRect(0, 0, size, size)
    // Top-left, at a fraction of the square: the corner it leaves is where the
    // badge goes. Transparent behind it, so the badge reads as sitting beside
    // the mark rather than on a tile with it.
    const mark = Math.round(size * MARK_SCALE)
    if (base?.complete && base.naturalWidth > 0) ctx.drawImage(base, 0, 0, mark, mark)
    paint(ctx, size, count)
    return canvas.toDataURL('image/png')
  }

  // Out first, in second. An SVG favicon outranks a PNG wherever it is
  // supported, so the drawn one is invisible until the declared ones are gone.
  for (const link of declared ?? []) link.remove()

  const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"][data-badge]')
    ?? document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.dataset.badge = 'true'
  link.href = render()
  if (!link.isConnected) document.head.appendChild(link)

  // The mark, once. Kept across calls so a changing count does not refetch it,
  // and so a count arriving before it loads still gets it on the next change.
  if (!base) {
    base = new Image()
    base.onload = () => {
      const current = document.querySelector<HTMLLinkElement>('link[rel~="icon"][data-badge]')
      if (current) current.href = render()
    }
    base.src = '/icons/pwa-192x192.png'
  }
}
