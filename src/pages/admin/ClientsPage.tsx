import { useMemo, useState } from 'react'
import { Plus, Search, Building2, Pencil, Trash2, Mail, Phone } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { PersonLink } from '../../components/shared/PersonLink'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Skeleton } from '../../components/ui/Skeleton'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { useClients, useDeleteClient } from '../../hooks/useClients'
import { useToast } from '../../components/ui/toast-context'
import { ClientFormModal } from './ClientFormModal'
import type { ClientRow, ClientWithStats } from '../../api/clients'

const STATUS_BADGE: Record<ClientRow['status'], { label: string; variant: 'success' | 'ghost' | 'warning' }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'ghost' },
  on_hold: { label: 'On Hold', variant: 'warning' },
}

export default function ClientsPage() {
  const toast = useToast()
  const { data: clients = [], isLoading } = useClients()
  const deleteClient = useDeleteClient()

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ClientRow | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ClientWithStats | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q))
  }, [clients, search])

  const openEdit = (client: ClientRow) => { setEditing(client); setShowForm(true) }
  const openNew = () => { setEditing(null); setShowForm(true) }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Clients" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display font-bold text-[22px] text-text-1">Clients</h2>
            <p className="font-ui text-[13px] text-text-3">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              iconLeft={<Search size={14} />}
              className="w-56"
            />
            <Button size="sm" iconLeft={<Plus size={15} />} onClick={openNew}>New Client</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="size-12 rounded-full bg-surface-2 flex items-center justify-center text-text-3"><Building2 size={22} /></span>
            <p className="font-ui text-[14px] text-text-2">No clients yet</p>
            <Button size="sm" variant="secondary" iconLeft={<Plus size={15} />} onClick={openNew}>Add your first client</Button>
          </div>
        ) : (
          <ResponsiveTable
            desktop={
              <div className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-default text-[10.5px] font-mono uppercase tracking-wider text-text-4">
                      <th className="px-4 py-2.5 font-medium">Client</th>
                      <th className="px-4 py-2.5 font-medium">Contact</th>
                      <th className="px-4 py-2.5 font-medium">Account Manager</th>
                      <th className="px-4 py-2.5 font-medium">Projects</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50">
                        <td className="px-4 py-3">
                          <p className="font-ui font-semibold text-[13px] text-text-1">{c.name}</p>
                          {c.company && <p className="font-ui text-[11.5px] text-text-3">{c.company}</p>}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-text-3">
                          {c.email && <span className="flex items-center gap-1.5"><Mail size={11} />{c.email}</span>}
                          {c.phone && <span className="flex items-center gap-1.5 mt-0.5"><Phone size={11} />{c.phone}</span>}
                          {!c.email && !c.phone && '—'}
                        </td>
                        <td className="px-4 py-3">
                          {c.account_manager ? (
                            <span className="flex items-center gap-2">
                              <Avatar name={c.account_manager.name} src={c.account_manager.avatar_url ?? undefined} size="xs" personId={c.account_manager.id} />
                              <PersonLink personId={c.account_manager.id} className="text-[12px] text-text-2">{c.account_manager.name}</PersonLink>
                            </span>
                          ) : <span className="text-text-4 text-[12px]">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-text-2 font-mono">{c.project_count}</td>
                        <td className="px-4 py-3"><Badge variant={STATUS_BADGE[c.status].variant} size="sm">{STATUS_BADGE[c.status].label}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(c)} className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2" aria-label="Edit"><Pencil size={13} /></button>
                            <button onClick={() => setPendingDelete(c)} className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-error hover:bg-error/10" aria-label="Delete"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
            mobile={
              <div className="space-y-2">
                {filtered.map((c) => (
                  <div key={c.id} className="bg-surface-1 border border-border-default rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-ui font-semibold text-[14px] text-text-1 truncate">{c.name}</p>
                        {c.company && <p className="font-ui text-[12px] text-text-3">{c.company}</p>}
                      </div>
                      <Badge variant={STATUS_BADGE[c.status].variant} size="sm">{STATUS_BADGE[c.status].label}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[12px] text-text-3 font-mono">{c.project_count} project{c.project_count !== 1 ? 's' : ''}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="size-8 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 bg-surface-2" aria-label="Edit"><Pencil size={14} /></button>
                        <button onClick={() => setPendingDelete(c)} className="size-8 rounded-sm flex items-center justify-center text-text-3 hover:text-error bg-surface-2" aria-label="Delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          />
        )}
      </div>

      {showForm && <ClientFormModal client={editing ?? undefined} onClose={() => setShowForm(false)} />}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete client?"
        message={pendingDelete ? `"${pendingDelete.name}" will be removed. Projects keep their history but lose the client link.` : ''}
        confirmLabel="Delete"
        danger
        isPending={deleteClient.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          deleteClient.mutate(pendingDelete.id, {
            onSuccess: () => { toast('Client deleted', 'success'); setPendingDelete(null) },
            onError: (e) => toast(e instanceof Error ? e.message : 'Delete failed', 'error'),
          })
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
