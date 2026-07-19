import { useState, useRef, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'
import { NavChromeContext } from './MobileNavContext'
import { useAuthContext } from '../../context/AuthContext'
import { useRealtimeNotifications } from '../../hooks/realtime/useRealtimeNotifications'

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

  // Reset scroll to the top whenever the route changes, so a freshly opened
  // screen never starts mid-page (e.g. drilling into a section after scrolling
  // the hub). Targets the <main> scroll container and the window.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 })
    window.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  return (
    <NavChromeContext.Provider value={{ hasBack, setHasBack }}>
      <div className="flex min-h-dvh w-full bg-bg-base">
        <Sidebar />
        {/* pb clears the mobile bottom tab bar (incl. the home-indicator safe area). */}
        <main ref={mainRef} className="flex-1 min-w-0 flex flex-col bg-bg-base overflow-x-hidden pb-safe-nav lg:pb-0">
          <Outlet />
        </main>
        <BottomTabBar />
      </div>
    </NavChromeContext.Provider>
  )
}
