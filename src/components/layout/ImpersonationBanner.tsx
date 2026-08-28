import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, LogOut, Loader2 } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { useToast } from '../ui/toast-context'

/**
 * Persistent bar shown while an admin is impersonating a member. Exiting restores the
 * admin session (from the untouched HTTP-only cookie) and returns to My Day.
 * A page reload also safely reverts to the admin.
 */
export function ImpersonationBanner() {
  const { impersonating, stopImpersonating } = useAuthContext()
  const navigate = useNavigate()
  const toast = useToast()
  const [exiting, setExiting] = useState(false)

  if (!impersonating) return null

  const exit = async () => {
    setExiting(true)
    try {
      await stopImpersonating()
      navigate('/my-day')
    } catch {
      toast('Could not exit impersonation, reload the page to return to your account', 'error')
    } finally {
      setExiting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warning px-4 py-2 text-amber-950">
      <span className="flex items-center gap-1.5 font-ui text-[12.5px]">
        <Eye size={14} className="shrink-0" />
        Viewing the app as <strong className="font-semibold">{impersonating.targetName}</strong>, actions you take are performed as them.
      </span>
      <button
        onClick={exit}
        disabled={exiting}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-amber-950/15 px-2.5 py-1 font-ui text-[12px] font-semibold transition-colors hover:bg-amber-950/25 disabled:opacity-60"
      >
        {exiting ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
        Exit to {impersonating.adminName}
      </button>
    </div>
  )
}
