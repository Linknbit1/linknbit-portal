import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Fingerprint, Smartphone, Palmtree, ShieldAlert, ChevronRight, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Topbar } from '../../components/layout/Topbar'
import { StackScreen } from '../../components/layout/StackScreen'
import { HubRow } from '../../components/layout/MobileHub'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useMyPermissions } from '../../hooks/usePermissions'
import { ADMINISTRATOR } from '../../api/permissions'
import { BiometricTerminalsTab } from '../../components/shared/BiometricTerminalsTab'
import { EnrolledDevicesTab, HolidaysTab } from './AttendancePage'

type Section = 'terminals' | 'devices' | 'schedule'

interface SectionEntry {
  key: Section
  label: string
  icon: LucideIcon
  /** Capability that reveals it. */
  feature: string
  render: () => React.ReactNode
}

/**
 * Governance, behind one door.
 *
 * These pages were sidebar rows inside Attendance, which put an administration
 * console for one module in the same list as the screens people work in every
 * day. Nothing about provisioning a fingerprint terminal belongs beside "who is
 * in today" — so the machinery moved here and the module kept its views.
 *
 * Configuration is deliberately NOT here: rule-sets live in Settings. The test
 * is whether using it changes how the portal behaves for everyone (Settings) or
 * is a decision about one person or record (Admin).
 */
const SECTIONS: SectionEntry[] = [
  {
    key: 'terminals',
    label: 'Terminals',
    icon: Fingerprint,
    feature: 'can_manage_attendance',
    render: () => <BiometricTerminalsTab />,
  },
  {
    key: 'devices',
    label: 'Enrolled Devices',
    icon: Smartphone,
    feature: 'can_manage_attendance',
    render: () => <EnrolledDevicesTab />,
  },
  {
    key: 'schedule',
    label: 'Schedule & holidays',
    icon: Palmtree,
    feature: 'can_manage_attendance',
    render: () => <HolidaysTab />,
  },
]

/** Capability-filtered sections for the signed-in user. */
function useVisibleSections(): SectionEntry[] {
  const { data: permissions } = useMyPermissions()
  return useMemo(() => {
    if (!permissions) return []
    const can = (key: string) =>
      permissions.includes(ADMINISTRATOR) || permissions.includes(key)
    return SECTIONS.filter((s) => can(s.feature))
  }, [permissions])
}

/** Whether the Audit Log link should show — it stays its own page, see below. */
function useCanViewAudit(): boolean {
  const { data: permissions } = useMyPermissions()
  return (
    !!permissions &&
    (permissions.includes(ADMINISTRATOR) || permissions.includes('can_view_audit_log'))
  )
}

/**
 * The Audit Log keeps its own route rather than becoming a panel here: it is a
 * full-bleed tool whose toolbar sticks to the Topbar, and it would have to be
 * rebuilt to sit inside a console body. Linking out costs one click and no risk.
 */
function AuditLink() {
  return (
    <Link
      to="/admin/audit"
      className="flex items-center gap-2.5 px-4 py-3 font-ui text-[13px] font-medium text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors border-t border-border-subtle"
    >
      <ShieldAlert size={14} />
      Audit Log
      <ArrowUpRight size={12} className="ml-auto text-text-4" />
    </Link>
  )
}

export default function AdminConsolePage({ mobileSection }: { mobileSection?: string } = {}) {
  const isDesktop = useIsDesktop()
  const sections = useVisibleSections()
  const canViewAudit = useCanViewAudit()
  const [active, setActive] = useState<Section | null>(null)

  const activeKey = active ?? sections[0]?.key ?? null
  const activeEntry = sections.find((s) => s.key === activeKey) ?? null
  const showHub = !isDesktop && !mobileSection

  // Mobile drill-in: one section as a stack screen with its own back chrome.
  if (mobileSection) {
    const entry = sections.find((s) => s.key === mobileSection)
    if (!entry) return <Navigate to="/admin/console" replace />
    return <StackScreen title={entry.label}>{entry.render()}</StackScreen>
  }

  if (sections.length === 0 && !canViewAudit) {
    return <Navigate to="/my-day" replace />
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Admin" back="/more" />

      <div className="px-4 py-6 lg:px-8 lg:py-7 flex flex-col gap-5">
        <div>
          <h2 className="font-display text-[22px] font-bold text-text-1">Admin</h2>
          <p className="font-ui text-[13px] text-text-3">
            The machinery under the portal — devices, terminals, the working calendar, and the
            record of who changed what.
          </p>
        </div>

        {showHub ? (
          <div className="flex flex-col gap-2.5">
            {sections.map((s) => (
              <HubRow key={s.key} to={`/admin/console/${s.key}`} label={s.label} icon={s.icon} />
            ))}
            {canViewAudit && <HubRow to="/admin/audit" label="Audit Log" icon={ShieldAlert} />}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-48 shrink-0">
              <nav className="flex lg:flex-col bg-surface-1 border border-border-default rounded-xl overflow-x-auto">
                {sections.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActive(key)}
                    className={cn(
                      'shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-ui font-medium whitespace-nowrap transition-colors border-r lg:border-r-0 lg:border-b border-border-subtle last:border-0',
                      activeKey === key
                        ? 'bg-brand-red/10 text-brand-red'
                        : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
                    )}
                  >
                    <Icon size={14} />
                    {label}
                    {activeKey === key && (
                      <ChevronRight size={12} className="ml-auto hidden lg:block" />
                    )}
                  </button>
                ))}
                {canViewAudit && <AuditLink />}
              </nav>
            </div>

            <div className="flex-1 min-w-0">
              {activeEntry ? (
                <div className="bg-surface-1 border border-border-default rounded-xl p-6">
                  {activeEntry.render()}
                </div>
              ) : (
                <p className="font-ui text-[13px] text-text-4">
                  Nothing here for your role except the audit log.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Mobile-only /admin/console/:section stack screen; redirects on desktop. */
export function AdminConsoleSectionScreen() {
  const isDesktop = useIsDesktop()
  const { section } = useParams()
  const valid = SECTIONS.some((s) => s.key === section)
  if (isDesktop || !section || !valid) return <Navigate to="/admin/console" replace />
  return <AdminConsolePage mobileSection={section} />
}
