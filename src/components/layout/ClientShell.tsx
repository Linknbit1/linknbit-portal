import { NavLink, Outlet } from 'react-router-dom'
import { Bell, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

const CLIENT_NAV = [
  { label: 'My Projects', to: '/client/projects' },
  { label: 'Approvals', to: '/client/approvals', badge: 2 },
  { label: 'Files & Deliverables', to: '/client/files' },
  { label: 'Reports', to: '/client/reports' },
]

export function ClientShell() {
  return (
    <div className="client-portal min-h-screen bg-client-bg font-ui" style={{ color: '#1A1612' }}>
      {/* Top navigation */}
      <header className="h-client-topbar bg-client-surface border-b border-client-border sticky top-0 z-30 flex items-center px-10 gap-9">
        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="w-8 h-8 rounded-md bg-client-accent flex items-center justify-center">
            <svg viewBox="0 0 41 45" width="18" height="18" fill="none">
              <rect x="0" y="3.5" width="10.5" height="10.5" rx="0.4" fill="white" />
              <rect x="0" y="18.7" width="10.5" height="26" rx="0.4" fill="white" />
              <rect x="15" y="3.5" width="10.5" height="25.9" rx="0.4" fill="white" />
              <rect x="15" y="33.9" width="10.5" height="10.5" rx="0.4" fill="white" />
              <rect x="30.4" y="3.5" width="10.5" height="10.5" rx="0.4" fill="white" opacity="0.7" />
              <rect x="30.4" y="18.7" width="10.5" height="26" rx="0.4" fill="white" />
            </svg>
          </span>
          <div>
            <p className="font-display font-bold text-[16px] text-client-ink-1 leading-tight tracking-tight">
              Linknbit
            </p>
            <p className="font-mono text-[9px] text-client-ink-3 uppercase tracking-widest mt-px">
              Powered by <span className="text-client-accent font-bold">Linknbit</span>
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 ml-4">
          {CLIENT_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative px-3.5 py-2.5 rounded-md font-medium text-[14px] transition-colors',
                  isActive
                    ? 'text-client-ink-1 font-semibold'
                    : 'text-client-ink-2 hover:bg-client-bg hover:text-client-ink-1',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {item.badge && (
                    <span className="ml-1.5 bg-client-accent text-white text-[10px] font-bold px-1.5 py-px rounded-full align-middle">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-3.5 right-3.5 h-0.5 bg-client-accent rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right */}
        <div className="ml-auto flex items-center gap-3.5">
          <button className="relative w-9.5 h-9.5 rounded-md text-client-ink-2 hover:bg-client-bg hover:text-client-ink-1 flex items-center justify-center transition-colors">
            <Bell size={17} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-client-accent border-2 border-client-surface" />
          </button>
          <button className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-client-bg border border-client-border hover:bg-client-bg-alt transition-colors">
            <span className="w-7.5 h-7.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-amber-900 font-bold text-[11.5px] flex items-center justify-center flex-shrink-0">
              IS
            </span>
            <div className="flex flex-col items-start leading-none">
              <span className="font-semibold text-[13.5px] text-client-ink-1">Imran Shah</span>
              <span className="font-mono text-[9.5px] text-client-warning uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-client-warning inline-block" />
                Client Owner
              </span>
            </div>
            <ChevronDown size={14} className="text-client-ink-3 ml-1" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-content-client mx-auto px-10">
        <Outlet />
      </main>
    </div>
  )
}
