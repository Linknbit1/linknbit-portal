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
 * The original tab icon, captured before anything is drawn over it, so clearing
 * the badge puts back exactly what the page shipped with rather than a guess.
 */
let pristineHref: string | null = null

const iconLink = (): HTMLLinkElement | null => {
  // The PNG link is the one to drive: an SVG favicon wins where it is supported,
  // so it has to be removed for a canvas-drawn PNG to be seen at all.
  const existing = document.querySelector<HTMLLinkElement>('link[rel~="icon"][data-badge]')
  if (existing) return existing

  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.dataset.badge = 'true'
  document.head.appendChild(link)
  return link
}

/** Everything the page declared as an icon, other than the one drawn here. */
const declaredIcons = () =>
  Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]:not([data-badge])'))

/**
 * Redraws the tab icon with a count on it.
 *
 * Drawn from the icon the page already has rather than a second copy of the
 * mark, so a rebrand reaches the badge without anybody remembering to update it.
 */
export function setTabBadge(count: number): void {
  const declared = declaredIcons()
  if (pristineHref === null) {
    pristineHref = declared.find((l) => l.type === 'image/svg+xml')?.href
      ?? declared[0]?.href
      ?? '/favicon.svg'
  }

  if (count <= 0) {
    document.querySelector('link[rel~="icon"][data-badge]')?.remove()
    for (const link of declared) link.disabled = false
    return
  }

  const source = new Image()
  source.crossOrigin = 'anonymous'
  source.onload = () => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(source, 0, 0, size, size)

    const label = count > MAX_SHOWN ? `${MAX_SHOWN}+` : String(count)
    // Wider for two or three characters, so the pill grows with the number
    // rather than the number shrinking to fit a fixed circle.
    const width = label.length === 1 ? 30 : label.length === 2 ? 38 : 46
    const height = 30
    const x = size - width
    const y = size - height
    const r = height / 2

    // A ring in the page background separates the pill from whatever the icon
    // puts behind it, at any scale the browser picks.
    ctx.fillStyle = '#0A0A0A'
    ctx.beginPath()
    ctx.roundRect(x - 3, y - 3, width + 6, height + 6, r + 3)
    ctx.fill()

    ctx.fillStyle = '#E01414'
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, r)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + width / 2, y + height / 2 + 1)

    const link = iconLink()
    if (!link) return
    link.href = canvas.toDataURL('image/png')
    // An SVG favicon outranks a PNG wherever it is supported, so the declared
    // ones have to stand down for the drawn one to appear at all.
    for (const other of declaredIcons()) other.disabled = true
  }
  source.src = pristineHref
}
