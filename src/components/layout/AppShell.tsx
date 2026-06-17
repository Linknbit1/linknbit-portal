import { useState, useRef, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'
import { NavChromeContext } from './MobileNavContext'

export function AppShell() {
  const location = useLocation()
  const [hasBack, setHasBack] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

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
