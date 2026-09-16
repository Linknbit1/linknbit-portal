import { useEffect } from 'react'
import { useChatUnreadTotal } from './useChatUnreadCount'
import { setDockBadge, setTabBadge, setTabTitle } from '../lib/appBadge'

/**
 * Puts the unread chat count on the app's icon — the dock, the taskbar, and the
 * browser tab.
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
    setTabBadge(unread)
    setTabTitle(unread)
  }, [unread])

  useEffect(() => () => {
    setDockBadge(0)
    setTabBadge(0)
    setTabTitle(0)
  }, [])
}
