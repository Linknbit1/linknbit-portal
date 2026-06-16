import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, ExternalLink, Link2, Unlink, Zap } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { useToast } from '../../components/ui/toast-context'
import { PROJECTS, TASKS } from '../../data/mock'
import { cn } from '../../lib/cn'

export default function ClickUpPage() {
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('2026-05-16 09:42')

  const handleSync = async () => {
    setSyncing(true)
    await new Promise((r) => setTimeout(r, 1800))
    setSyncing(false)
    setLastSync(new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
    toast('ClickUp sync completed — all projects updated', 'success')
  }

  const syncedProjects = PROJECTS.filter((p) => p.clickUpSync === 'synced')
  const pendingProjects = PROJECTS.filter((p) => p.clickUpSync === 'pending')
  const errorProjects = PROJECTS.filter((p) => p.clickUpSync === 'error')

  const syncedTasks = TASKS.filter((t) => t.clickUpSync === 'synced').length

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="ClickUp Integration" />

      <div className="p-6 flex flex-col gap-5 max-w-content mx-auto w-full">

        {/* Status Banner */}
        <div className={cn(
          'flex items-center gap-4 p-4 rounded-xl border',
          errorProjects.length > 0
            ? 'bg-error/6 border-error/25'
            : 'bg-success/6 border-success/25',
        )}>
          {errorProjects.length > 0
            ? <AlertTriangle size={20} className="text-error shrink-0" />
            : <CheckCircle2 size={20} className="text-success shrink-0" />
          }
          <div className="flex-1">
            <p className="font-display font-semibold text-[14px] text-text-1">
              {errorProjects.length > 0 ? `${errorProjects.length} project(s) have sync errors` : 'All projects synced'}
            </p>
            <p className="font-mono text-[11.5px] text-text-3 mt-0.5">Last sync: {lastSync}</p>
          </div>
          <Button onClick={handleSync} loading={syncing} variant="secondary">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Synced Projects', value: syncedProjects.length, color: 'text-success', icon: CheckCircle2 },
            { label: 'Pending Sync', value: pendingProjects.length, color: 'text-warning', icon: Clock },
            { label: 'Sync Errors', value: errorProjects.length, color: 'text-error', icon: AlertTriangle },
            { label: 'Tasks Synced', value: syncedTasks, color: 'text-service-dev', icon: Zap },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-3">
              <Icon size={18} className={color} />
              <div>
                <p className={cn('font-display font-bold text-[24px] leading-none', color)}>{value}</p>
                <p className="font-ui text-[11.5px] text-text-3 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Projects Sync Status */}
        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h3 className="font-display font-semibold text-[14px] text-text-1">Projects</h3>
            <span className="font-mono text-[11px] text-text-4">{PROJECTS.length} projects</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-2">
                {['Project', 'Service', 'ClickUp Folder', 'Status', 'Last Synced', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROJECTS.map((project) => (
                <tr key={project.id} className="border-b border-border-subtle last:border-0 hover:bg-white/[0.018] transition-colors">
                  <td className="pl-5 pr-4 py-3.5">
                    <p className="font-ui font-medium text-[13px] text-text-1">{project.name}</p>
                    <p className="font-mono text-[11px] text-text-4">{project.clientName}</p>
                  </td>
                  <td className="px-4 py-3.5"><ServiceChip service={project.serviceType} /></td>
                  <td className="px-4 py-3.5">
                    {project.clickUpFolder ? (
                      <div className="flex items-center gap-1.5">
                        <Link2 size={11} className="text-text-4" />
                        <span className="font-mono text-[12px] text-text-2">{project.clickUpFolder}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Unlink size={11} className="text-text-4" />
                        <span className="font-mono text-[12px] text-text-4">Not linked</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5"><ClickUpStatus status={project.clickUpSync} showRetry /></td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[11.5px] text-text-3">
                      {project.lastSynced ? new Date(project.lastSynced).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 justify-end">
                      {project.clickUpSync === 'error' && (
                        <button
                          onClick={() => toast(`Retrying sync for ${project.name}...`, 'info')}
                          className="text-[11.5px] font-ui font-semibold text-error hover:text-error/80 transition-colors"
                        >
                          Retry
                        </button>
                      )}
                      {project.clickUpFolder && (
                        <button
                          onClick={() => toast('Opening in ClickUp...', 'info')}
                          className="size-7 rounded-md bg-surface-2 border border-border-default text-text-3 hover:text-text-1 hover:bg-surface-3 flex items-center justify-center transition-colors"
                        >
                          <ExternalLink size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Error details */}
        {errorProjects.length > 0 && (
          <div className="bg-surface-1 border border-error/25 rounded-xl p-5">
            <h3 className="font-display font-semibold text-[14px] text-error mb-3 flex items-center gap-2">
              <AlertTriangle size={14} /> Sync Errors
            </h3>
            <div className="space-y-2.5">
              {errorProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-error/5 border border-error/20 rounded-lg">
                  <div>
                    <p className="font-ui font-medium text-[13px] text-text-1">{p.name}</p>
                    <p className="font-mono text-[11px] text-error mt-0.5">Authentication token expired — re-authorize in Settings</p>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => toast('Re-authorizing...', 'info')}>
                    Fix
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
