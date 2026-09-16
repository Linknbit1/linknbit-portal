import { useEffect } from 'react'
import { useChatUnreadTotal } from './useChatUnreadCount'
import { setDockBadge, setTabTitle } from '../lib/appBadge'

/**
 * Puts the unread chat count where it can be seen without the portal in front of
 * you — the dock, the taskbar, and the tab's title.
 *
 * Chat only, deliberately. A dock badge is read as "somebody is waiting on a
 * reply", and folding in every notification the portal raises — a holiday
 * added, a badge earned — would make a number nobody trusts enough to act on.
 *
 * Mounted once in the app shell. Cleared on unmount so signing out does not
 * leave a count sitting on the dock for whoever opens the app next.
 */
export function useAppBadge(): void {
  const unread = useChatUnreadTotal()

  useEffect(() => {
    setDockBadge(unread)
    setTabTitle(unread)
  }, [unread])

  useEffect(() => () => {
    setDockBadge(0)
    setTabTitle(0)
  }, [])
}
