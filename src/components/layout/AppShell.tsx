import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'

export function AppShell() {
  return (
    <div className="flex min-h-dvh w-full bg-bg-base">
      <Sidebar />
      {/* pb clears the mobile bottom tab bar (incl. the home-indicator safe area). */}
      <main className="flex-1 min-w-0 flex flex-col bg-bg-base overflow-x-hidden pb-safe-nav lg:pb-0">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}
