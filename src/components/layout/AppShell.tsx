import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'
import { MobileNavDrawer } from './MobileNavDrawer'
import { MobileNavContext } from './MobileNavContext'

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <MobileNavContext.Provider value={{ openNav: () => setNavOpen(true) }}>
      <div className="flex min-h-screen w-full bg-bg-base">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col bg-bg-base overflow-x-hidden pb-16 lg:pb-0">
          <Outlet />
        </main>
        <BottomTabBar onOpenMenu={() => setNavOpen(true)} />
        <MobileNavDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      </div>
    </MobileNavContext.Provider>
  )
}
