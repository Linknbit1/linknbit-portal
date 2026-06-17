import { Navigate, useNavigate } from 'react-router-dom'
import { UserCircle, LogOut } from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { HubRow } from '../components/layout/MobileHub'
import { InstallAppButton } from '../components/pwa/InstallAppButton'
import { Avatar } from '../components/ui/Avatar'
import { RoleBadge } from '../components/shared/RoleBadge'
import { moreNavItems } from '../components/layout/navItems'
import { useAuthContext } from '../context/AuthContext'
import { useIsDesktop } from '../hooks/useMediaQuery'
import type { UserRole } from '../types'

// The mobile "More" tab: secondary destinations + profile + log out. Desktop has
// the sidebar for all of this, so it never renders here.
export default function MorePage() {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthContext()

  if (isDesktop) return <Navigate to="/dashboard" replace />

  const items = moreNavItems(profile?.role)

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Menu" />
      <div className="px-4 py-5 flex flex-col gap-5 w-full max-w-content mx-auto">
        {/* Profile summary → My Profile */}
        {profile && (
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 min-h-14 px-4 py-3 bg-surface-1 border border-border-default rounded-lg text-left transition-colors active:bg-surface-2"
          >
            <Avatar name={profile.name} src={profile.avatar_url ?? undefined} size="lg" />
            <span className="flex-1 min-w-0">
              <span className="block font-display font-bold text-[15px] text-text-1 truncate">{profile.name}</span>
              <span className="mt-0.5 block"><RoleBadge role={profile.role as UserRole} size="sm" /></span>
            </span>
            <UserCircle size={18} className="text-text-4 shrink-0" />
          </button>
        )}

        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <HubRow key={item.to} to={item.to} label={item.label} icon={item.icon} badge={item.badge} />
          ))}
        </div>

        {/* PWA install — self-gates to null when not installable / already installed. */}
        <InstallAppButton />

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 min-h-12 rounded-lg border border-error/30 bg-error/10 font-ui font-semibold text-[13px] text-error transition-colors active:bg-error/20"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  )
}
