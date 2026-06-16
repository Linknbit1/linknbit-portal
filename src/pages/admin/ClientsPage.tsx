import { useState } from 'react'
import { Search, Plus, ExternalLink, MoreHorizontal, Building2, FolderOpen, X, Check } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toast-context'
import { CLIENTS } from '../../data/mock'
import type { Client } from '../../types'
import { cn } from '../../lib/cn'

const STATUS_META = {
  active:   { label: 'Active',   cls: 'text-success bg-success/10 border-success/30' },
  inactive: { label: 'Inactive', cls: 'text-text-3 bg-surface-2 border-border-default' },
  on_hold:  { label: 'On Hold',  cls: 'text-warning bg-warning/10 border-warning/30' },
}

function AddClientModal({ open, onClose, onAdd }: {
  open: boolean
  onClose: () => void
  onAdd: (c: Partial<Client>) => void
}) {
  const [form, setForm] = useState({ name: '', email: '', company: '', industry: '' })
  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  if (!open) return null

  const handleSave = () => {
    if (!form.name || !form.company) return
    onAdd({ ...form, status: 'active', projectCount: 0, joinedAt: '2026-05-16', accountManagerId: 'u1', accountManagerName: 'Ghayas' })
    onClose()
    setForm({ name: '', email: '', company: '', industry: '' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Add Client</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          {[
            { key: 'name', label: 'Contact Name', placeholder: 'Ahmad Khan' },
            { key: 'company', label: 'Company', placeholder: 'Acme Corp' },
            { key: 'email', label: 'Email', placeholder: 'contact@company.com' },
            { key: 'industry', label: 'Industry', placeholder: 'Technology, Healthcare...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!form.name || !form.company} onClick={handleSave}>
            <Check size={14} /> Add Client
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const toast = useToast()
  const [clients, setClients] = useState<Client[]>(CLIENTS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Client['status']>('all')
  const [addOpen, setAddOpen] = useState(false)

  const filtered = clients.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.company.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAdd = (data: Partial<Client>) => {
    const id = 'c' + (clients.length + 1)
    setClients((prev) => [...prev, { id, ...data } as Client])
    toast(`Client "${data.company}" added`, 'success')
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Clients" />

      <div className="p-6 flex flex-col gap-5 max-w-content mx-auto w-full">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Clients', value: clients.length, color: 'text-text-1' },
            { label: 'Active', value: clients.filter((c) => c.status === 'active').length, color: 'text-success' },
            { label: 'Projects Running', value: clients.reduce((s, c) => s + c.projectCount, 0), color: 'text-service-dev' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-1 border border-border-default rounded-xl px-5 py-4">
              <p className={cn('font-display font-bold text-[28px] leading-none', color)}>{value}</p>
              <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="pl-7 pr-3 py-1.5 bg-surface-inset border border-border-default rounded-md text-[12.5px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus w-55"
              />
            </div>
            <Select
              size="sm"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active', dot: '#22C55E' },
                { value: 'inactive', label: 'Inactive', dot: '#5C6A7F' },
                { value: 'on_hold', label: 'On Hold', dot: '#F59E0B' },
              ]}
            />
            <span className="font-mono text-[11px] text-text-4 ml-auto">{filtered.length} clients</span>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={13} /> Add Client
            </Button>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-2">
                {['Client', 'Company', 'Industry', 'Status', 'Account Mgr', 'Projects', 'Joined', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const sm = STATUS_META[client.status]
                return (
                  <tr key={client.id} className="border-b border-border-subtle hover:bg-white/[0.018] transition-colors last:border-0">
                    <td className="pl-5 pr-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center shrink-0">
                          <span className="font-display font-bold text-[13px] text-text-2">
                            {client.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-ui font-semibold text-[13px] text-text-1">{client.name}</p>
                          <p className="font-mono text-[11px] text-text-4">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-text-4" />
                        <span className="font-ui text-[13px] text-text-1">{client.company}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-ui text-[12.5px] text-text-2">{client.industry ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('text-[11px] font-ui font-semibold px-2.5 py-1 rounded-full border', sm.cls)}>
                        {sm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={client.accountManagerName} size="xs" />
                        <span className="font-ui text-[12.5px] text-text-2">{client.accountManagerName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <FolderOpen size={12} className="text-text-4" />
                        <span className="font-mono text-[12.5px] text-text-1">{client.projectCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[12px] text-text-2">{client.joinedAt}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => toast(`Viewing ${client.company} details`, 'info')}
                          className="size-7 rounded-md bg-surface-2 border border-border-default text-text-3 hover:text-text-1 hover:bg-surface-3 flex items-center justify-center transition-colors"
                        >
                          <ExternalLink size={11} />
                        </button>
                        <button
                          onClick={() => toast(`${client.company} options`, 'info')}
                          className="size-7 rounded-md bg-surface-2 border border-border-default text-text-3 hover:text-text-1 hover:bg-surface-3 flex items-center justify-center transition-colors"
                        >
                          <MoreHorizontal size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  )
}
