import { useState, useRef, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'
import { NavChromeContext } from './MobileNavContext'
import { cn } from '../../lib/cn'
import { useAuthContext } from '../../context/AuthContext'
import { useResyncPushSubscription } from '../../hooks/useNotifications'
import { useRealtimeNotifications } from '../../hooks/realtime/useRealtimeNotifications'
import { useRealtimeChannelList } from '../../hooks/realtime/useRealtimeChannelList'
import { FileViewerProvider } from '../shared/FileViewer'
import { ImpersonationBanner } from './ImpersonationBanner'
import { ScopeProvider } from '../../context/ScopeContext'
import { CommandPaletteProvider } from '../../context/CommandPaletteContext'
import { CommandPalette } from './CommandPalette'
import { RunningTimerWidget } from '../shared/RunningTimerWidget'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { themeClass } from '../../constants/themes'

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [hasBack, setHasBack] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { profile } = useAuthContext()

  // When a push notification is clicked and this window is focused, the service
  // worker posts the destination path — navigate the SPA there.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMsg = (e: MessageEvent) => {
      const d = e.data
      if (d && d.type === 'NOTIFICATION_CLICK' && typeof d.href === 'string') navigate(d.href)
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [navigate])

  // Mounted here (not in Topbar) so the live channel survives every internal
  // route and both breakpoints — the toast should never depend on which page
  // or layout happens to be on screen.
  useRealtimeNotifications(profile?.id ?? '')
  // Push endpoints expire and get pruned server-side; nothing used to put them
  // back, so people quietly stopped being reachable. This repairs that on load.
  useResyncPushSubscription(profile?.id ?? '')

  // Same reasoning for chat: the conversation list and the sidebar unread badge
  // stay live regardless of which page is open.
  useRealtimeChannelList(!!profile?.id)

  // Theme goes on <html>, not on a wrapper div: body paints the area outside the
  // app (iOS overscroll), scrollbars are styled at the document level, and modals
  // portal out of this tree. A wrapper would leave all three on the default navy.
  useEffect(() => {
    const root = document.documentElement
    const theme = themeClass(profile?.theme)
    if (theme) root.classList.add(theme)
    return () => { if (theme) root.classList.remove(theme) }
  }, [profile?.theme])

  // Reset scroll to the top whenever the route changes, so a freshly opened
  // screen never starts mid-page (e.g. drilling into a section after scrolling
  // the hub). Targets the <main> scroll container and the window.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 })
    window.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  return (
    <NavChromeContext.Provider value={{ hasBack, setHasBack }}>
      <ScopeProvider>
      <CommandPaletteProvider>
      <FileViewerProvider>
        {/* Fixed viewport height, not min-height: `main` is the scroll container,
            so a page can hand its own scrolling to an inner element (the chat
            message list) instead of growing the document. min-h-0 on the row and
            main is what lets those children shrink below their content. */}
        <div className="flex h-dvh w-full flex-col overflow-hidden app-backdrop">
          <ImpersonationBanner />
          <div className="flex w-full min-h-0 flex-1">
            <Sidebar />
            {/* pb clears the mobile bottom tab bar (incl. the home-indicator safe
                area) — but only when that bar is actually showing. A stack screen
                hides it, and the padding would otherwise leave dead space under
                the content (most visible under the chat composer).

                No background of its own: the shell above paints `--app-backdrop`,
                and a fill here would cover it. The backdrop's own base colour is
                `bg-base`, so nothing changes for a flat theme — it is what lets a
                gradient theme reach the content area. */}
            <main
              ref={mainRef}
              className={cn(
                'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden lg:pb-0',
                !hasBack && 'pb-safe-nav',
              )}
            >
              {/* Scoped to the routed page, so a crash leaves the sidebar, tab
                  bar and topbar alive and the user can navigate out of it.
                  Keyed on the path: moving to another screen clears the error
                  rather than stranding them until they reload. */}
              <ErrorBoundary variant="page" resetKey={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </main>
            <BottomTabBar />
          </div>
          {/* Outside <main> so it stays put while the page scrolls. */}
          <RunningTimerWidget />
          {/* Mounted at the shell so ⌘K works on every internal screen. */}
          <CommandPalette />
        </div>
      </FileViewerProvider>
      </CommandPaletteProvider>
      </ScopeProvider>
    </NavChromeContext.Provider>
  )
}
