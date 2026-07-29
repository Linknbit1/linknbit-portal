import { useState, useRef, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'
import { NavChromeContext } from './MobileNavContext'
import { useAuthContext } from '../../context/AuthContext'
import { useRealtimeNotifications } from '../../hooks/realtime/useRealtimeNotifications'
import { useRealtimeChannelList } from '../../hooks/realtime/useRealtimeChannelList'
import { FileViewerProvider } from '../shared/FileViewer'
import { ImpersonationBanner } from './ImpersonationBanner'

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

  // Same reasoning for chat: the conversation list and the sidebar unread badge
  // stay live regardless of which page is open.
  useRealtimeChannelList(!!profile?.id)

  // Theme goes on <html>, not on a wrapper div: body paints the area outside the
  // app (iOS overscroll), scrollbars are styled at the document level, and modals
  // portal out of this tree. A wrapper would leave all three on the default navy.
  useEffect(() => {
    const root = document.documentElement
    const theme = profile?.theme === 'jade' ? 'theme-jade' : null
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
      <FileViewerProvider>
        <div className="flex min-h-dvh w-full flex-col bg-bg-base">
          <ImpersonationBanner />
          <div className="flex w-full flex-1">
            <Sidebar />
            {/* pb clears the mobile bottom tab bar (incl. the home-indicator safe area). */}
            <main ref={mainRef} className="flex-1 min-w-0 flex flex-col bg-bg-base overflow-x-hidden pb-safe-nav lg:pb-0">
              <Outlet />
            </main>
            <BottomTabBar />
          </div>
        </div>
      </FileViewerProvider>
    </NavChromeContext.Provider>
  )
}
