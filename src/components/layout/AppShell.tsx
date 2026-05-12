import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-screen w-full bg-bg-base">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col bg-bg-base overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
