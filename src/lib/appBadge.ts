/**
 * The unread count shown outside the page itself — the dock on macOS, the
 * taskbar on Windows, and the tab's title.
 *
 * Two mechanisms, because no single one covers both places:
 *
 * - The Badging API paints the installed app's icon. The OS draws it, so it is
 *   the real thing and it survives the window being closed.
 * - A tab has no such API, so the count goes in front of the title.
 *
 * The favicon was drawn on too for a while. It worked, but a count squeezed into
 * a 16px mark is a smudge — the tab's text says the same thing legibly, at any
 * tab width, and is the one part of a tab that survives being narrowed.
 *
 * Both are best-effort: Safari has no Badging API, and a badge that could not be
 * set is not something anybody can act on, since the same count is already in
 * the sidebar and the bell.
 */

/** Past this the number stops carrying information, and "lots" is the message. */
const MAX_SHOWN = 99

const shown = (count: number) => (count > MAX_SHOWN ? `${MAX_SHOWN}+` : String(count))

/** The dock / taskbar icon. Installed apps only; a plain browser tab ignores it. */
export function setDockBadge(count: number): void {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return

  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  // Promise-returning, and it can reject on a surface that will not show one.
  const done = count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.()
  void done?.catch(() => {})
}

/**
 * The count in the tab's text, as "(3) Linknbit Operations Portal".
 *
 * The page's own title is captured on first use and any count already on it is
 * stripped, so repeated calls cannot stack "(3) (2) …" — which is what happens
 * if the current title is ever mistaken for the original.
 */
let pageTitle: string | null = null

export function setTabTitle(count: number): void {
  pageTitle ??= document.title.replace(/^\(\d+\+?\)\s*/, '')
  document.title = count > 0 ? `(${shown(count)}) ${pageTitle}` : pageTitle
}
