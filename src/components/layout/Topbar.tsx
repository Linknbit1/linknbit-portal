import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, Check, CheckCheck, ChevronDown, ChevronRight, UserCircle, LogOut, ChevronLeft, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useCommandPalette } from '../../context/CommandPaletteContext'
import { PinPageButton } from './PinPageButton'
import { Avatar } from '../ui/Avatar'
import { useAuthContext } from '../../context/AuthContext'
import { useNavChrome } from './MobileNavContext'
import { useNotifications, useMarkGroupRead, useMarkAllRead } from '../../hooks/useNotifications'
import { useDesignationName } from '../../hooks/useDesignations'
import { notificationHref } from '../../constants/notifications'
import { groupNotifications, groupTitle } from '../../lib/notificationGroups'
import { formatRelativeTime } from '../../lib/utils'
import { isUserRole } from '../../lib/peopleAccess'
import { isInternalRole } from '../../lib/roles'

interface TopbarProps {
  title?: string
  breadcrumb?: string
  className?: string
  // Mobile stack screens pass this to show a ‹ back affordance. `true` = history
  // back; a string = navigate to that path. Ignored on desktop (sidebar nav).
  back?: boolean | string
  /** Screen-specific controls, placed just before the bell / avatar. */
  actions?: ReactNode
}

export function Topbar({ title, breadcrumb, className, back, actions }: TopbarProps) {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthContext()
  const { setOpen: setPaletteOpen } = useCommandPalette()
  const profileId = profile?.id ?? ''
  // What you do, not what you are allowed to do. Roles are the permissions
  // mechanism; the line under your own name should read as a job title, and
  // "Admin · Developer" reads as neither.
  const designation = useDesignationName(profile?.designation_id)

  // Report this screen's back affordance to the shell so the mobile bottom tab
  // bar can hide itself on pushed/drill-in screens. useLayoutEffect (pre-paint)
  // avoids a one-frame flash of the bar across back-screen → back-screen routes.
  const navChrome = useNavChrome()
  const setHasBack = navChrome?.setHasBack
  useLayoutEffect(() => {
    setHasBack?.(!!back)
    return () => setHasBack?.(false)
  }, [back, setHasBack])

  const { data: notifications = [] } = useNotifications(profileId)
  const notificationGroups = useMemo(() => groupNotifications(notifications), [notifications])
  const { mutate: markGroupRead } = useMarkGroupRead(profileId)
  const { mutate: markAllRead } = useMarkAllRead(profileId)

  const unreadCount = notifications.filter((n) => !n.read).length
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (bellOpen || menuOpen) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [bellOpen, menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className={cn(
        'topbar-glass border-b border-border-default sticky top-0 z-40 pt-safe',
        className,
      )}
    >
     <div className="h-topbar flex items-center px-4 lg:px-8 gap-3 lg:gap-6">
      {/* Mobile back button (stack screens only) */}
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className="lg:hidden size-9 -ml-1 rounded-sm flex items-center justify-center text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors shrink-0"
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Title */}
      <div className="flex items-baseline gap-2.5 min-w-0">
        {breadcrumb && (
          <span className="font-mono text-[11px] text-text-4 uppercase tracking-wider hidden sm:inline">{breadcrumb}</span>
        )}
        {title && (
          <h1 className="font-display font-bold text-[17px]/tight lg:text-[20px]/tight text-text-1 tracking-tight m-0 truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Opens the command palette rather than searching in place: one surface
          for the shortcut and the click, so they can never drift apart. */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="ml-8 hidden lg:flex flex-1 max-w-md bg-surface-1 border border-border-default rounded-sm h-9 items-center gap-2.5 px-3 text-left hover:border-border-strong transition-colors"
      >
        <Search size={14} className="text-text-3 shrink-0" />
        <span className="text-body font-ui text-text-3 flex-1 min-w-0 truncate font-medium">
          Search projects, tasks, people...
        </span>
        <kbd className="font-mono text-[10px] text-text-4 border border-border-default rounded-sm px-1.5 py-0.5 shrink-0">
          ⌘K
        </kbd>
      </button>

      {/* Screen-specific controls. ml-auto so they anchor right even when the
          bell is hidden (drill-in screens). */}
      {actions && <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>}

      {/* Me Mode + mobile bell. Me Mode sits outside the desktop-only block so it
          exists at every width — hidden below lg is exactly how it went missing. */}
      <div className={cn('flex shrink-0 items-center gap-2 lg:hidden', !actions && 'ml-auto')}>
        {!back && (
          <button
            onClick={() => navigate('/notifications')}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className="relative size-9 rounded-sm bg-surface-1 border border-border-default text-text-2 flex items-center justify-center shrink-0 transition-colors active:bg-surface-2"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 bg-brand-red text-white text-[9.5px] font-ui font-bold rounded-full flex items-center justify-center px-1 leading-none border-2 border-bg-base">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Actions — desktop only; mobile uses the bell above + bottom tabs */}
      <div className="ml-auto hidden lg:flex items-center gap-3.5">

        {/* Global on purpose, unlike a page's own filters: any screen can be
            pinned, so the control belongs in chrome that is always there. */}
        <PinPageButton title={title} />

        {/* Notification bell — live: reads the real notifications table. */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((o) => !o)}
            className="relative size-9 rounded-sm bg-surface-1 border border-border-default text-text-2 hover:bg-surface-2 hover:text-text-1 flex items-center justify-center transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 bg-brand-red text-white text-[9.5px] font-ui font-bold rounded-full flex items-center justify-center px-1 leading-none border-2 border-bg-base">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-surface-1 border border-border-default rounded-xl shadow-2xl overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <span className="font-display font-bold text-[14px] text-text-1">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="flex items-center gap-1 text-[11px] font-ui text-text-3 hover:text-text-1 transition-colors"
                  >
                    <CheckCheck size={12} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[12px] font-ui text-text-4">
                    No notifications yet
                  </div>
                ) : (
                  notificationGroups.map((group) => {
                    const notif = group.latest
                    const isUnread = group.unreadCount > 0
                    return (
                      <button
                        key={group.key}
                        onClick={() => {
                          if (isUnread) markGroupRead(group.ids)
                          // Take them to where the thing actually is, when we know.
                          const href = notificationHref(notif.resource_type, notif.resource_id, notif.type)
                          if (href) { setBellOpen(false); navigate(href) }
                        }}
                        className={cn(
                          'w-full text-left px-4 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-2/60 transition-colors flex gap-3 items-start',
                          isUnread && 'bg-brand-red/4',
                        )}
                      >
                        <div className={cn(
                          'size-1.5 rounded-full mt-1.5 shrink-0',
                          isUnread ? 'bg-brand-red' : 'bg-transparent',
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('font-ui text-[12.5px] leading-snug', isUnread ? 'text-text-1 font-semibold' : 'text-text-3')}>
                            {groupTitle(group)}
                          </p>
                          {notif.body && (
                            <p className="font-ui text-[11.5px] text-text-3 mt-0.5 leading-snug line-clamp-2">
                              {notif.body}
                            </p>
                          )}
                          <p className="font-mono text-[10px] text-text-4 mt-1">
                            {formatRelativeTime(notif.created_at)}
                          </p>
                        </div>
                        {group.count > 1
                          ? <span className="shrink-0 mt-0.5 rounded-sm bg-surface-3 px-1.5 font-mono text-[10px] text-text-3">{group.count}</span>
                          : !isUnread && <Check size={12} className="text-text-4 shrink-0 mt-1" />}
                      </button>
                    )
                  })
                )}
              </div>

              {/* The list above is capped at a short scroll; this is the way out
                  to the whole history. */}
              <div className="border-t border-border-subtle">
                <button
                  onClick={() => { setBellOpen(false); navigate('/notifications') }}
                  className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 font-ui text-[12px] font-semibold text-brand-red transition-colors hover:bg-surface-2/60"
                >
                  View all notifications <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        {profile && isUserRole(profile.role) && (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 p-1 sm:pr-2.5 rounded-sm bg-surface-1 border border-border-default hover:bg-surface-2 transition-colors"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar name={profile.name} src={profile.avatar_url ?? undefined} size="sm" />
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="font-ui font-semibold text-[12.5px] text-text-1 whitespace-nowrap">
                  {profile.name}
                </span>
                {/* The email identifies WHICH account is signed in, which is the
                    question this chip actually gets asked — roles are still in
                    the menu below, where there is room for the full set. */}
                <span className="font-ui text-[11px] text-text-3 whitespace-nowrap max-w-50 truncate">
                  {profile.email}
                </span>
              </div>
              <ChevronDown size={14} className="text-text-3 ml-0.5 hidden sm:block" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] w-52 bg-surface-1 border border-border-default rounded-xl shadow-2xl overflow-hidden z-50 py-1"
              >
                <div className="px-4 py-2.5 border-b border-border-subtle">
                  <p className="font-ui font-semibold text-[12.5px] text-text-1 truncate">{profile.name}</p>
                  <p className="font-mono text-[10.5px] text-text-4 truncate">{profile.email}</p>
                  {/* Nothing at all when no designation is set: falling back to
                      the role would put back exactly what this replaced. */}
                  {designation && (
                    <p className="mt-1.5 truncate font-ui text-[11.5px] text-text-3">{designation}</p>
                  )}
                </div>
                {/* Gated on the same key as the /members/:id route guard, so the
                    entry never appears to someone the guard would turn away. */}
                {isInternalRole(profile.role) && (
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); navigate(`/members/${profile.id}`) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-ui font-medium text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors"
                  >
                    <UserCircle size={15} className="text-text-3" /> My Profile
                  </button>
                )}
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); navigate('/profile') }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-ui font-medium text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors"
                >
                  <SettingsIcon size={15} className="text-text-3" /> Settings
                </button>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-ui font-medium text-error hover:bg-error/10 transition-colors"
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
     </div>
    </header>
  )
}
